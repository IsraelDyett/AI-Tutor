const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function test() {
    const filePath = path.join(__dirname, 'lib', 'ai', 'context', 'english', 'CSEC® English A Past Papers_2009-2016.pdf');
    if (!fs.existsSync(filePath)) {
        console.log('File not found at', filePath);
        return;
    }
    const buffer = fs.readFileSync(filePath);
    try {
        const data = await PDFParse(buffer);
        console.log('Keys of result:', Object.keys(data));
        console.log('Text length:', data.text?.length);
        console.log('Snippet:', data.text?.substring(0, 100));
    } catch (e) {
        console.log('Error:', e.message);
    }
}
test();
