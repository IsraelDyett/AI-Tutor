// import { GoogleGenerativeAI } from "@google/generative-ai";

// const apiKey = process.env.NEXT_PUBLIC_API_KEY || process.env.GOOGLE_API_KEY;

// if (!apiKey) {
//     throw new Error("AI Embedding Error: API Key missing");
// }

// const genAI = new GoogleGenerativeAI(apiKey);

// export async function embedText(text: string): Promise<number[]> {
//     try {
//         const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
//         const result = await model.embedContent(text);
//         const embedding = result.embedding;
//         return embedding.values;
//     } catch (error) {
//         console.error("Embedding Error:", error);
//         throw error;
//     }
// }

import {
    GoogleGenerativeAI,
    TaskType,
    type EmbedContentRequest,
} from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_API_KEY;

if (!apiKey) {
    throw new Error("AI Embedding Error: API Key missing");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function embedText(text: string, isQuery: boolean = false): Promise<number[]> {
    // text-embedding-004 is the best model, but we MUST cap dimensions at 768
    const MODEL_NAME = "gemini-embedding-001"; 

    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        
        // SDK types omit outputDimensionality; the REST API supports it for text-embedding-004.
        const request: EmbedContentRequest & { outputDimensionality: number } = {
            content: { role: "user", parts: [{ text }] },
            taskType: isQuery ? TaskType.RETRIEVAL_QUERY : TaskType.RETRIEVAL_DOCUMENT,
            outputDimensionality: 768,
        };
        const result = await model.embedContent(request);

        return result.embedding.values;
    } catch (error: any) {
        console.error("Embedding Error:", error);
        throw error;
    }
}