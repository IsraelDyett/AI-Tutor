try {
    const pdf = require('pdf-parse/lib/pdf-parse');
    console.log('Type of pdf-parse/lib/pdf-parse:', typeof pdf);
} catch (e) {
    console.log('Error requiring lib:', e.message);
}
