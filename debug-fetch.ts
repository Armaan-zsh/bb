import { fetchAllFeeds } from './src/lib/fetcher';
import { SOURCES } from './src/lib/sources';

async function debug() {
    const testSources = SOURCES.filter(s => s.name === "Simon Willison" || s.name === "Hacker News");
    console.log('Testing sources:', testSources.map(s => s.name));

    for (const s of testSources) {
        console.log(`\nFetching ${s.name} from ${s.url}...`);
        try {
            const res = await fetch(s.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; TheFeed/1.0)',
                }
            });
            console.log(`   Status: ${res.status}`);
            if (res.ok) {
                const text = await res.text();
                console.log(`   Length: ${text.length}`);
                console.log(`   Preview: ${text.substring(0, 100)}`);
            } else {
                console.log(`   Error body: ${await res.text()}`);
            }
        } catch (err: any) {
            console.error(`   Fetch failed: ${err.message}`);
        }
    }
}

debug();
