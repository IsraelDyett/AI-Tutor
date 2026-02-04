export interface ChunkOptions {
    maxChunkSize?: number;
    chunkOverlap?: number;
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
    const { maxChunkSize = 1000, chunkOverlap = 200 } = options;

    if (text.length <= maxChunkSize) {
        return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        let end = start + maxChunkSize;

        if (end < text.length) {
            // Try to find a good breaking point (newline or period)
            const nextNewline = text.lastIndexOf('\n', end);
            const nextPeriod = text.lastIndexOf('. ', end);

            const breakPoint = Math.max(nextNewline, nextPeriod);

            if (breakPoint > start + (maxChunkSize / 2)) {
                end = breakPoint + 1;
            }
        }

        chunks.push(text.slice(start, end).trim());
        start = end - chunkOverlap;

        if (start < 0) start = 0;
        if (end >= text.length) break;
    }

    return chunks.filter(c => c.length > 0);
}
