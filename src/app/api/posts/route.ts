import { NextRequest, NextResponse } from 'next/server';
import { getPosts } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = req.nextUrl;
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
        const limit = Math.min(48, Math.max(1, parseInt(searchParams.get('limit') ?? '24')));
        const category = searchParams.get('category') ?? undefined;
        const tier = searchParams.get('tier') ? parseInt(searchParams.get('tier')!) : undefined;
        const q = searchParams.get('q') ?? undefined;
        const sourceId = searchParams.get('sourceId') ? parseInt(searchParams.get('sourceId')!) : undefined;

        const { posts, total } = getPosts({ page, limit, category, tier, q, sourceId });

        return NextResponse.json({
            posts,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        });
    } catch (err) {
        console.error('[GET /api/posts]', err);
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }
}
