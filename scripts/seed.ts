#!/usr/bin/env node
// Run with: npx tsx scripts/seed.ts
// Seeds the DB with all feeds. Use --tier=1 to only fetch Tier 1 sources.

import { fetchAllFeeds } from '../src/lib/fetcher';
import { getDb } from '../src/lib/db';

const args = process.argv.slice(2);
const tierArg = args.find(a => a.startsWith('--tier='));
const tier = tierArg?.split('=')[1];
const tierLimit = tier ? parseInt(tier) : undefined;
const wipe = args.includes('--wipe');

if (wipe) {
    console.log('🧹 Wiping existing posts and resetting source counts...');
    const db = getDb();
    db.prepare('DELETE FROM posts').run();
    db.prepare('DELETE FROM posts_fts').run();
    db.prepare('UPDATE sources SET post_count = 0, last_fetched = NULL').run();
    console.log('✨ Database cleaned.');
}

console.log('🔄 Starting feed fetch...');
if (tierLimit) console.log(`   Tier limit: ${tierLimit}`);

const start = Date.now();

fetchAllFeeds({
    concurrency: 8,
    tierLimit,
    onProgress: (done, total, name) => {
        const pct = Math.round((done / total) * 100);
        process.stdout.write(`\r   [${pct}%] ${done}/${total} — ${name.substring(0, 40).padEnd(40)}`);
    },
}).then(({ total, errors }) => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n\n✅ Done in ${elapsed}s`);
    console.log(`   ${total} new posts inserted`);
    console.log(`   ${errors} feeds failed`);
    process.exit(0);
}).catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
});
