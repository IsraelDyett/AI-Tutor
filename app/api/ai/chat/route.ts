//app\api\ai\chat\route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchOfficialPastPapers } from "@/app/(dashboard)/actions";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const apiKey = process.env.NEXT_PUBLIC_API_KEY || process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "Server misconfiguration: API Key missing" },
                { status: 500 }
            );
        }

        const body = await req.json();
        const { messages, context, subject, level, topicId } = body;
        // messages: { role: 'user' | 'model', content: string, files?: [] }[]
        // context: string (the serialized flashcards/questions + system prompt)

        // --- Vector Similarity Search (RAG) ---
        let ragContextText = "";
        const lastMessage = messages[messages.length - 1];
        let officialPaperContext = "";
        if (subject && level && lastMessage.content) {
            try {
                const officialResults = await searchOfficialPastPapers(subject, level, lastMessage.content);
                if (officialResults && officialResults.length > 0) {
                    officialPaperContext = "\n\n--- RELEVANT OFFICIAL PAST PAPER RECORDS ---\n" +
                        officialResults.map(p => (
                            `[ID: ${p.id} | Year: ${p.year} | Q#: ${p.questionNumber} | Topic: ${p.topicTag}]\n` +
                            `Question (HTML): ${p.questionHtml}\n` +
                            `Model Answer (HTML): ${p.answerHtml}\n` +
                            `Explanation/Working: ${p.workingHtml || "N/A"}\n`
                        )).join("\n---\n");
                }
            } catch (err) {
                console.error("Official Paper Search Error:", err);
            }
        }

        if (topicId) {
            try {
                const { searchResources, getTopics } = require("@/app/(dashboard)/actions");
                let searchIds: number[] = [];

                if (topicId === 'all') {
                    const accessibleTopics = await getTopics(subject, level);
                    searchIds = accessibleTopics.map((t: any) => t.id);
                } else {
                    const id = parseInt(topicId);
                    if (!isNaN(id)) searchIds = [id];
                }

                if (searchIds.length > 0) {
                    const searchResults = await searchResources(lastMessage.content, searchIds);
                    if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
                        ragContextText = "\n\n--- Relevant Knowledge Base Chunks ---\n" +
                            searchResults.map((r: any) => r.content).join("\n\n");
                    }
                }
            } catch (ragError) {
                console.error("RAG Search Error in Chat API:", ragError);
            }
        }

        // --- Load Subject-Specific Context (Syllabus, Past Papers, etc.) ---
        let backgroundContextText = "";
        const contextParts: any[] = [];

        if (subject) {
            const { getSubjectContext } = require("@/lib/ai/context-manager");
            const subjectFiles = await getSubjectContext(subject, level);

            if (subjectFiles.length > 0) {
                console.log(`Adding ${subjectFiles.length} context files for subject: ${subject}`);
                const mammoth = require("mammoth");
                for (const file of subjectFiles) {
                    if (file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                        try {
                            const buffer = Buffer.from(file.data, "base64");
                            const result = await mammoth.extractRawText({ buffer });
                            backgroundContextText += `\n\n--- Content from ${file.name} (SUBJECT CONTEXT) ---\n${result.value}`;
                        } catch (err) {
                            console.error(`Failed to parse subject context docx ${file.name}:`, err);
                        }
                    } else if (file.mimeType === "text/plain") {
                        const text = Buffer.from(file.data, "base64").toString('utf-8');
                        backgroundContextText += `\n\n--- Content from ${file.name} ---\n${text}`;
                    } else {
                        // For chat PDF/Images, we'll append to the prompt instruction for now or inject in history
                        // Actually, systemInstruction works best for "fixed" knowledge.
                        // But if it's a PDF, we might want it in the first message.
                        contextParts.push({
                            inlineData: {
                                mimeType: file.mimeType,
                                data: file.data
                            }
                        });
                    }
                }
            }
        }
        // --- End Subject Context ---

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: "Messages array is required" },
                { status: 400 }
            );
        }


        const fs = require('fs');
        const path = require('path');
        let levelSpecificInstructions = "";
        try {
            const promptPath = path.join(process.cwd(), 'lib', 'ai', 'prompts', `${(level || 'CSEC').toUpperCase()}.txt`);
            if (fs.existsSync(promptPath)) {
                levelSpecificInstructions = fs.readFileSync(promptPath, 'utf8');
            }
        } catch (err) {
            console.error("Failed to load level-specific prompt:", err);
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = "gemini-2.5-flash";
        const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: `
                ${levelSpecificInstructions || process.env.TUTOR_SYSTEM_INSTRUCTION}
                
                ${context} 
                ${backgroundContextText} 
                ${ragContextText} 
                ${officialPaperContext}

                CRITICAL INSTRUCTION:
                If the user asks for a past paper question or an example from a specific year, check the 'OFFICIAL PAST PAPER RECORDS' section above. 
                If the records are present, output them using the exact HTML provided. 
                If they are not present, do your best to explain the concepts using your internal knowledge.
            `
        });

        const previousMessages = messages.slice(0, -1);
        let history: any[] = [];

        // Find the first user message index
        const firstUserIndex = previousMessages.findIndex((m: any) => m.role === 'user');

        if (firstUserIndex !== -1) {
            history = previousMessages.slice(firstUserIndex).map((msg: any, idx: number) => {
                const parts: any[] = [{ text: msg.content }];
                // If this is the first user message and we have context files, inject them
                if (idx === 0) {
                    parts.push(...contextParts);
                }
                return {
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts
                };
            });
        }

        // The last message is the new one (User's)
        const newParts: any[] = [{ text: lastMessage.content }];

        // If there was no history (this is the first user message), we might need to inject contextParts here
        if (history.length === 0) {
            newParts.push(...contextParts);
        }

        // Check for files in the last message
        if (lastMessage.files && Array.isArray(lastMessage.files)) {
            for (const file of lastMessage.files) {
                // file: { name, type, data (base64) }
                // We don't support docx extracting here to keep it simple, or reused logic?
                // Let's stick to images/PDF for now as requested.
                newParts.push({
                    inlineData: {
                        mimeType: file.type,
                        data: file.data
                    }
                });
            }
        }

        const chat = model.startChat({
            history: history,
        });

        const result = await chat.sendMessage(newParts);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ reply: text });

    } catch (error: any) {
        console.error("Chat API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
}
