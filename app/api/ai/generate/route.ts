import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const apiKey = process.env.NEXT_PUBLIC_API_KEY || process.env.GOOGLE_API_KEY;
        // Fallback to GOOGLE_API_KEY just in case, but user said .env has key.

        if (!apiKey) {
            console.error("AI Generation Error: API Key missing");
            return NextResponse.json(
                { error: "Server misconfiguration: API Key missing" },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = "gemini-2.5-flash";
        const model = genAI.getGenerativeModel({ model: modelName });
        console.log("Using Gemini Model:", modelName);

        // --- Usage Tracking ---
        const { getUser } = require("@/lib/db/queries");
        const { getTeamIdForUser, isFeatureAllowed, incrementFeatureUsage } = require("@/lib/db/usage");

        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const teamId = await getTeamIdForUser(user.id);
        if (!teamId) {
            return NextResponse.json({ error: "No team found" }, { status: 403 });
        }

        const body = await req.json();
        const { type, topic, subject, count = 5, files = [] } = body;

        const feature = type === 'flashcards' ? 'flashcards' : 'pastPapers';
        const check = await isFeatureAllowed(teamId, feature);

        if (!check.allowed) {
            return NextResponse.json({ error: check.error }, { status: 403 });
        }
        // --- End Usage Tracking ---

        console.log(`Generating ${type} for ${subject}/${topic} with ${files.length} user files`);

        if (!topic || !subject) {
            return NextResponse.json(
                { error: "Topic and Subject are required" },
                { status: 400 }
            );
        }

        const parts: any[] = [];
        let fileContextText = "";

        // --- Load Subject-Specific Context (Syllabus, Past Papers, etc.) ---
        const { getSubjectContext } = require("@/lib/ai/context-manager");
        const subjectFiles = await getSubjectContext(subject);

        if (subjectFiles.length > 0) {
            console.log(`Adding ${subjectFiles.length} context files for ${subject}`);
            const mammoth = require("mammoth");
            for (const file of subjectFiles) {
                if (file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                    try {
                        const buffer = Buffer.from(file.data, "base64");
                        const result = await mammoth.extractRawText({ buffer });
                        fileContextText += `\n\n--- Content from ${file.name} (SUBJECT CONTEXT) ---\n${result.value}`;
                    } catch (err) {
                        console.error(`Failed to parse subject context docx ${file.name}:`, err);
                    }
                } else {
                    parts.push({
                        inlineData: {
                            mimeType: file.mimeType,
                            data: file.data
                        }
                    });
                }
            }
        }
        // --- End Subject Context ---

        // Process user-uploaded files
        if (files && Array.isArray(files)) {
            const mammoth = require("mammoth");

            for (const file of files) {
                const { name, type: mimeType, data } = file;

                if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                    try {
                        // Word Document: Extract text
                        const buffer = Buffer.from(data, "base64");
                        const result = await mammoth.extractRawText({ buffer });
                        fileContextText += `\n\n--- Content from ${name} ---\n${result.value}`;
                    } catch (err) {
                        console.error(`Failed to parse docx ${name}:`, err);
                    }
                } else {
                    // Images or PDF: Send to Gemini as inline data
                    // Gemini supports: image/png, image/jpeg, image/webp, image/heic, image/heif, application/pdf
                    parts.push({
                        inlineData: {
                            mimeType: mimeType,
                            data: data
                        }
                    });
                }
            }
        }

        let prompt = "";
        let contextInstruction = "";

        if (fileContextText || parts.length > 0) {
            contextInstruction = "Use the provided files and text content as the PRIMARY context and source material for generating the content below. Ensure the generated content is relevant to these notes.";
        }

        if (type === 'flashcards') {
            prompt = `
                You are an expert tutor for ${subject}. 
                ${contextInstruction}
                ${fileContextText}
                
                Create ${count} flashcards for the topic "${topic}".
                Return ONLY a valid JSON array of objects. 
                Each object must have "front" (question/concept) and "back" (answer/definition).
                Keep answers concise.
                Example format: [{"front": "Question?", "back": "Answer"}]
                Do not include markdown formatting like \`\`\`json.
            `;
        } else if (type === 'questions') {
            prompt = `
                You are an expert tutor for ${subject}.
                ${contextInstruction}
                ${fileContextText}

                Create ${count} practice questions for the topic "${topic}" similar to CXC past paper questions.
                Return ONLY a valid JSON array of objects.
                Each object must have "year" (hypothetical or typical year), "question" (text), and "answer" (correct model answer).
                Example format: [{"year": "2023", "question": "...", "answer": "..."}]
                Do not include markdown formatting like \`\`\`json.
            `;
        } else {
            return NextResponse.json({ error: "Invalid generation type" }, { status: 400 });
        }

        // Add prompt as text part
        parts.push({ text: prompt });

        try {
            const result = await model.generateContent(parts);
            const response = await result.response;
            let text = response.text();

            // Clean up if markdown was included despite instructions
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            const data = JSON.parse(text);

            // Increment usage upon successful generation
            await incrementFeatureUsage(teamId, feature);

            return NextResponse.json(data);
        } catch (genError: any) {
            console.error("Gemini Generation Error Detailed:", JSON.stringify(genError, Object.getOwnPropertyNames(genError)));
            console.error("Gemini Generation Error Message:", genError.message);
            return NextResponse.json(
                { error: "Failed to generate content", details: genError.message },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error("API Route Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
}
