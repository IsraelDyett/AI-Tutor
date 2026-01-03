const pdf = require('pdf-parse');
console.log('Type of pdf:', typeof pdf);
try {
    const buffer = Buffer.alloc(0);
    pdf(buffer).then(() => console.log('OK')).catch(e => console.log('Async Error:', e.message));
} catch (e) {
    console.log('Sync Error:', e.message);
}
