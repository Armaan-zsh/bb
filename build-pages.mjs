import fs from 'node:fs';
import path from 'node:path';

const distDir = '.open-next/dist';
const assetsDir = '.open-next/assets';
const workerFile = '.open-next/worker.js';

console.log('Packaging OpenNext output for Cloudflare Pages Advanced Mode...');

try {
    // Create the final dist directory
    fs.mkdirSync(distDir, { recursive: true });

    // Copy all static assets into dist
    if (fs.existsSync(assetsDir)) {
        fs.cpSync(assetsDir, distDir, { recursive: true });
        console.log(`✅ Copied static assets from ${assetsDir}`);
    } else {
        console.warn(`⚠️ No assets directory found at ${assetsDir}`);
    }

    // Copy and rename the worker file to _worker.js
    if (fs.existsSync(workerFile)) {
        fs.copyFileSync(workerFile, path.join(distDir, '_worker.js'));
        console.log(`✅ Copied worker to ${path.join(distDir, '_worker.js')}`);
    } else {
        console.error(`❌ Failed to find ${workerFile}`);
        process.exit(1);
    }

    console.log('🎉 OpenNext Cloudflare Pages package complete! Output directory: .open-next/dist');
} catch (error) {
    console.error('❌ Failed to package OpenNext output:', error);
    process.exit(1);
}
