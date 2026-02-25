import { getPosts, getTrendingKeywords } from '@/lib/db';
import FeedClient from '@/components/FeedClient';

// Enable Node.js runtime for proper SQLite execution
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable static caching so we always serve fresh feed on reload

export default async function HomePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Parse initial state from URL parameters
  const category = typeof searchParams.category === 'string' ? searchParams.category : 'all';
  const query = typeof searchParams.q === 'string' ? searchParams.q : '';

  // ── THE INVISIBLE UI PRE-FETCHER ──
  // Pre-fetch the top 50 posts directly from SQLite on the server
  // Because 'content' is part of the FTS5 schema, this includes full article texts
  const { posts, total } = getPosts({
    page: 1,
    limit: 50,
    category: category !== 'all' ? category : undefined,
    q: query,
  });

  const trending = getTrendingKeywords(6);

  return (
    <FeedClient
      initialPosts={posts as any}
      totalPosts={total}
      category={category}
      query={query}
      trending={trending}
    />
  );
}
