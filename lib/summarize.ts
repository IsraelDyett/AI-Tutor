// import { GoogleGenerativeAI } from "@google/generative-ai";

// // Define the structure for a transcript entry, matching the one in CoachingSession
// type TranscriptEntry = {
//   speaker: 'user' | 'ai';
//   text: string;
// };

// // Initialize the Gemini AI client.
// // Ensure your API key is in a .env.local file as NEXT_PUBLIC_API_KEY="YOUR_KEY"
// const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_API_KEY!);

// /**
//  * Formats the transcript array into a single, human-readable string.
//  * @param transcript The array of conversation entries.
//  * @returns A formatted string.
//  */
// function formatTranscript(transcript: TranscriptEntry[]): string {
//   return transcript
//     .map(entry => `${entry.speaker.toUpperCase()}: ${entry.text}`)
//     .join('\n\n');
// }

// /**
//  * Sends the complete transcript to the Gemini API to be summarized.
//  * @param transcript The array of conversation entries.
//  * @returns A promise that resolves to the formatted summary as an HTML string.
//  */
// export async function summarizeConversation(transcript: TranscriptEntry[]): Promise<string> {
//   if (transcript.length === 0) {
//     return "<h3>No conversation was recorded.</h3>";
//   }

//   // Use a powerful text model for this task
//   const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//   const formattedTranscript = formatTranscript(transcript);

//   const prompt = `
//     You are an expert sales manager tasked with summarizing a coaching session between a sales representative (USER) and an AI Sales coach (AI).
//     Based on the following transcript, create a concise, actionable summary.

//     The summary MUST include the following sections with these exact headings:
//     1.  **Key Discussion Points:** A bulleted list of the main topics that were covered.
//     2.  **Action Items for the Rep:** A numbered list of clear, actionable steps the representative should take to improve.
//     3.  **Overall Assessment:** A brief paragraph summarizing the representative's performance and the session's outcome.

//     Format the entire output using Markdown.

//     ---
//     TRANSCRIPT:
//     ${formattedTranscript}
//     ---

//     Now, provide the structured summary based on the requirements.
//   `;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     let text = response.text();

//     // Basic markdown-to-HTML conversion for safe display
//     text = text
//       .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
//       .replace(/\n\s*-\s/g, '<li>') // Bullets
//       .replace(/<\/li><li>/g, '</li><li>')
//       .replace(/(<li>.*)/g, '<ul>$1</ul>')
//       .replace(/<\/ul>(\s*)<ul>/g, '')
//       .replace(/\n\s*\d+\.\s/g, '<li>') // Numbered lists
//       .replace(/(<li>.*)/g, '<ol>$1</ol>')
//       .replace(/<\/ol>(\s*)<ol>/g, '')
//       .replace(/\n/g, '<br />'); // Newlines
    
//     return text;

//   } catch (error) {
//     console.error("Error generating summary:", error);
//     throw new Error("Failed to connect with the summarization service.");
//   }
// }















// // lib/summarize.ts

// import { GoogleGenerativeAI } from "@google/generative-ai";

// type TranscriptEntry = {
//   speaker: 'user' | 'ai';
//   text: string;
// };

// // Define the structure for the analysis we expect from the AI
// export type CoachingAnalysis = {
//     summary: string;
//     strengths: string[];
//     areasForImprovement: string[];
//     performanceScore: number;
// };

// const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

// function formatTranscript(transcript: TranscriptEntry[]): string {
//   return transcript
//     .map(entry => `${entry.speaker.toUpperCase()}: ${entry.text}`)
//     .join('\n\n');
// }

// /**
//  * Sends the conversation transcript to the Gemini API for structured analysis.
//  * @param transcript The array of conversation entries.
//  * @returns A promise that resolves to a structured CoachingAnalysis object.
//  */
// export async function summarizeAndAnalyzeConversation(transcript: TranscriptEntry[]): Promise<CoachingAnalysis> {
//   if (transcript.length < 2) {
//     // Return a default or error state if the conversation is too short
//     return {
//         summary: "No meaningful conversation was recorded.",
//         strengths: [],
//         areasForImprovement: ["Hold a longer coaching session to generate an analysis."],
//         performanceScore: 0,
//     };
//   }
  
//   // Instruct the model to return a JSON object
//   const model = genAI.getGenerativeModel({ 
//     model: "gemini-1.5-flash",
//     generationConfig: {
//       responseMimeType: "application/json",
//     },
//   });

//   const formattedTranscript = formatTranscript(transcript);

//   const prompt = `
//     You are an expert sales manager. Your task is to analyze the following coaching session transcript between a sales representative (USER) and an AI Sales coach (AI).
//     Based on the conversation, provide a structured analysis.

//     The analysis MUST be a JSON object that strictly follows this format:
//     {
//       "summary": "A concise paragraph summarizing the key takeaways and overall sentiment of the conversation.",
//       "strengths": ["A list of 2-3 specific strengths or successes the user mentioned.", "Example: Proactively identified and overcame a key customer objection."],
//       "areasForImprovement": ["A list of 2-3 clear, actionable steps the user should take to improve.", "Example: Should practice asking more open-ended discovery questions."],
//       "performanceScore": A single integer between 1 and 10 representing your assessment of the user's performance during the sprint, based on their self-reflection in the conversation.
//     }

//     ---
//     TRANSCRIPT:
//     ${formattedTranscript}
//     ---

//     Now, provide the structured JSON analysis.
//   `;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     const text = response.text();

//     // The response text should be a valid JSON string
//     const analysis: CoachingAnalysis = JSON.parse(text);
//     return analysis;

//   } catch (error) {
//     console.error("Error generating structured analysis:", error);
//     throw new Error("Failed to generate analysis from the conversation.");
//   }
// }














// // lib/summarize.ts

// import { GoogleGenerativeAI } from "@google/generative-ai";

// type TranscriptEntry = {
//   speaker: 'user' | 'ai';
//   text: string;
// };

// // Define the structure for the analysis we expect from the AI
// export type CoachingAnalysis = {
//     summary: string;
//     strengths: string[];
//     areasForImprovement: string[];
//     performanceScore: number;
// };

// // Ensure you are using the correct API key variable from your environment
// const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_API_KEY!);

// function formatTranscript(transcript: TranscriptEntry[]): string {
//   return transcript
//     .map(entry => `${entry.speaker.toUpperCase()}: ${entry.text}`)
//     .join('\n\n');
// }

// /**
//  * Sends the conversation transcript to the Gemini API for structured analysis.
//  * @param transcript The array of conversation entries.
//  * @returns A promise that resolves to a structured CoachingAnalysis object.
//  */
// export async function summarizeAndAnalyzeConversation(transcript: TranscriptEntry[]): Promise<CoachingAnalysis> {
//   if (transcript.length < 2) {
//     return {
//         summary: "No meaningful conversation was recorded.",
//         strengths: [],
//         areasForImprovement: ["Hold a longer coaching session to generate an analysis."],
//         performanceScore: 0,
//     };
//   }
  
//   const model = genAI.getGenerativeModel({ 
//     model: "gemini-1.5-flash",
//     generationConfig: {
//       responseMimeType: "application/json",
//     },
//   });

//   const formattedTranscript = formatTranscript(transcript);

//   // --- FIX: Improved the prompt for clarity and reliability ---
//   const prompt = `
//     You are an expert sales manager. Your task is to analyze the following coaching session transcript between a sales representative (USER) and an AI Sales coach (AI).
//     Based on the conversation, provide a structured analysis.

//     The output MUST be a single, valid JSON object that strictly follows this format:
//     {
//       "summary": "string",
//       "strengths": ["string"],
//       "areasForImprovement": ["string"],
//       "performanceScore": number
//     }

//     GUIDELINES for the JSON content:
//     - "summary": Write a concise paragraph summarizing the key takeaways and overall sentiment of the conversation.
//     - "strengths": Provide a list of 2-3 specific strengths or successes the user mentioned (e.g., "Proactively identified and overcame a key customer objection.").
//     - "areasForImprovement": Provide a list of 2-3 clear, actionable steps the user should take to improve (e.g., "Practice asking more open-ended discovery questions.").
//     - "performanceScore": Provide a single integer between 1 and 10, assessing the user's performance during the sprint based on their self-reflection in the conversation.

//     ---
//     TRANSCRIPT:
//     ${formattedTranscript}
//     ---

//     Now, provide only the structured JSON analysis. Do not include any other text or markdown formatting.
//   `;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     const text = response.text();

//     const analysis: CoachingAnalysis = JSON.parse(text);
//     return analysis;

//   } catch (error) {
//     console.error("Error generating structured analysis:", error);
//     throw new Error("Failed to generate analysis from the conversation.");
//   }
// }







// lib/summarize.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

// This type is still useful for defining the output structure
export type CoachingAnalysis = {
    summary: string;
    strengths: string[];
    areasForImprovement: string[];
    performanceScore: number;
};

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_API_KEY!);

/**
 * Sends a raw conversation transcript to the Gemini API for diarization and structured analysis.
 * @param rawTranscript The raw text transcript from Whisper.
 * @returns A promise that resolves to a structured CoachingAnalysis object.
 */
export async function summarizeAndAnalyzeConversation(rawTranscript: string): Promise<CoachingAnalysis> {
  if (!rawTranscript || rawTranscript.trim().length < 10) {
    return {
        summary: "No meaningful conversation was recorded.",
        strengths: [],
        areasForImprovement: ["Hold a longer coaching session to generate an analysis."],
        performanceScore: 0,
    };
  }
  
  // Use the base model name here, as the full config will be provided below.
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    You are an expert sales manager. Your task is to analyze the following sales coaching session transcript. The transcript is raw text from a transcription service. The conversation is between a sales representative (the user) and an AI Sales coach named Orus.

    Based on the conversation, provide a structured analysis. The user's statements reflect on their past performance.

    The output MUST be a single, valid JSON object that strictly follows this format:
    {
      "summary": "string",
      "strengths": ["string"],
      "areasForImprovement": ["string"],
      "performanceScore": number
    }

    GUIDELINES for the JSON content:
    - First, mentally distinguish between the speakers. Orus (the AI) asks questions, and the user provides answers about their performance.
    - "summary": Write a concise paragraph summarizing the key takeaways and the user's self-assessment from the conversation.
    - "strengths": Provide a list of 2-3 specific strengths or successes the user mentioned.
    - "areasForImprovement": Provide a list of 2-3 clear, actionable steps the user should take to improve based on their reflections.
    - "performanceScore": Provide a single integer between 1 and 10, assessing the user's performance during the sprint based on their self-reflection in the conversation.

    ---
    RAW TRANSCRIPT:
    ${rawTranscript}
    ---

    Now, provide only the structured JSON analysis. Do not include any other text or markdown formatting.
  `;

  try {
    // --- FIX: Use the full, structured request object, mirroring your working API route ---
    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
        },
        // Safety settings are optional but good practice
        // safetySettings: [...] 
    });

    const response = result.response;
    const text = response.text();

    const analysis: CoachingAnalysis = JSON.parse(text);
    return analysis;

  } catch (error) {
    console.error("Error generating structured analysis:", error);
    throw new Error("Failed to generate analysis from the conversation.");
  }
}