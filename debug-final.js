const pdf = require('pdf-parse');
console.log('Keys of pdf:', Object.keys(pdf));
if (typeof pdf === 'function') {
    console.log('pdf is a function');
} else if (pdf.default && typeof pdf.default === 'function') {
    console.log('pdf.default is a function');
} else if (pdf.PDFParse && typeof pdf.PDFParse === 'function') {
    console.log('pdf.PDFParse is a function');
}

// Try to find ANY function that looks like a parser
for (const key in pdf) {
    if (typeof pdf[key] === 'function') {
        console.log(`Key ${key} is a function`);
    }
}
