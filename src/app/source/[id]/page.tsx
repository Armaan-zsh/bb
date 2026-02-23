'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PostCard from '@/components/PostCard';

interface Source {
    id: number;
    name: string;
    url: string;
    category: string;
    tier: number;
    post_count: number;
    last_fetched: string | null;
}

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

export default function SourcePage() {
    const params = useParams();
    const id = params?.id as string;
    const [source, setSource] = useState<Source | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        if (!id) return;

        fetch('/api/sources')
            .then(r => r.json())
            .then(d => {
                const found = (d.sources ?? []).find((s: Source) => String(s.id) === id);
                if (found) setSource(found);
            });

        fetch(`/api/posts?sourceId=${id}&limit=48`)
            .then(r => r.json())
            .then(d => {
                setPosts(d.posts ?? []);
                setTotal(d.total ?? 0);
            });
    }, [id]);

    return (
        <>
            <Header query="" onQuery={() => { }} />
            <main>
                <div className="site-wrapper">
                    <div className="source-header">
                        <a href="/sources" className="source-header-back">← All Sources</a>
                        <h1>{source?.name ?? 'Loading…'}</h1>
                        <div className="source-header-meta">
                            <span>Tier {source?.tier}</span>
                            <span>{source?.category}</span>
                            <span>{total} posts</span>
                            {source?.url && (
                                <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-faint)' }}>
                                    RSS Feed ↗
                                </a>
                            )}
                        </div>
                    </div>

                    {posts.length === 0 ? (
                        <div className="empty-state">
                            <h3>No posts from this source yet</h3>
                            <p>Try running the seed script to fetch posts.</p>
                        </div>
                    ) : (
                        <div className="posts-grid">
                            {posts.map(post => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}
