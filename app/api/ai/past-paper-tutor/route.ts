import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { questionData, history } = await req.json();

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const systemPrompt = `
            You are a "Past Paper Specialist Tutor". Your sole focus is helping a student understand THIS specific exam question.

            EXAM CONTEXT:
            - Topic: ${questionData.topicTag}
            - Question Content: ${questionData.questionHtml}
            - Model Answer: ${questionData.answerHtml}
            - Detailed Working: ${questionData.workingHtml || "None provided"}

            YOUR GUIDELINES:
            1. Use the provided context to explain the logic of the answer.
            2. If the student asks a question, relate your explanation to the topic "${questionData.topicTag}".
            3. Use simple analogies appropriate for their level (${questionData.level}).
            4. Keep responses brief (1-3 sentences) to maintain a conversation.
            5. You may use <b> and <i> HTML tags for emphasis.
            6. If the student is stuck, don't just give them a new answer; ask them a leading question to help them figure it out.
        `;

        const chat = model.startChat({
            history: history.slice(0, -1).map((msg: any) => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }],
            })),
        });

        const userQuery = history[history.length - 1].content;
        const result = await chat.sendMessage(`${systemPrompt}\n\nStudent Query: ${userQuery}`);
        const text = result.response.text();

        return NextResponse.json({ text });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}