// app/api/simulations/analyze/route.ts

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// Define the expected structure for the analysis
type SimulationAnalysis = {
    summary: string;
    strengths: string[];
    areasForImprovement: string[];
    performanceScore: number;
};

// Initialize the OpenAI client for Whisper transcription
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize the Google AI client for analysis
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);

const analysisPrompt = `
    You are an expert sales manager and coach named "AurahSell". Your task is to analyze a sales call simulation transcript.
    The user was the sales representative, and the AI was the customer.
    You will be provided with the full transcript and the company's sales manual that the rep was supposed to be using.

    Your mission is to provide concise, actionable, and constructive feedback.
    
    Analyze the transcript based on the principles in the sales manual and general best practices. Evaluate the rep's performance in the following areas:
    1.  Opening and Rapport Building
    2.  Needs Discovery and Questioning
    3.  Pitch and Value Proposition
    4.  Objection Handling
    5.  Closing and Next Steps

    Based on your analysis, you MUST respond with a JSON object in the following format, and nothing else. Do not wrap it in markdown backticks.

    {
      "summary": "A brief, one-paragraph summary of the overall call performance.",
      "strengths": [
        "A bullet point describing a key strength, with a specific example from the transcript.",
        "Another bullet point for a different strength.",
        "A third bullet point for another strength."
      ],
      "areasForImprovement": [
        "A bullet point describing a key area for improvement, explaining WHY it's important and suggesting what to do differently, citing the manual if applicable.",
        "Another bullet point for a different area of improvement.",
        "A third bullet point for another area of improvement."
      ],
      "performanceScore": "An integer score from 1 to 10 evaluating the overall performance."
    }
`;

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File | null;
        const manual = formData.get('manual') as string | null;

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 });
        }
        if (!process.env.OPENAI_API_KEY || !process.env.GOOGLE_API_KEY) {
            return NextResponse.json({ error: 'API keys are not configured on the server.' }, { status: 500 });
        }

        // 1. Transcribe the audio using Whisper
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
        });

        const transcriptText = transcription.text;

        if (!transcriptText || transcriptText.length < 10) {
             return NextResponse.json({ error: 'Transcription failed or produced empty text.' }, { status: 500 });
        }

        // 2. Analyze the transcript using Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
        
        const fullPrompt = `
            ${analysisPrompt}

            ### Sales Manual for Context ###
            ---
            ${manual || "No manual was provided."}
            ---

            ### Sales Call Transcript to Analyze ###
            ---
            ${transcriptText}
            ---
        `;

        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();
        
        // Parse the JSON response from the model
        const analysis: SimulationAnalysis = JSON.parse(responseText);

        return NextResponse.json(analysis);

    } catch (error: any) {
        console.error('Error in simulation analysis route:', error);
        // Provide a more specific error if possible
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
        return NextResponse.json({ error: `An unexpected error occurred: ${errorMessage}` }, { status: 500 });
    }
}