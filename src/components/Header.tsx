'use client';

interface HeaderProps {
    query: string;
    onQuery: (q: string) => void;
}

export default function Header({ query, onQuery }: HeaderProps) {
    return (
        <header className="site-header">
            <div className="site-header-inner">
                <a href="/" className="site-logo">
                    The Feed <span>/ tech</span>
                </a>
                <nav className="nav-tabs">
                    <a href="/" className="nav-tab active">Home</a>
                    <a href="/sources" className="nav-tab">Sources</a>
                </nav>
                <div className="search-wrap">
                    <input
                        className="search-input"
                        type="search"
                        placeholder="Search posts…"
                        value={query}
                        onChange={e => onQuery(e.target.value)}
                        id="site-search"
                    />
                </div>
            </div>
        </header>
    );
}
