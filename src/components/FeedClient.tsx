'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import PostCard from '@/components/PostCard';
import ReaderModal from '@/components/ReaderModal';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export interface Post {
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

interface Stats {
    postCount: number;
    sourceCount: number;
    lastFetched: string | null;
}

const CATEGORIES = [
    { key: 'all', label: 'All' },
    { key: 'engineering', label: 'Engineering' },
    { key: 'security', label: 'Security' },
    { key: 'individual', label: 'Individual' },
    { key: 'knowledge', label: 'Knowledge' },
    { key: 'language', label: 'Languages' },
    { key: 'misc', label: 'Research' },
];

interface FeedClientProps {
    initialPosts: Post[];
    totalPosts: number;
    category: string;
    query: string;
    trending: string[];
}

export default function FeedClient({ initialPosts, totalPosts, category: initialCategory, query: initialQuery, trending: initialTrending }: FeedClientProps) {
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [total, setTotal] = useState(totalPosts);
    const [pages, setPages] = useState(Math.ceil(totalPosts / 24) || 1);
    const [page, setPage] = useState(1);
    const [category, setCategory] = useState(initialCategory || 'all');
    const [tier, setTier] = useState<number | 'all'>(1);
    const [query, setQuery] = useState(initialQuery || '');
    const [debouncedQuery, setDebouncedQuery] = useState(initialQuery || '');
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(false); // Initially false because of RSC
    const [readingPost, setReadingPost] = useState<Post | null>(null);
    const [trending, setTrending] = useState<string[]>(initialTrending);
    const [empty, setEmpty] = useState(initialPosts.length === 0);

    const debounceRef = useRef<NodeJS.Timeout>();

    // Track if this is the initial render to prevent duplicate fetching
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedQuery(query);
            setPage(1);
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query]);

    // Fetch stats once
    useEffect(() => {
        fetch('/api/sources')
            .then(r => r.json())
            .then(d => {
                setStats(d.stats);
                if (d.trending && d.trending.length > 0) {
                    setTrending(d.trending);
                }
            })
            .catch(() => { });
    }, []);

    // Fetch posts on client interaction
    const fetchPosts = useCallback(async () => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return; // Skip first fetch as we have initialPosts from RSC
        }

        setLoading(true);
        const params = new URLSearchParams({
            page: String(page),
            limit: tier === 1 ? '15' : '24',
            ...(category !== 'all' && { category }),
            ...(tier !== 'all' && { tier: String(tier) }),
            ...(debouncedQuery && { q: debouncedQuery }),
        });

        try {
            const res = await fetch(`/api/posts?${params}`);
            const data = await res.json();
            setPosts(data.posts ?? []);
            setTotal(data.total ?? 0);
            setPages(data.pages ?? 1);
            setEmpty((data.posts ?? []).length === 0);
        } catch {
            setEmpty(true);
        } finally {
            setLoading(false);
        }
    }, [page, category, tier, debouncedQuery]);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    function groupPosts(postsToGroup: Post[]) {
        const today: Post[] = [];
        const yesterday: Post[] = [];
        const thisWeek: Post[] = [];
        const older: Post[] = [];

        const now = new Date();
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterdayDate = todayDate - 86400000;
        const weekDate = todayDate - 86400000 * 7;

        postsToGroup.forEach(p => {
            if (!p.published_at) { older.push(p); return; }
            const d = new Date(p.published_at).getTime();
            if (d >= todayDate) today.push(p);
            else if (d >= yesterdayDate) yesterday.push(p);
            else if (d >= weekDate) thisWeek.push(p);
            else older.push(p);
        });

        return [
            { label: 'Today', posts: today },
            { label: 'Yesterday', posts: yesterday },
            { label: 'Past 7 Days', posts: thisWeek },
            { label: 'Deep Signal', posts: older }
        ].filter(g => g.posts.length > 0);
    }

    return (
        <>
            <Header query={query} onQuery={setQuery} />
            <main>
                <div className="site-wrapper">


                    {/* Controls */}
                    <div className="controls-row">
                        <div className="controls-tabs">
                            <button
                                className={`ctrl-tab${category === 'all' ? ' active' : ''}`}
                                onClick={() => { setCategory('all'); setPage(1); }}
                            >
                                All
                            </button>
                            {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                                <button
                                    key={c.key}
                                    className={`ctrl-tab${category === c.key ? ' active' : ''}`}
                                    onClick={() => { setCategory(c.key); setPage(1); }}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                        <div className="controls-tabs">
                            <button
                                className={`ctrl-tab${tier === 1 ? ' active' : ''}`}
                                onClick={() => { setTier(1); setPage(1); }}
                            >
                                Elite 15
                            </button>
                            <button
                                className={`ctrl-tab${tier === 'all' ? ' active' : ''}`}
                                onClick={() => { setTier('all'); setPage(1); }}
                            >
                                All Signals
                            </button>
                        </div>
                    </div>


                    {/* Global Search Results Header */}
                    {debouncedQuery && (
                        <div className="search-header">
                            <h2>Results for "{debouncedQuery}"</h2>
                            <span className="search-count">{total} signals found</span>
                        </div>
                    )}

                    {/* Posts */}
                    {empty && !loading ? (
                        <div className="empty-state">
                            <h3>No posts yet</h3>
                            <p>Run <code>npx tsx scripts/seed.ts</code> to populate the database.</p>
                        </div>
                    ) : (
                        <div className="feed-container">
                            {groupPosts(posts).map(group => (
                                <section key={group.label} className="time-group">
                                    <div className="group-header">
                                        <h3 className="group-label">{group.label}</h3>
                                        <span className="group-count">{group.posts.length} entries</span>
                                    </div>
                                    <div className="posts-stack">
                                        {group.posts.map(post => (
                                            <PostCard
                                                key={post.id}
                                                post={post}
                                                onRead={(p) => setReadingPost(p as any)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ))}
                            {loading && !posts.length && Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="post-card" style={{ opacity: 0.3, minHeight: 160 }} />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {pages > 1 && tier !== 1 && (
                        <div className="pagination">
                            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                ← Prev
                            </button>
                            <span className="page-info">{page} / {pages}</span>
                            <button className="page-btn" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>
                                Next →
                            </button>
                        </div>
                    )}
                </div>
            </main>


            {readingPost && (
                <ReaderModal
                    post={readingPost}
                    onClose={() => setReadingPost(null)}
                />
            )}
        </>
    );
}
