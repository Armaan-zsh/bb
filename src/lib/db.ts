import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface PostRow {
  id: number;
  source_id: number;
  source_name: string;
  source_category: string;
  source_tier: number;
  title: string;
  url: string;
  excerpt: string | null;
  content: string | null;
  published_at: string | null;
  fetched_at: string;
}

export interface SourceRow {
  id: number;
  name: string;
  url: string;
  category: string;
  tier: number;
  last_fetched: string | null;
  post_count: number;
}

export interface GetPostsOptions {
  page?: number;
  limit?: number;
  category?: string;
  tier?: number;
  q?: string;
  sourceId?: number;
}

export async function getDb() {
  const { env } = await getCloudflareContext();
  return (env as any).DB;
}

export async function getPosts(opts: GetPostsOptions = {}): Promise<{ posts: PostRow[]; total: number }> {
  const db = await getDb();
  const { page = 1, limit = 24, category, tier, q, sourceId } = opts;
  const offset = (page - 1) * limit;

  const { sql: whereSql, params: whereParams } = buildWhere({ category, tier, sourceId });
  const whereClause = whereSql ? 'WHERE ' + whereSql : '';

  if (q && q.trim()) {
    const query = '%' + q.trim() + '%';
    const posts = await db.prepare(`
      SELECT p.*, s.name as source_name, s.category as source_category, s.tier as source_tier
      FROM posts p
      JOIN sources s ON s.id = p.source_id
      ${whereClause ? whereClause + ' AND' : 'WHERE'}
      (p.title LIKE ?1 OR p.excerpt LIKE ?1)
      ORDER BY p.published_at DESC
      LIMIT ?2 OFFSET ?3
    `).bind(...whereParams, query, limit, offset).all<PostRow>();

    const countResult = await db.prepare(`
      SELECT COUNT(*) as count FROM posts p
      JOIN sources s ON s.id = p.source_id
      ${whereClause ? whereClause + ' AND' : 'WHERE'}
      (p.title LIKE ?1 OR p.excerpt LIKE ?1)
    `).bind(...whereParams, query).first<{ count: number }>();

    return { posts: posts.results, total: countResult?.count ?? 0 };
  }

  // Elite view: per-source diversity
  const isEliteView = (limit <= 24 && tier === 1 && !category && !q);
  const sourceLimit = 2;

  let querySql: string;
  if (isEliteView) {
    querySql = `
      WITH RankedPosts AS (
        SELECT p.*, s.name as source_name, s.category as source_category, s.tier as source_tier,
               ROW_NUMBER() OVER (PARTITION BY p.source_id ORDER BY p.published_at DESC) as rank
        FROM posts p
        JOIN sources s ON s.id = p.source_id
        ${whereClause}
      )
      SELECT * FROM RankedPosts
      WHERE rank <= ${sourceLimit}
      ORDER BY published_at DESC
      LIMIT ? OFFSET ?
    `;
  } else {
    querySql = `
      SELECT p.*, s.name as source_name, s.category as source_category, s.tier as source_tier
      FROM posts p
      JOIN sources s ON s.id = p.source_id
      ${whereClause}
      ORDER BY p.published_at DESC
      LIMIT ? OFFSET ?
    `;
  }

  const posts = await db.prepare(querySql).bind(...whereParams, limit, offset).all<PostRow>();

  const countResult = await db.prepare(`
    SELECT COUNT(*) as count FROM posts p
    JOIN sources s ON s.id = p.source_id
    ${whereClause}
  `).bind(...whereParams).first<{ count: number }>();

  return { posts: posts.results, total: countResult?.count ?? 0 };
}

function buildWhere(opts: { category?: string; tier?: number; sourceId?: number }) {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (opts.category && opts.category !== 'all') {
    conditions.push('s.category = ?');
    params.push(opts.category);
  }
  if (opts.tier) {
    conditions.push('s.tier <= ?');
    params.push(opts.tier);
  }
  if (opts.sourceId) {
    conditions.push('p.source_id = ?');
    params.push(opts.sourceId);
  }

  return { sql: conditions.join(' AND '), params };
}

export async function getSources(): Promise<SourceRow[]> {
  const db = await getDb();
  const result = await db.prepare(`
    SELECT s.*, COUNT(p.id) as post_count
    FROM sources s
    LEFT JOIN posts p ON p.source_id = s.id
    WHERE s.active = 1
    GROUP BY s.id
    ORDER BY s.tier ASC, s.name ASC
  `).all<SourceRow>();
  return result.results;
}

export async function getSource(id: number): Promise<SourceRow | undefined> {
  const db = await getDb();
  const result = await db.prepare('SELECT * FROM sources WHERE id = ?').bind(id).first<SourceRow>();
  return result ?? undefined;
}

export async function getTotalStats() {
  const db = await getDb();
  const postCount = await db.prepare('SELECT COUNT(*) as count FROM posts').first<{ count: number }>();
  const sourceCount = await db.prepare('SELECT COUNT(*) as count FROM sources WHERE active = 1').first<{ count: number }>();
  const lastFetched = await db.prepare('SELECT MAX(fetched_at) as t FROM posts').first<{ t: string | null }>();
  return {
    postCount: postCount?.count ?? 0,
    sourceCount: sourceCount?.count ?? 0,
    lastFetched: lastFetched?.t ?? null,
  };
}

export async function purgePosts(days: number = 30): Promise<number> {
  const db = await getDb();
  const result = await db.prepare("DELETE FROM posts WHERE published_at < datetime('now', '-' || ? || ' days')").bind(days).run();
  return result.meta?.changes ?? 0;
}

export async function getTrendingKeywords(limit: number = 8): Promise<string[]> {
  const db = await getDb();
  const result = await db.prepare(`
    SELECT title FROM posts
    WHERE published_at > datetime('now', '-2 days')
  `).all<{ title: string }>();

  const { rankKeywords } = require('./pulse');
  return rankKeywords(result.results.map((r: { title: string }) => r.title)).slice(0, limit);
}
