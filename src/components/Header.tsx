import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface HeaderProps {
    query: string;
    onQuery: (q: string) => void;
}

type Theme = 'dark' | 'latte' | 'ember' | 'nordic';

interface PulseData {
    stats: {
        postCount: number;
        sourceCount: number;
        lastFetched: string | null;
    };
    keywords: string[];
}

export default function Header({ query, onQuery }: HeaderProps) {
    const pathname = usePathname();
    const [theme, setTheme] = useState<Theme>('dark');
    const [isShrunk, setIsShrunk] = useState(false);
    const [pulse, setPulse] = useState<PulseData | null>(null);

    // Initialize theme, scroll listener, and fetch pulse
    useEffect(() => {
        const savedTheme = localStorage.getItem('site-theme') as Theme;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        const handleScroll = () => {
            setIsShrunk(window.scrollY > 20);
        };

        async function fetchPulse() {
            try {
                const res = await fetch('/api/pulse');
                if (res.ok) {
                    const data = await res.json();
                    setPulse(data);
                }
            } catch (err) {
                console.error('Pulse fetch failed');
            }
        }

        window.addEventListener('scroll', handleScroll);
        fetchPulse();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('site-theme', newTheme);
    };

    return (
        <header className={`site-header${isShrunk ? ' shrunk' : ''}`}>
            <div className="site-header-inner">
                <a href="/" className="site-logo">
                    <i><strong>~Bb</strong></i>
                </a>

                {!isShrunk && pulse && (
                    <div className="pulse-stats">
                        <div className="pulse-item">
                            <span className="pulse-label">Signals</span>
                            <span className="pulse-value">{pulse.stats.postCount}</span>
                        </div>
                        <div className="pulse-divider"></div>
                        <div className="pulse-item">
                            <span className="pulse-label">Sources</span>
                            <span className="pulse-value">{pulse.stats.sourceCount}</span>
                        </div>
                        {pulse.keywords.length > 0 && (
                            <>
                                <div className="pulse-divider"></div>
                                <div className="pulse-keywords">
                                    {pulse.keywords.slice(0, 3).map(kw => (
                                        <span key={kw} className="pulse-keyword">#{kw}</span>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                <nav className="nav-tabs">
                    <a href="/" className={`nav-tab${pathname === '/' ? ' active' : ''}`}>Elite 15</a>
                    <a href="/feed" className={`nav-tab${pathname === '/feed' ? ' active' : ''}`}>Wide Feed</a>
                    <a href="/sources" className={`nav-tab${pathname === '/sources' ? ' active' : ''}`}>Sources</a>
                </nav>
                <div className="search-wrap">
                    <div className="theme-switcher">
                        <button
                            className={`theme-swatch swatch-dark${theme === 'dark' ? ' active' : ''}`}
                            onClick={() => handleThemeChange('dark')}
                            title="Pro Dark"
                        />
                        <button
                            className={`theme-swatch swatch-latte${theme === 'latte' ? ' active' : ''}`}
                            onClick={() => handleThemeChange('latte')}
                            title="Latte (Sepia)"
                        />
                        <button
                            className={`theme-swatch swatch-ember${theme === 'ember' ? ' active' : ''}`}
                            onClick={() => handleThemeChange('ember')}
                            title="Ember (Warm Dark)"
                        />
                        <button
                            className={`theme-swatch swatch-nordic${theme === 'nordic' ? ' active' : ''}`}
                            onClick={() => handleThemeChange('nordic')}
                            title="Nordic (Soft Hygge)"
                        />
                    </div>
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
