// lib/ai/pdf-util.ts
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
        const data = new Uint8Array(buffer);
        const loadingTask = pdfjs.getDocument({
            data,
            useSystemFonts: true,
            disableFontFace: true,
        });
        const pdf = await loadingTask.promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(" ");
            fullText += pageText + "\n";
        }

        return fullText;
    } catch (error) {
        console.error("Error extracting text from PDF:", error);
        return "[Error extracting text from PDF]";
    }
}
