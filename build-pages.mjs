import fs from 'node:fs';
import { execSync } from 'node:child_process';

const distDir = '.open-next/dist';
const assetsDir = '.open-next/assets';

console.log('📦 Minifying OpenNext worker to comply with Cloudflare Pages 1MB Free Tier limit...');

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

    // 3. Bundle the OpenNext worker uniquely using esbuild
    // This crushes 40MB+ of Next.js/Webpack internals into a ~850KB gzip
    // `--platform=node` safely externalizes all Node built-ins since CF provides nodejs_compat
    console.log(`⚡ Running ESBuild to strictly compile _worker.js...`);
    execSync(
        'npx esbuild .open-next/worker.js --bundle --minify --format=esm --platform=node --target=es2022 --external:cloudflare:* --outfile=.open-next/dist/_worker.js',
        { stdio: 'inherit' }
    );

    console.log(`✅ Packaged and minified OpenNext into _worker.js`);
    console.log('🎉 OpenNext Cloudflare Pages package complete! Output directory: .open-next/dist');
} catch (error) {
    console.error('❌ Failed to package OpenNext output:', error);
    process.exit(1);
}
