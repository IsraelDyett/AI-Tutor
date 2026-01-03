async function test() {
    try {
        const m = await import('pdf-parse');
        console.log('Keys:', Object.keys(m));
        for (const k of Object.keys(m)) {
            console.log(`Key: ${k}, Type: ${typeof m[k]}`);
        }
        if (m.default) {
            console.log('Default type:', typeof m.default);
            console.log('Default keys:', Object.keys(m.default));
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}
test();
