import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const html = `
<html>
<body>
  <h1>Test Article</h1>
  <p>Relative Video:</p>
  <iframe src="/media/video.mp4" width="560" height="315"></iframe>
  <p>End of article.</p>
</body>
</html>
`;

const baseUrl = 'https://blog.example.com/post';
const dom = new JSDOM(html, { url: baseUrl });
const doc = dom.window.document;

// PRESERVE
const markers: string[] = [];
doc.querySelectorAll('iframe, video').forEach((el, i) => {
    const placeholder = doc.createElement('div');
    placeholder.className = 'readability-media-placeholder';
    placeholder.textContent = `[[MEDIA_${i}]]`;

    // Resolve URL
    const src = el.getAttribute('src');
    if (src && !src.startsWith('http')) {
        try {
            el.setAttribute('src', new URL(src, baseUrl).toString());
        } catch { }
    }

    markers[i] = el.outerHTML;
    el.parentNode?.replaceChild(placeholder, el);
});

const reader = new Readability(doc);
const article = reader.parse();

// RESTORE
let finalContent = article?.content || '';
markers.forEach((html, i) => {
    finalContent = finalContent.replace(`[[MEDIA_${i}]]`, html);
});

console.log('--- FINAL CONTENT ---');
console.log(finalContent);
console.log('--- END ---');
