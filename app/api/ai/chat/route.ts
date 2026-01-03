import { GoogleGenerativeAI } from "@google/generative-ai";
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
        const { messages, context, subject } = body;
        // messages: { role: 'user' | 'model', content: string, files?: [] }[]
        // context: string (the serialized flashcards/questions + system prompt)

        // --- Load Subject-Specific Context (Syllabus, Past Papers, etc.) ---
        let backgroundContextText = "";
        const contextParts: any[] = [];

        if (subject) {
            const { getSubjectContext } = require("@/lib/ai/context-manager");
            const subjectFiles = await getSubjectContext(subject);

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


        const systemInstructions = process.env.TUTOR_SYSTEM_INSTRUCTION;
        console.log("System Instruction:", systemInstructions);
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = "gemini-2.5-flash";
        const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemInstructions + "\n\n" + context + "\n\n" + backgroundContextText
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
        const lastMessage = messages[messages.length - 1];
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
