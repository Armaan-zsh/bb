import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const distDir = '.open-next/dist';
const assetsDir = '.open-next/assets';
const bundledWorkerDir = 'dist-worker';

console.log('📦 Bundling OpenNext worker with Wrangler...');

try {
    // Step 1: Pre-bundle the worker using Wrangler
    // By using CI=true we auto-bypass the Pages Warning interactive prompt
    execSync(`CI=true npx wrangler deploy --dry-run --outdir ${bundledWorkerDir}`, { stdio: 'inherit' });

    // Create the final dist directory
    fs.mkdirSync(distDir, { recursive: true });

    // Copy all static assets into dist
    if (fs.existsSync(assetsDir)) {
        fs.cpSync(assetsDir, distDir, { recursive: true });
        console.log(`✅ Copied static assets from ${assetsDir}`);
    } else {
        console.warn(`⚠️ No assets directory found at ${assetsDir}`);
    }

    // Copy and rename the fully bundled worker to _worker.js
    const bundledWorker = path.join(bundledWorkerDir, 'worker.js');
    if (fs.existsSync(bundledWorker)) {
        fs.copyFileSync(bundledWorker, path.join(distDir, '_worker.js'));
        console.log(`✅ Copied bundled worker to ${path.join(distDir, '_worker.js')}`);
    } else {
        console.error(`❌ Failed to find bundled worker at ${bundledWorker}`);
        process.exit(1);
    }

    // Cleanup temporary bundled worker dir
    fs.rmSync(bundledWorkerDir, { recursive: true, force: true });

    console.log('🎉 OpenNext Cloudflare Pages package complete! Output directory: .open-next/dist');
} catch (error) {
    console.error('❌ Failed to package OpenNext output:', error);
    process.exit(1);
}
