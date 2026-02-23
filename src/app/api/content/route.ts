import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
            }
        });

        clearTimeout(timeout);

        if (!res.ok) {
            throw new Error(`Failed to fetch: ${res.status}`);
        }

        const html = await res.text();
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (!article) {
            throw new Error('Could not parse article content');
        }

        return NextResponse.json({
            title: article.title,
            content: article.content,
            textContent: article.textContent,
            length: article.length,
            excerpt: article.excerpt,
            byline: article.byline,
            siteName: article.siteName,
        });

    } catch (err: any) {
        console.error('[API/CONTENT] Error:', err.message);
        return NextResponse.json({ error: err.message || 'Failed to extract content' }, { status: 500 });
    }
}
