import { formatDistanceToNow, parseISO, isValid } from 'date-fns';

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

function relativeDate(dateStr: string | null): string {
    if (!dateStr) return '';
    try {
        const d = parseISO(dateStr);
        if (!isValid(d)) return '';
        return formatDistanceToNow(d, { addSuffix: true });
    } catch {
        return '';
    }
}

export default function PostCard({ post, onRead }: { post: Post; onRead: (post: Post) => void }) {
    const date = relativeDate(post.published_at);

    return (
        <article className="post-card">
            <div className="post-card-header">
                <a href={`/source/${post.source_id}`} className="post-source">
                    {post.source_name}
                </a>
                <div className="post-card-badges">
                    {post.source_tier === 1 && <span className="badge-elite">Elite Signal</span>}
                </div>
            </div>

            <a href={post.url} className="post-card-content" onClick={(e) => { e.preventDefault(); onRead(post); }}>
                <h2 className="post-title">{post.title}</h2>
                {post.excerpt && (
                    <p className="post-excerpt">
                        {post.excerpt.length > 180 ? post.excerpt.substring(0, 180) + '...' : post.excerpt}
                    </p>
                )}
            </a>

            <div className="post-card-footer">
                {date && <span className="post-date">{date}</span>}
                <div className="post-card-actions">
                    <button className="read-btn" onClick={() => onRead(post)}>
                        Open Reader ↗
                    </button>
                </div>
            </div>
        </article>
    );
}
