'use client';

import { useState, useEffect, useCallback } from 'react';
import PostCard from '@/components/PostCard';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Post {
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

export default function WideFeedPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({
            page: String(page),
            limit: '48',
            tier: 'all',
        });

        try {
            const res = await fetch(`/api/posts?${params}`);
            const data = await res.json();
            setPosts(data.posts ?? []);
            setTotal(data.total ?? 0);
            setPages(data.pages ?? 1);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    return (
        <>
            <Header query="" onQuery={() => { }} />
            <main>
                <div className="site-wrapper">
                    <div className="source-header">
                        <a href="/" className="source-header-back">← Back to Elite 15</a>
                        <h1>Wide Feed</h1>
                        <div className="source-header-meta">
                            <span>{total.toLocaleString()} posts from all sources</span>
                        </div>
                    </div>

                    <div className="posts-grid">
                        {posts.map(post => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>

                    {pages > 1 && (
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
            <Footer />
        </>
    );
}
