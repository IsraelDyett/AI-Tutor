async function test() {
    try {
        console.log('Testing import from pdfjs-dist/legacy/build/pdf.mjs');
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        console.log('Keys:', Object.keys(pdfjs));
        if (pdfjs.getDocument) {
            console.log('Success: getDocument found');
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}
test();
