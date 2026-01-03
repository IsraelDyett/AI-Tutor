const { PDFParse } = require('pdf-parse');
console.log('Static methods on PDFParse:');
Object.getOwnPropertyNames(PDFParse).forEach(prop => {
    if (typeof PDFParse[prop] === 'function') {
        console.log(`- ${prop}`);
    }
});

console.log('\nInstance methods on PDFParse:');
Object.getOwnPropertyNames(PDFParse.prototype).forEach(prop => {
    if (typeof PDFParse.prototype[prop] === 'function') {
        console.log(`- ${prop}`);
    }
});
