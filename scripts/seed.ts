#!/usr/bin/env node
// Run with: npx tsx scripts/seed.ts
// Seeds the DB with all feeds. Use --tier=1 to only fetch Tier 1 sources.

import { fetchAllFeeds } from '../src/lib/fetcher';

const args = process.argv.slice(2);
const tierArg = args.find(a => a.startsWith('--tier='));
const tierLimit = tierArg ? parseInt(tierArg.split('=')[1]) : undefined;

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
