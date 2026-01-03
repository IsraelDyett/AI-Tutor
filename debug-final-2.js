async function test() {
    try {
        const { PDFParse } = await import('pdf-parse');
        console.log('PDFParse is', typeof PDFParse);
        // Sometimes these are static methods
        if (typeof PDFParse.parse === 'function') {
            console.log('Found static parse method');
        } else {
            console.log('No static parse method');
            // Check for other static methods
            console.log('Static keys:', Object.keys(PDFParse));
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}
test();
