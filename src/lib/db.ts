import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'feeds.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  // Ensure data directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('foreign_keys = ON');

  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      url         TEXT NOT NULL UNIQUE,
      category    TEXT NOT NULL DEFAULT 'misc',
      tier        INTEGER NOT NULL DEFAULT 2,
      last_fetched TEXT,
      post_count  INTEGER DEFAULT 0,
      active      INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS posts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id    INTEGER NOT NULL REFERENCES sources(id),
      title        TEXT NOT NULL,
      url          TEXT NOT NULL UNIQUE,
      excerpt      TEXT,
      published_at TEXT,
      fetched_at   TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    );

    -- FTS5 virtual table for full-text search
    CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
      title,
      excerpt,
      content=posts,
      content_rowid=id
    );

    -- Keep FTS index in sync
    CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
      INSERT INTO posts_fts(rowid, title, excerpt) VALUES (new.id, new.title, new.excerpt);
    END;
    CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
      INSERT INTO posts_fts(posts_fts, rowid, title, excerpt) VALUES ('delete', old.id, old.title, old.excerpt);
    END;
    CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE ON posts BEGIN
      INSERT INTO posts_fts(posts_fts, rowid, title, excerpt) VALUES ('delete', old.id, old.title, old.excerpt);
      INSERT INTO posts_fts(rowid, title, excerpt) VALUES (new.id, new.title, new.excerpt);
    END;

    CREATE INDEX IF NOT EXISTS idx_posts_source ON posts(source_id);
    CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sources_category ON sources(category);
    CREATE INDEX IF NOT EXISTS idx_sources_tier ON sources(tier);
  `);
}

export interface PostRow {
  id: number;
  source_id: number;
  source_name: string;
  source_category: string;
  source_tier: number;
  title: string;
  url: string;
  excerpt: string | null;
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

export function getPosts(opts: GetPostsOptions = {}): { posts: PostRow[]; total: number } {
  const db = getDb();
  const { page = 1, limit = 24, category, tier, q, sourceId } = opts;
  const offset = (page - 1) * limit;

  if (q && q.trim()) {
    // FTS search path
    const query = q.trim().replace(/['"*]/g, '') + '*';
    const baseWhere = buildWhere({ category, tier, sourceId });

    const posts = db.prepare(`
      SELECT p.*, s.name as source_name, s.category as source_category, s.tier as source_tier
      FROM posts_fts f
      JOIN posts p ON p.id = f.rowid
      JOIN sources s ON s.id = p.source_id
      ${baseWhere.sql ? 'WHERE ' + baseWhere.sql : ''}
      AND posts_fts MATCH ?
      ORDER BY p.published_at DESC
      LIMIT ? OFFSET ?
    `).all(...baseWhere.params, query, limit, offset) as PostRow[];

    const { count } = db.prepare(`
      SELECT COUNT(*) as count
      FROM posts_fts f
      JOIN posts p ON p.id = f.rowid
      JOIN sources s ON s.id = p.source_id
      ${baseWhere.sql ? 'WHERE ' + baseWhere.sql : ''}
      AND posts_fts MATCH ?
    `).get(...baseWhere.params, query) as { count: number };

    return { posts, total: count };
  }

  const where = buildWhere({ category, tier, sourceId });
  const whereClause = where.sql ? 'WHERE ' + where.sql : '';

  // Use a CTE with ROW_NUMBER() to implement per-source diversity logic
  // We only apply the per-source limit when we are in the "Elite 15" view (limit <= 24 and tier=1)
  const isEliteView = (limit <= 24 && tier === 1 && !category && !q);
  const sourceLimit = 2; // Max posts per source in elite view

  let querySql = `
        SELECT p.*, s.name as source_name, s.category as source_category, s.tier as source_tier
        FROM posts p
        JOIN sources s ON s.id = p.source_id
        ${whereClause}
        ORDER BY p.published_at DESC
        LIMIT ? OFFSET ?
    `;

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
  }

  const posts = db.prepare(querySql).all(...where.params, limit, offset) as PostRow[];

  const { count } = db.prepare(`
    SELECT COUNT(*) as count FROM posts p
    JOIN sources s ON s.id = p.source_id
    ${whereClause}
  `).get(...where.params) as { count: number };

  return { posts, total: count };
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

export function getSources(): SourceRow[] {
  const db = getDb();
  return db.prepare(`
    SELECT s.*, COUNT(p.id) as post_count
    FROM sources s
    LEFT JOIN posts p ON p.source_id = s.id
    WHERE s.active = 1
    GROUP BY s.id
    ORDER BY s.tier ASC, s.name ASC
  `).all() as SourceRow[];
}

export function getSource(id: number): SourceRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM sources WHERE id = ?').get(id) as SourceRow | undefined;
}

export function getTotalStats() {
  const db = getDb();
  const { count: postCount } = db.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number };
  const { count: sourceCount } = db.prepare('SELECT COUNT(*) as count FROM sources WHERE active = 1').get() as { count: number };
  const lastFetched = db.prepare('SELECT MAX(fetched_at) as t FROM posts').get() as { t: string | null };
  return { postCount, sourceCount, lastFetched: lastFetched.t };
}

export function purgePosts(days: number = 30) {
  const db = getDb();
  const result = db.prepare("DELETE FROM posts WHERE published_at < datetime('now', '-' || ? || ' days')").run(days);
  db.prepare("INSERT INTO posts_fts(posts_fts) VALUES('optimize')").run();
  return result.changes;
}

export function getTrendingKeywords(limit: number = 8) {
  const db = getDb();
  const rows = db.prepare(`
        SELECT title FROM posts 
        WHERE published_at > datetime('now', '-2 days')
    `).all() as { title: string }[];

  const { rankKeywords } = require('./pulse');
  return rankKeywords(rows.map(r => r.title)).slice(0, limit);
}
