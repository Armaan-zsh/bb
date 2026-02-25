export function linkifyAcademic(html: string): string {
    if (!html) return '';

    // Find arXiv IDs (e.g., arXiv:2109.01134 or arxiv:2109.01134v2)
    let processed = html.replace(
        /\b(arXiv:\d{4}\.\d{4,5}(v\d)?)\b/gi,
        '<a href="https://arxiv.org/abs/$1" target="_blank" class="ghost-citation">[$1]</a>'
    );

    // Find DOIs (e.g., 10.1038/s41586-020-2649-2)
    // DOI regex is tricky; this is a solid standard matcher for modern DOIs
    processed = processed.replace(
        /\b(10.\d{4,9}\/[-._;()/:A-Z0-9]+)\b/gi,
        '<a href="https://doi.org/$1" target="_blank" class="ghost-citation">[DOI]</a>'
    );

    return processed;
}
