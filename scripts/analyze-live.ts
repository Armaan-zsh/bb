import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import fetch from 'node-fetch';

async function test() {
    const url = 'https://www.jeffgeerling.com/blog/2026/ai-is-destroying-open-source';
    console.log(`Fetching ${url}...`);

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const html = await res.text();

        const dom = new JSDOM(html, { url });
        const doc = dom.window.document;

        console.log('--- SCANNING FOR MEDIA ---');
        const iframes = doc.querySelectorAll('iframe');
        console.log(`Found ${iframes.length} iframes`);
        iframes.forEach((f, i) => {
            console.log(`Iframe ${i} src:`, f.getAttribute('src'));
            console.log(`Iframe ${i} data-src:`, f.getAttribute('data-src'));
            console.log(`Iframe ${i} outerHTML:`, f.outerHTML.substring(0, 200));
        });

        const videos = doc.querySelectorAll('video');
        console.log(`Found ${videos.length} videos`);

        // Run the "Media Shield" logic
        const markers: string[] = [];
        doc.querySelectorAll('iframe, video').forEach((el, i) => {
            const placeholder = doc.createElement('div');
            placeholder.textContent = `[[MEDIA_SHIELD_${i}]]`;

            ['src', 'data-src', 'data-original-src', 'href'].forEach(attr => {
                const val = el.getAttribute(attr);
                if (val) {
                    try {
                        const absolute = new URL(val, url).toString();
                        el.setAttribute(attr, absolute);
                        if (attr !== 'src') el.setAttribute('src', absolute);
                    } catch { }
                }
            });

            markers[i] = el.outerHTML;
            el.parentNode?.replaceChild(placeholder, el);
        });

        const reader = new Readability(doc);
        const article = reader.parse();

        let finalContent = article?.content || '';
        markers.forEach((mHtml, i) => {
            const marker = `[[MEDIA_SHIELD_${i}]]`;
            const found = finalContent.includes(marker);
            console.log(`Marker ${i} found in parsed content? ${found}`);
            finalContent = finalContent.replace(marker, mHtml);
        });

        console.log('--- FINAL CONTENT PREVIEW (300 chars) ---');
        console.log(finalContent.substring(0, 300));

        const hasIframe = finalContent.includes('<iframe');
        console.log('Final content has iframe?', hasIframe);
        if (hasIframe) {
            const start = finalContent.indexOf('<iframe');
            console.log('Iframe snippet:', finalContent.substring(start, start + 300));
        }

    } catch (err) {
        console.error(err);
    }
}

test();
