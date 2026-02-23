import { NextResponse } from 'next/server';
import { getSources, getTotalStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const sources = getSources();
        const stats = getTotalStats();
        return NextResponse.json({ sources, stats });
    } catch (err) {
        console.error('[GET /api/sources]', err);
        return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
    }
}
