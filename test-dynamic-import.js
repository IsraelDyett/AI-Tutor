async function test() {
    try {
        const pdf = (await import('pdf-parse')).default;
        console.log('Type of imported pdf:', typeof pdf);
    } catch (e) {
        console.log('Error:', e.message);
    }
}
test();
