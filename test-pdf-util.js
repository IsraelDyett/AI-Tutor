const { extractTextFromPDF } = require('./lib/ai/pdf-util');
const fs = require('fs');
const path = require('path');

async function test() {
    const filePath = path.join(__dirname, 'lib', 'ai', 'context', 'english', 'CSEC® English A Past Papers_2009-2016.pdf');
    if (!fs.existsSync(filePath)) {
        console.log('File not found');
        return;
    }
    const buffer = fs.readFileSync(filePath);
    try {
        console.log('Starting extraction...');
        const text = await extractTextFromPDF(buffer);
        console.log('Extraction complete!');
        console.log('Length:', text.length);
        console.log('Snippet:', text.substring(0, 200));
    } catch (e) {
        console.log('Test Error:', e.message);
    }
}
test();
