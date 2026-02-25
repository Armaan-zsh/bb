import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');
    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; TheFeed/1.0)',
                'Accept': 'text/html,application/xhtml+xml,*/*',
            },
        });
        clearTimeout(timer);

        if (!res.ok) {
            return NextResponse.json({ error: `HTTP ${res.status}` }, { status: 502 });
        }

        const html = await res.text();
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (!article || !article.content) {
            return NextResponse.json({ error: 'Could not extract article' }, { status: 422 });
        }

        return NextResponse.json({
            title: article.title,
            content: article.content,
            excerpt: article.excerpt,
            siteName: article.siteName,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Fetch failed' }, { status: 500 });
    }
}
