import { getSubjectContextText } from './app/(dashboard)/actions';

async function test() {
    try {
        console.log('Testing getSubjectContextText for English...');
        const text = await getSubjectContextText('English');
        console.log('Extraction Result Length:', text.length);
        if (text.length > 0) {
            console.log('Snippet:', text.substring(0, 500));
        } else {
            console.log('Warning: No text extracted. Check if files exist in lib/ai/context/english/');
        }
    } catch (e) {
        console.log('Test Error:', e.message);
    }
}
test();
