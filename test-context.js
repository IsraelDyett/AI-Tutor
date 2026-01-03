const { getSubjectContext } = require('./lib/ai/context-manager');
const path = require('path');

async function test() {
    console.log("Testing Subject Context Loading...");
    const subject = "English";
    try {
        const files = await getSubjectContext(subject);
        console.log(`Found ${files.length} files for ${subject}.`);
        files.forEach(f => {
            console.log(`- Name: ${f.name}`);
            console.log(`- MimeType: ${f.mimeType}`);
            console.log(`- Data size: ${Math.round(f.data.length / 1024)} KB`);
        });

        if (files.length > 0) {
            console.log("\n✅ SUCCESS: Context files found and loaded.");
        } else {
            console.log("\n❌ FAILED: No context files found.");
        }
    } catch (err) {
        console.error("Test Error:", err);
    }
}

test();
