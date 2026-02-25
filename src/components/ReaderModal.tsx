'use client';

import { useState, useEffect } from 'react';
import { linkifyAcademic } from '@/lib/zettelkasten';

interface ReaderModalProps {
    post: {
        title: string;
        url: string;
        source_name: string;
        content?: string | null;
    } | null;
    onClose: () => void;
}

export default function ReaderModal({ post, onClose }: ReaderModalProps) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!post) return;

        // Disable scrolling behind modal
        document.body.style.overflow = 'hidden';

        // Step 1: Instantly render the RSS content from DB (zero-latency)
        const rssContent = (post as any).content || '';
        if (rssContent) {
            setContent(linkifyAcademic(rssContent));
        }

        // Step 2: Fetch the FULL article from the original source in the background
        const fetchFull = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/content?url=${encodeURIComponent(post.url)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.content) {
                        setContent(linkifyAcademic(data.content));
                    }
                }
            } catch {
                // Silently fail — we already have the RSS content showing
            } finally {
                setLoading(false);
            }
        };

        fetchFull();

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [post]);

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div className="reader-overlay" onClick={onClose}>
            <div
                className="reader-content"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="reader-scroll-area">
                    {post ? (
                        <article>
                            <div className="reader-meta">
                                <div className="reader-source">{post.source_name}</div>
                                <h1 className="reader-title">{post.title}</h1>
                            </div>

                            {loading && !content && (
                                <div className="reader-loading">
                                    <div className="spinner"></div>
                                    <span>Fetching full article…</span>
                                </div>
                            )}

                            <div
                                className="reader-body"
                                dangerouslySetInnerHTML={{ __html: content }}
                            />

                            {loading && content && (
                                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-faint)', fontSize: 12 }}>
                                    Loading full article…
                                </div>
                            )}

                            <div style={{ marginTop: 64, borderTop: '1px solid var(--border)', paddingTop: 32 }}>
                                <a href={post.url} target="_blank" rel="noopener noreferrer" className="nav-tab">
                                    Read original on {post.source_name} →
                                </a>
                            </div>
                        </article>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
