const pdf = require('pdf-parse');
for (const key in pdf) {
    if (typeof pdf[key] === 'function') {
        console.log(`Key ${key} is a function`);
    }
}
