import { NextResponse } from 'next/server';
import { getTotalStats, getTrendingKeywords } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const stats = getTotalStats();
        const keywords = getTrendingKeywords(8);

        return NextResponse.json({
            stats,
            keywords
        });
    } catch (err: any) {
        console.error('[API/PULSE] Error:', err.message);
        return NextResponse.json({ error: 'Failed to fetch pulse data' }, { status: 500 });
    }
}
