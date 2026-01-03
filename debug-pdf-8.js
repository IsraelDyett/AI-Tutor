const { PDFParse } = require('pdf-parse');
console.log('PDFParse keys:', Object.keys(PDFParse));
console.log('PDFParse prototype keys:', Object.keys(PDFParse.prototype));

async function test() {
    try {
        // Try as class if static parse doesn't exist
        const parser = new PDFParse();
        console.log('Parser instance keys:', Object.keys(parser));
        // Some libraries use .parse() or similar
        // Let's check for likely names
        const methods = ['parse', 'load', 'getText', 'process'];
        for (const m of methods) {
            if (typeof parser[m] === 'function') console.log(`Found method: ${m}`);
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}
test();
