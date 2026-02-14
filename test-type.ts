async function test() {
    try {
        const m = (await import('pdf-parse')) as { default?: unknown };
        console.log('Is module function?', typeof m === 'function');
        console.log('Is default function?', typeof m.default === 'function');
    } catch (e) {
        console.log('Error:', e instanceof Error ? e.message : String(e));
    }
}
test();
