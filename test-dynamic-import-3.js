async function test() {
    try {
        const { PDFParse } = await import('pdf-parse');
        // Let's see how PDFParse constructor is defined
        console.log('PDFParse string:', PDFParse.toString());
    } catch (e) {
        console.log('Error:', e.message);
    }
}
test();
