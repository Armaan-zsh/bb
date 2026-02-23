import { NextRequest, NextResponse } from 'next/server';
import { fetchIncrementalFeeds } from '@/lib/fetcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/refresh — trigger a feed refresh
// Protect with a shared secret if needed: ?secret=xxx
export async function POST(req: NextRequest) {
    const secret = process.env.REFRESH_SECRET;
    if (secret) {
        const { searchParams } = req.nextUrl;
        if (searchParams.get('secret') !== secret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const tier = req.nextUrl.searchParams.get('tier')
            ? parseInt(req.nextUrl.searchParams.get('tier')!)
            : undefined;

        const result = await fetchIncrementalFeeds({ tierLimit: tier });
        return NextResponse.json({ ok: true, ...result });
    } catch (err) {
        console.error('[POST /api/refresh]', err);
        return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
    }
}
