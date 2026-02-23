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

        // 🛡️ MEDIA SHIELD 2.0: EXTRACTION & PLACEHOLDER
        const mediaMetadata: { type: string, src: string, label: string }[] = [];
        const mediaSelectors = 'iframe, video, audio, embed, object';

        doc.querySelectorAll(mediaSelectors).forEach((el, i) => {
            // 1. Determine Type & Label
            let type = el.tagName.toLowerCase();
            let label = 'Media Content';

            // Try to find a better label (e.g. YouTube)
            const src = el.getAttribute('src') || el.getAttribute('data-src') || '';
            if (src.includes('youtube.com') || src.includes('youtu.be')) {
                type = 'youtube';
                label = 'YouTube Video';
            } else if (src.includes('vimeo.com')) {
                type = 'vimeo';
                label = 'Vimeo Video';
            }

            // 2. Resolve URL
            let resolvedSrc = src;
            if (src && !src.startsWith('http')) {
                try {
                    resolvedSrc = new URL(src, url).toString();
                } catch { }
            }

            if (resolvedSrc) {
                mediaMetadata[i] = { type, src: resolvedSrc, label };
                const placeholder = doc.createElement('div');
                placeholder.className = 'readability-media-placeholder';
                placeholder.textContent = `[[MEDIA_SHIELD_2_0_${i}]]`;
                el.parentNode?.replaceChild(placeholder, el);
            }
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

        // 🛡️ MEDIA SHIELD 2.0: RECONSTRUCTION
        let finalContent = article.content || '';
        mediaMetadata.forEach((meta, i) => {
            const marker = `[[MEDIA_SHIELD_2_0_${i}]]`;

            // Reconstruct a Gold Standard Iframe
            let reconstructedHtml = '';
            if (meta.type === 'youtube' || meta.type === 'vimeo' || meta.type === 'iframe') {
                reconstructedHtml = `
                    <div class="media-container">
                        <iframe 
                            src="${meta.src}" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen
                        ></iframe>
                        <div class="media-fallback">
                            <a href="${meta.src}" target="_blank" rel="noopener noreferrer">
                                📺 View Original ${meta.label} →
                            </a>
                        </div>
                    </div>
                `;
            } else {
                // Fallback for direct video/audio
                reconstructedHtml = `
                    <div class="media-container">
                        <a href="${meta.src}" target="_blank" rel="noopener noreferrer" class="media-link-card">
                            🎵 ${meta.label} detected: Open in new tab
                        </a>
                    </div>
                `;
            }

            finalContent = finalContent.replace(marker, reconstructedHtml);
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
