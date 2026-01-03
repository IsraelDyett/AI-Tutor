import pdf from 'pdf-parse';
console.log('Type of default import:', typeof pdf);
if (typeof pdf === 'function') {
    console.log('Success! pdf is a function');
} else {
    console.log('Keys of pdf:', Object.keys(pdf));
}
