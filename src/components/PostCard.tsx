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

export default function PostCard({ post }: { post: Post }) {
    const date = relativeDate(post.published_at);

    return (
        <article className="post-card">
            <div className="post-card-meta">
                <a href={`/source/${post.source_id}`} className="post-source">
                    {post.source_name}
                </a>
                {date && <span className="post-date">{date}</span>}
            </div>

            <a href={post.url} target="_blank" rel="noopener noreferrer">
                <h2 className="post-title">{post.title}</h2>
            </a>
        </article>
    );
}
