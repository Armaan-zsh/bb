import { NextResponse } from 'next/server';
import { getSources, getTotalStats, getTrendingKeywords } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const sources = await getSources();
        const stats = await getTotalStats();
        const trending = await getTrendingKeywords(8);
        return NextResponse.json({ sources, stats, trending });
    } catch (err) {
        console.error('[GET /api/sources]', err);
        return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
    }
}
