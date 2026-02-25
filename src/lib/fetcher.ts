import Parser from 'rss-parser';
import { htmlToText } from 'html-to-text';
import { YoutubeTranscript } from 'youtube-transcript';
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

function extractYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    return match ? match[1] : null;
}

async function fetchYouTubeTranscript(videoId: string): Promise<string | null> {
    try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        let formattedText = '';
        let lastOffsetBlock = -1;

        for (const item of transcript) {
            const currentBlock = Math.floor(item.offset / 60000); // 60 seconds (in ms)
            if (currentBlock > lastOffsetBlock && formattedText.length > 0) {
                formattedText += '\n\n'; // inject markdown line break for paragraphing
                lastOffsetBlock = currentBlock;
            } else if (formattedText.length > 0) {
                formattedText += ' ';
            }
            formattedText += item.text;
        }
        return formattedText;
    } catch (e) {
        console.warn(`\n   [X] Transcript failed for ${videoId}:`, e);
        return null; // Fallback to standard flow if transcript is disabled/unavailable
    }
}

function ensureSource(name: string, url: string, category: string, tier: number): number {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM sources WHERE url = ?').get(url) as { id: number } | undefined;
    if (existing) return existing.id;

    const result = db.prepare(
        'INSERT INTO sources (name, url, category, tier) VALUES (?, ?, ?, ?)'
    ).run(name, url, category, tier);
    return result.lastInsertRowid as number;
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

async function fetchFeed(source: Source): Promise<number> {
    const db = getDb();
    const sourceId = ensureSource(source.name, source.url, source.category, source.tier);

    let xml: string;
    try {
        xml = await fetchFeedXml(source.url);
    } catch (err: any) {
        console.error(`\n   [X] Fetch failed: ${source.name} (${source.url}) - ${err.message}`);
        return 0;
    }

    let feed;
    try {
        // Sanitize common XML errors (like unescaped ampersands from DeepWiki/Apple)
        // We only replace & that are NOT already part of an entity (like &amp; or &#123;)
        const sanitizedXml = xml.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#[xX][0-9a-fA-F]+;)/g, '&amp;');
        feed = await parser.parseString(sanitizedXml);
    } catch (err: any) {
        console.error(`\n   [X] Parse failed: ${source.name} (${source.url}) - ${err.message}`);
        return 0;
    }

    const insertPost = db.prepare(`
    INSERT OR IGNORE INTO posts (source_id, title, url, excerpt, content, published_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

    // SORT BY DATE (descending) and LIMIT to 15
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const items = (feed.items ?? [])
        .filter(item => {
            if (!item.title || !item.link) return false;
            const pubDate = item.isoDate || item.pubDate;
            if (pubDate) {
                const d = new Date(pubDate);
                if (d < sixMonthsAgo) return false; // Too old
            }
            return true;
        })
        .sort((a, b) => {
            const dateA = new Date(a.isoDate || a.pubDate || 0).getTime();
            const dateB = new Date(b.isoDate || b.pubDate || 0).getTime();
            return dateB - dateA;
        })
        .slice(0, 15);

    let inserted = 0;
    for (const item of items) {
        const rawItem = item as any;
        const link = item.link!.trim();
        const youtubeId = extractYouTubeId(link);

        let rawContent = rawItem.contentEncoded || rawItem.content || rawItem.description || rawItem.summary || '';

        // --- GHOST VIDEO EXTRACTOR (REMOVED) ---
        // YouTube actively blocks data-center IPs during batch scraping (RequestBlocked 429).
        // Transcripts are now fetched entirely client-side on-demand via /api/transcript 
        // when the user actually opens a YouTube video in the Reader Mode.

        const excerpt = cleanExcerpt(rawContent);
        const pubDate = item.isoDate || item.pubDate || null;

        const result = insertPost.run(
            sourceId,
            item.title!.trim(),
            link,
            excerpt || null,
            rawContent || null, // Pass full content to FTS5 schema
            pubDate
        );
        if (result.changes > 0) inserted++;
    }

    if (inserted > 0) {
        db.prepare('UPDATE sources SET last_fetched = datetime("now"), post_count = post_count + ? WHERE id = ?')
            .run(inserted, sourceId);
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

    if (purge) {
        const { purgePosts } = require('./db');
        const purged = purgePosts(30);
        if (purged > 0) console.log(`\n🧹 Auto-purged ${purged} stale posts (>30 days).`);
    }

    const sources = tierLimit
        ? SOURCES.filter(s => s.tier <= tierLimit)
        : SOURCES;

    // Remove duplicates by URL
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
        const results = await Promise.allSettled(batch.map(s => fetchFeed(s)));

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
