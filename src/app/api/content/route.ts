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
        const doc = dom.window.document;

        // 🛡️ MEDIA SHIELD PRE-PROCESSING
        const markers: string[] = [];
        const mediaSelectors = 'iframe, video, audio, embed, object';

        doc.querySelectorAll(mediaSelectors).forEach((el, i) => {
            const placeholder = doc.createElement('div');
            placeholder.className = 'readability-media-placeholder';
            placeholder.textContent = `[[MEDIA_SHIELD_${i}]]`;

            // Resolve URLs & Resolve Lazy Loading
            ['src', 'data-src', 'data-original-src', 'href'].forEach(attr => {
                const val = el.getAttribute(attr);
                if (val) {
                    try {
                        const absolute = new URL(val, url).toString();
                        el.setAttribute(attr, absolute);
                        // Force src if it's a lazy attribute
                        if (attr !== 'src' && attr !== 'href') {
                            el.setAttribute('src', absolute);
                        }
                    } catch { }
                }
            });

            // Ensure iframes have basic styling/loading
            if (el.tagName === 'IFRAME') {
                el.setAttribute('loading', 'eager');
            }

            markers[i] = el.outerHTML;
            el.parentNode?.replaceChild(placeholder, el);
        });

        // Also fix regular images for relative URLs and lazy loading
        doc.querySelectorAll('img').forEach(img => {
            ['src', 'data-src', 'data-original'].forEach(attr => {
                const val = img.getAttribute(attr);
                if (val) {
                    try {
                        const absolute = new URL(val, url).toString();
                        img.setAttribute(attr, absolute);
                        if (attr !== 'src') img.setAttribute('src', absolute);
                    } catch { }
                }
            });
        });

        const reader = new Readability(doc, { keepClasses: true });
        const article = reader.parse();

        if (!article) {
            throw new Error('Could not parse article content');
        }

        // 🛡️ MEDIA SHIELD RESTORATION
        let finalContent = article.content || '';
        markers.forEach((mediaHtml, i) => {
            finalContent = finalContent.replace(`[[MEDIA_SHIELD_${i}]]`, mediaHtml);
        });

        return NextResponse.json({
            title: article.title,
            content: finalContent,
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
