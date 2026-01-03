async function test() {
    try {
        const pdf = await import('pdf-parse');
        console.log('Keys:', Object.keys(pdf));
        if (pdf.PDFParse) console.log('Found PDFParse!');
    } catch (e) {
        console.log('Error:', e.message);
    }
}
test();
