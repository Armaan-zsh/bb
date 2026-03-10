import { getPosts, getTrendingKeywords } from '@/lib/db';
import FeedClient from '@/components/FeedClient';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const category = typeof searchParams.category === 'string' ? searchParams.category : 'all';
  const query = typeof searchParams.q === 'string' ? searchParams.q : '';

  const { posts, total } = await getPosts({
    page: 1,
    limit: 50,
    category: category !== 'all' ? category : undefined,
    q: query,
  });

  const trending = await getTrendingKeywords(6);

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
