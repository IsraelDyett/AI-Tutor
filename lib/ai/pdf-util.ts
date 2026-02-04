// lib/ai/pdf-util.ts
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Extracts text from a PDF buffer using pdfjs-dist.
 * Uses an absolute file URL for the worker to ensure compatibility with Next.js/Turbopack on Windows.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    if (!buffer || buffer.length === 0) {
        return "";
    }

    try {
        // Use the legacy builds which are more compatible with Node/Next.js
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

        // Explicitly set the worker source to the physical file path using a file:// URL
        // This resolves the "fake worker" error in bundled environments like Turbopack
        const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
        (pdfjs as any).GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();

        const loadingTask = pdfjs.getDocument({
            data: new Uint8Array(buffer),
            useSystemFonts: true,
            isEvalSupported: false,
            verbosity: 0
        });

        const pdf = await loadingTask.promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = (textContent.items as any[])
                .map((item) => item.str)
                .join(" ");
            fullText += pageText + "\n";
            await (page as any).cleanup();
        }

        await pdf.destroy();
        return fullText;
    } catch (error: any) {
        console.error("[PDF-UTIL] PDF Extraction Error:", error.message);
        return "[Error extracting text from PDF]";
    }
}
