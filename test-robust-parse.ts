async function test() {
    try {
        const fileModule = await import('pdf-parse');
        console.log('Module keys:', Object.keys(fileModule));

        let parseFn = null;
        if (typeof fileModule === 'function') parseFn = fileModule;
        else if (fileModule.default && typeof fileModule.default === 'function') parseFn = fileModule.default;
        else if (fileModule.PDFParse && typeof fileModule.PDFParse.parse === 'function') parseFn = fileModule.PDFParse.parse;
        else if (fileModule.pdf && typeof fileModule.pdf === 'function') parseFn = fileModule.pdf;

        if (parseFn) {
            console.log('Found parsing function!');
        } else {
            console.log('Could not find parsing function.');
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}
test();
