const { PDFParse } = require('pdf-parse');
console.log('Type of PDFParse:', typeof PDFParse);
if (typeof PDFParse === 'function') {
    const buffer = Buffer.alloc(0);
    PDFParse(buffer).then(() => console.log('OK')).catch(e => console.log('Async Error:', e.message));
}
