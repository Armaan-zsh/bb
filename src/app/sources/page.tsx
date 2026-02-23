'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Source {
    id: number;
    name: string;
    url: string;
    category: string;
    tier: number;
    post_count: number;
}

interface Stats {
    postCount: number;
    sourceCount: number;
}

const CATEGORY_ORDER = ['engineering', 'security', 'individual', 'language', 'misc'];
const CATEGORY_LABELS: Record<string, string> = {
    engineering: 'Engineering',
    security: 'Security',
    individual: 'Individual Bloggers',
    language: 'Languages & Frameworks',
    misc: 'Misc',
};

export default function SourcesPage() {
    const [sources, setSources] = useState<Source[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);

    useEffect(() => {
        fetch('/api/sources')
            .then(r => r.json())
            .then(d => {
                setSources(d.sources ?? []);
                setStats(d.stats ?? null);
            })
            .catch(() => { });
    }, []);

    const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
        const list = sources.filter(s => s.category === cat);
        if (list.length) acc[cat] = list;
        return acc;
    }, {} as Record<string, Source[]>);

    return (
        <>
            <Header query="" onQuery={() => { }} />
            <main>
                <div className="site-wrapper">
                    <div className="source-header">
                        <a href="/" className="source-header-back">← Back to Feed</a>
                        <h1>All Sources</h1>
                        <div className="source-header-meta">
                            <span>{stats?.sourceCount ?? '—'} sources</span>
                            <span>{stats?.postCount?.toLocaleString() ?? '—'} posts</span>
                        </div>
                    </div>

                    {Object.entries(grouped).map(([cat, list]) => (
                        <section key={cat} style={{ marginBottom: 48 }}>
                            <p className="section-heading">{CATEGORY_LABELS[cat] ?? cat}</p>
                            <div className="sources-grid">
                                {list.map(s => (
                                    <a href={`/source/${s.id}`} key={s.id} className="source-card">
                                        <span className="source-card-name">{s.name}</span>
                                        <div className="source-card-meta">
                                            <span className="post-category">Tier {s.tier}</span>
                                            <span className="source-card-count">{s.post_count} posts</span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </section>
                    ))}

                    {!sources.length && (
                        <div className="empty-state">
                            <h3>No sources yet</h3>
                            <p>Run <code>npx tsx scripts/seed.ts</code> to populate the database.</p>
                        </div>
                    )}
                </div>
            </main>
            <Footer sourceCount={stats?.sourceCount} postCount={stats?.postCount} />
        </>
    );
}
