import fs from 'node:fs';
import path from 'node:path';

const distDir = '.open-next/dist';
const assetsDir = '.open-next/assets';
const workerDir = path.join(distDir, '_worker.js');

console.log('📦 Restructuring OpenNext for Cloudflare Pages Advanced Module Directory Mode...');

try {
    // 1. Create the final dist directory
    fs.mkdirSync(distDir, { recursive: true });

    // 2. Copy all static assets to the root of dist
    if (fs.existsSync(assetsDir)) {
        fs.cpSync(assetsDir, distDir, { recursive: true });
        console.log(`✅ Copied static assets to root`);
    } else {
        console.warn(`⚠️ No assets directory found at ${assetsDir}`);
    }

    // 3. Create the _worker.js directory to house the backend and modules
    fs.mkdirSync(workerDir, { recursive: true });

    // 4. Move all backend logic into _worker.js/ and rename worker.js to index.js
    const internalItems = fs.readdirSync('.open-next');
    for (const item of internalItems) {
        if (item === 'assets' || item === 'dist') continue; // Skip assets and output

        const sourcePath = path.join('.open-next', item);
        if (item === 'worker.js') {
            fs.copyFileSync(sourcePath, path.join(workerDir, 'index.js'));
        } else {
            fs.cpSync(sourcePath, path.join(workerDir, item), { recursive: true });
        }
    }

    console.log(`✅ Packaged worker logic into _worker.js directory`);
    console.log('🎉 OpenNext Cloudflare Pages package complete! Output directory: .open-next/dist');
} catch (error) {
    console.error('❌ Failed to package OpenNext output:', error);
    process.exit(1);
}
