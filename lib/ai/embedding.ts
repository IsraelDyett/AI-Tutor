import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
    throw new Error("AI Embedding Error: API Key missing");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function embedText(text: string): Promise<number[]> {
    try {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text);
        const embedding = result.embedding;
        return embedding.values;
    } catch (error) {
        console.error("Embedding Error:", error);
        throw error;
    }
}
