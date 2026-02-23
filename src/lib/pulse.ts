export const TECH_STOPWORDS = new Set([
    'the', 'and', 'for', 'with', 'from', 'this', 'that', 'your', 'will', 'have', 'new', 'how', 'why', 'what', 'who',
    'where', 'when', 'into', 'over', 'under', 'about', 'after', 'before', 'out', 'off', 'all', 'any', 'each', 'most',
    'some', 'such', 'very', 'been', 'were', 'was', 'are', 'can', 'not', 'but', 'can', 'let', 'get', 'use', 'using',
    'build', 'building', 'make', 'making', 'developer', 'engineering', 'development', 'release', 'version', 'update',
    'announcing', 'introducing', 'guide', 'tutorial', 'blog', 'post', 'feed', 'news', 'hacker', 'news', 'show', 'hn',
    'part', 'best', 'tool', 'toolkit', 'framework', 'service', 'system', 'application', 'project', 'server', 'client',
    'database', 'data', 'cloud', 'security', 'secure', 'management', 'work', 'working', 'today', 'now'
]);

export function extractKeywords(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9#+]/g, ' ') // Preserving # (C#) and + (C++)
        .split(/\s+/)
        .filter(word => word.length > 2 && !TECH_STOPWORDS.has(word));
}

export function rankKeywords(titles: string[]): string[] {
    const counts: Record<string, number> = {};
    titles.forEach(title => {
        const words = new Set(extractKeywords(title)); // Unique words per title to avoid spamming
        words.forEach(word => {
            counts[word] = (counts[word] || 0) + 1;
        });
    });

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
}
