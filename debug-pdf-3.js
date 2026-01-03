let pdf = require('pdf-parse');
console.log('Type:', typeof pdf);
if (typeof pdf !== 'function') {
    console.log('Keys if not function:', Object.keys(pdf));
}
if (typeof pdf !== 'function' && pdf.default) {
    pdf = pdf.default;
    console.log('Type after .default:', typeof pdf);
}
