'use client';

import { useEffect, useState } from 'react';

interface Article {
    title: string;
    content: string;
    byline?: string;
    siteName?: string;
}

interface ReaderModalProps {
    url: string;
    sourceName: string;
    onClose: () => void;
}

export default function ReaderModal({ url, sourceName, onClose }: ReaderModalProps) {
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Disable scrolling behind modal
        document.body.style.overflow = 'hidden';

        async function fetchContent() {
            try {
                const res = await fetch(`/api/content?url=${encodeURIComponent(url)}`);
                if (!res.ok) throw new Error('Failed to load content');
                const data = await res.json();
                setArticle(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchContent();

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [url]);

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
                <button className="reader-close" onClick={onClose}>Close (Esc)</button>

                {loading ? (
                    <div className="reader-loading">
                        <div className="spinner"></div>
                        <span>Fetching full article signal...</span>
                    </div>
                ) : error ? (
                    <div className="reader-loading">
                        <span>{error}</span>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="nav-tab">
                            View Original Source
                        </a>
                    </div>
                ) : (
                    <article>
                        <div className="reader-meta">
                            <div className="reader-source">{sourceName}</div>
                            <h1 className="reader-title">{article?.title}</h1>
                            {article?.byline && (
                                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-faint)' }}>
                                    By {article.byline}
                                </div>
                            )}
                        </div>

                        <div
                            className="reader-body"
                            dangerouslySetInnerHTML={{ __html: article?.content || '' }}
                        />

                        <div style={{ marginTop: 64, borderTop: '1px solid var(--border)', paddingTop: 32 }}>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="nav-tab">
                                Read original on {article?.siteName || sourceName} →
                            </a>
                        </div>
                    </article>
                )}
            </div>
        </div>
    );
}
