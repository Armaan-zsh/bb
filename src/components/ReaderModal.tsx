'use client';

import { useState, useEffect } from 'react';
import { linkifyAcademic } from '@/lib/zettelkasten';

interface ReaderModalProps {
    post: {
        title: string;
        url: string;
        source_name: string;
    } | null;
    onClose: () => void;
}

export default function ReaderModal({ post, onClose }: ReaderModalProps) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!post) return;

        // Disable scrolling behind modal
        document.body.style.overflow = 'hidden';

        // 'Invisible UI' Zero-Latency Render:
        // We no longer fetch from /api/content. The full text is already pre-loaded via RSC.
        try {
            const rawContent = (post as any).content || 'Content could not be loaded from database.'; // cast to any temporarily as we haven't updated the PostRow type in FeedClient yet
            const linkedHtml = linkifyAcademic(rawContent);
            setContent(linkedHtml);
        } catch (err: any) {
            setError('Error parsing Zettelkasten links.');
        }

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
                    {loading ? (
                        <div className="reader-loading">
                            <div className="spinner"></div>
                            <span>Fetching full article signal...</span>
                        </div>
                    ) : error ? (
                        <div className="reader-loading">
                            <span>{error}</span>
                            {post && (
                                <a href={post.url} target="_blank" rel="noopener noreferrer" className="nav-tab">
                                    View Original Source
                                </a>
                            )}
                        </div>
                    ) : post ? (
                        <article>
                            <div className="reader-meta">
                                <div className="reader-source">{post.source_name}</div>
                                <h1 className="reader-title">{post.title}</h1>
                            </div>

                            <div
                                className="reader-body"
                                dangerouslySetInnerHTML={{ __html: content }}
                            />

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
