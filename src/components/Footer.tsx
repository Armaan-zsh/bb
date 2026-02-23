export default function Footer({
    sourceCount,
    postCount,
}: {
    sourceCount?: number;
    postCount?: number;
}) {
    return (
        <footer className="site-footer">
            <div className="site-footer-inner">
                <span className="footer-text">
                    The Feed — {sourceCount ?? '—'} sources · {postCount?.toLocaleString() ?? '—'} posts
                </span>
                <span className="footer-text">
                    Quality over quantity. No AI. No ads.
                </span>
            </div>
        </footer>
    );
}
