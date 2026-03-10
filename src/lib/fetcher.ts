import Parser from 'rss-parser';
import { htmlToText } from 'html-to-text';
import { getDb } from './db';
import { SOURCES, Source } from './sources';

const parser = new Parser({
    customFields: {
        item: [['content:encoded', 'contentEncoded'], ['description', 'description']],
    },
});

function cleanExcerpt(raw: string | undefined): string {
    if (!raw) return '';
    const text = htmlToText(raw, {
        wordwrap: false,
        selectors: [
            { selector: 'a', options: { ignoreHref: true } },
            { selector: 'img', format: 'skip' },
            { selector: 'figure', format: 'skip' },
        ],
    });
    const trimmed = text.replace(/\s+/g, ' ').trim();
    if (trimmed.length <= 280) return trimmed;
    const cut = trimmed.substring(0, 280);
    return cut.substring(0, cut.lastIndexOf(' ')) + '…';
}

async function ensureSource(db: any, name: string, url: string, category: string, tier: number): Promise<number> {
    const existing = await db.prepare('SELECT id FROM sources WHERE url = ?').bind(url).first<{ id: number }>();
    if (existing) return existing.id;

    const result = await db.prepare(
        'INSERT INTO sources (name, url, category, tier) VALUES (?, ?, ?, ?)'
    ).bind(name, url, category, tier).run();
    return result.meta?.last_row_id ?? 0;
}

async function fetchFeedXml(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; TheFeed/1.0)',
                'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
    } finally {
        clearTimeout(timer);
    }
}

async function fetchFeed(db: any, source: Source): Promise<number> {
    const sourceId = await ensureSource(db, source.name, source.url, source.category, source.tier);

    let xml: string;
    try {
        xml = await fetchFeedXml(source.url);
    } catch (err: any) {
        console.error(`\n   [X] Fetch failed: ${source.name} (${source.url}) - ${err.message}`);
        return 0;
    }

    let feed;
    try {
        const sanitizedXml = xml.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#[xX][0-9a-fA-F]+;)/g, '&amp;');
        feed = await parser.parseString(sanitizedXml);
    } catch (err: any) {
        console.error(`\n   [X] Parse failed: ${source.name} (${source.url}) - ${err.message}`);
        return 0;
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const items = (feed.items ?? [])
        .filter((item: any) => {
            if (!item.title || !item.link) return false;
            const pubDate = item.isoDate || item.pubDate;
            if (pubDate) {
                const d = new Date(pubDate);
                if (d < sixMonthsAgo) return false;
            }
            return true;
        })
        .sort((a: any, b: any) => {
            const dateA = new Date(a.isoDate || a.pubDate || 0).getTime();
            const dateB = new Date(b.isoDate || b.pubDate || 0).getTime();
            return dateB - dateA;
        })
        .slice(0, 15);

    let inserted = 0;
    for (const item of items) {
        const rawItem = item as any;
        const link = item.link!.trim();
        let rawContent = rawItem.contentEncoded || rawItem.content || rawItem.description || rawItem.summary || '';
        const excerpt = cleanExcerpt(rawContent);
        const pubDate = item.isoDate || item.pubDate || null;

        try {
            const result = await db.prepare(
                'INSERT OR IGNORE INTO posts (source_id, title, url, excerpt, content, published_at) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(sourceId, item.title!.trim(), link, excerpt || null, rawContent || null, pubDate).run();
            if (result.meta?.changes > 0) inserted++;
        } catch {
            // Duplicate URL, skip
        }
    }

    if (inserted > 0) {
        await db.prepare('UPDATE sources SET last_fetched = datetime("now"), post_count = post_count + ? WHERE id = ?')
            .bind(inserted, sourceId).run();
    }

    return inserted;
}

export async function fetchAllFeeds(options: {
    concurrency?: number;
    onProgress?: (done: number, total: number, name: string) => void;
    tierLimit?: number;
    purge?: boolean;
} = {}): Promise<{ total: number; errors: number }> {
    const { concurrency = 10, onProgress, tierLimit, purge = true } = options;
    const db = await getDb();

    if (purge) {
        const { purgePosts } = await import('./db');
        const purged = await purgePosts(30);
        if (purged > 0) console.log(`\n🧹 Auto-purged ${purged} stale posts (>30 days).`);
    }

    const sources = tierLimit
        ? SOURCES.filter(s => s.tier <= tierLimit)
        : SOURCES;

    const seen = new Set<string>();
    const unique = sources.filter(s => {
        if (seen.has(s.url)) return false;
        seen.add(s.url);
        return true;
    });

    let done = 0;
    let totalInserted = 0;
    let errors = 0;

    for (let i = 0; i < unique.length; i += concurrency) {
        const batch = unique.slice(i, i + concurrency);
        const results = await Promise.allSettled(batch.map(s => fetchFeed(db, s)));

        for (let j = 0; j < results.length; j++) {
            done++;
            const r = results[j];
            if (r.status === 'fulfilled') {
                totalInserted += r.value;
            } else {
                errors++;
            }
            onProgress?.(done, unique.length, batch[j].name);
        }
    }

    return { total: totalInserted, errors };
}

export async function fetchIncrementalFeeds(options: {
    concurrency?: number;
    tierLimit?: number;
} = {}): Promise<{ total: number; errors: number }> {
    return fetchAllFeeds(options);
}
