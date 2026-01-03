// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db/drizzle';
// import { transcriptionFiles } from '@/lib/db/schema';
// import { eq, inArray } from 'drizzle-orm';
// import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// // Initialize the Google Generative AI Client
// const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_API_KEY || '');//GOOGLE_API_KEY

// // Interface for the structured data expected from the LLM
// interface ITranscriptMetrics {
//   talkToListenRatio: string | null;
//   callDuration: string | null;
//   longestRepMonologue: string | null;
//   questionRate: number | null;
//   objectionCount: number | null;
//   objectionTypeDistribution: Record<string, number> | null;
//   objectionHandlingEffectivenessScore: number | null;
//   speechRateWPM: number | null;
//   fillerWordFrequency: Record<string, number> | null;
//   callPerformanceScore: number | null;
//   strengthsHighlight: string[] | null;
//   areasForImprovement: string[] | null;
// }

// /**
//  * A Next.js API route to analyze completed transcripts using Google's Generative AI.
//  *
//  * This route fetches all records from the 'transcriptionFiles' table with a status of
//  * 'transcript complete'. It then sends the transcript to a Google LLM for analysis
//  * based on a predefined set of sales call metrics. The structured data returned by the
//  * LLM is then used to update the corresponding record in the database.
//  *
//  * @param {NextRequest} request The incoming Next.js API request.
//  * @returns {NextResponse} A JSON response indicating the outcome of the operation.
//  */


// /**
//  * A robustly parses a value into an integer or returns null.
//  * Handles null, undefined, non-numeric strings, etc.
//  * @param val The value to parse.
//  * @returns A number or null.
//  */
// const parseIntOrNull = (val: any): number | null => {
//     if (val === null || val === undefined) {
//       return null;
//     }
//     const num = parseInt(String(val), 10);
//     return isNaN(num) ? null : num;
//   };
  
//   /**
//    * A robustly parses a value into a float or returns null.
//    * @param val The value to parse.
//    * @returns A number or null.
//    */
//   const parseFloatOrNull = (val: any): number | null => {
//     if (val === null || val === undefined) {
//       return null;
//     }
//     const num = parseFloat(String(val));
//     return isNaN(num) ? null : num;
//   };


// export async function GET(request: NextRequest) {
//   const authHeader = request.headers.get('authorization');
//   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//     return new Response('Unauthorized', { status: 401 });
//   }

//   try {
//     const recordsToAnalyze = await db
//       .select()
//       .from(transcriptionFiles)
//       .where(eq(transcriptionFiles.status, 'transcript completed'));

//     if (recordsToAnalyze.length === 0) {
//       return NextResponse.json({ success: true, message: 'No transcripts to analyze.' });
//     }

//     const fileIdsToProcess = recordsToAnalyze.map((file) => file.id);
//     // Optionally, update the status to 'analyzing' to prevent duplicate processing
//     await db
//       .update(transcriptionFiles)
//       .set({ status: 'analytics processing' })
//       .where(inArray(transcriptionFiles.id, fileIdsToProcess));

//     await Promise.all(
//       recordsToAnalyze.map(async (file) => {
//         try {
//           if (!file.transcription) {
//             throw new Error('Transcription is empty.');
//           }

//           const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

//           const generationConfig = {
//             temperature: 0.2,
//             topK: 1,
//             topP: 1,
//             maxOutputTokens: 8192,
//             responseMimeType: 'application/json',
//           };
          
//           const safetySettings = [
//             {
//               category: HarmCategory.HARM_CATEGORY_HARASSMENT,
//               threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
//             },
//             // ... other safety settings
//           ];

//          const prompt = `
//             As a sales call analysis expert, please analyze the following sales call transcript.
//             Your goal is to extract key metrics and provide a structured analysis.

//             Transcript:
//             ---
//             ${file.transcription}
//             ---

//             Please return a valid JSON object with the following structure and data types:
//             {
//               "talkToListenRatio": "string",
//               "callDuration": "string",
//               "longestRepMonologue": "string",
//               "questionRate": "number",
//               "objectionCount": "number",
//               "objectionTypeDistribution": { "price": "number", "timing": "number", "authority": "number", "need": "number", "product fit": "number", "Competitor":"number", "Trust/Credibility":"number", "Status Quo": "number", "Implementation/Effort":"number", "Urgency":"number"},
//               "objectionHandlingEffectivenessScore": "number",
//               "speechRateWPM": "number",
//               "fillerWordFrequency": { "um": "number", "like": "number" },
//               "callPerformanceScore": "number",
//               "strengthsHighlight": ["string"],
//               "areasForImprovement": ["string"]
//             }

//             Ensure all fields are populated based on the transcript analysis. If a metric cannot be determined, use a null value.
//             fillerWordFrequency is An object where keys are the identified filler words (e.g., "um", "uh", "like", "you know", "so", "actually") and values are their frequency. This should dynamically include ALL filler words found, not justlimited to the example list provided.
//             For areasForImprovement Provide specific, actionable areas for improvement. Example: "Could build more rapport at the beginning of the call by asking more open-ended questions about the customer's current situation."
//             Do not repeat the streangthsHighlight in the areasForImprovement.
//             For strengthsHighlight Provide specific, evidence-based strengths from the call. Example: "Effectively handled the price objection by reframing it around value."
//             For talkToListenRatio Calculate this based on the number of sentences the sales agent says vs. the number of sentences the customer says (e.g., "1:1.2").
//             longestRepMonologue is The duration of the longest uninterrupted monologue by the sales representative in MM:SS format.
//             questionRate is The total number of questions asked by the sales representative.
//             objectionCount is The total count of all objections raised by the customer.
            
//             Ensure all fields are populated based on the transcript analysis. If a metric cannot be determined, use a null value.
//             `;

//           const result = await model.generateContent({
//             contents: [{ role: 'user', parts: [{text: prompt}] }],
//             generationConfig,
//             safetySettings,
//           });

//           const responseText = result.response.text();
//           const metrics: ITranscriptMetrics = JSON.parse(responseText);


//           // --- MAIN FIX IS HERE ---
//           // Build a clean, type-safe object for the database.
//           // This prevents errors if the LLM returns "null" as a string.
          
//           // --- MAIN FIX IS HERE ---
//           // Use the robust parsing functions to clean the data from the LLM.
//           const dataToUpdate = {
//             // Strings
//             talkToListenRatio: metrics.talkToListenRatio,
//             callDuration: metrics.callDuration,
//             longestRepMonologue: metrics.longestRepMonologue,
            
//             // Integers: Use the helper function to safely parse.
//             objectionCount: parseIntOrNull(metrics.objectionCount),
//             speechRateWPM: parseIntOrNull(metrics.speechRateWPM),

//             // Decimals: Use the helper, then convert to string for Drizzle if not null.
//             questionRate: String(parseFloatOrNull(metrics.questionRate) ?? ''),
//             objectionHandlingEffectivenessScore: String(parseFloatOrNull(metrics.objectionHandlingEffectivenessScore) ?? ''),
//             callPerformanceScore: String(parseFloatOrNull(metrics.callPerformanceScore) ?? ''),

//             // JSONB and Array types (usually safe)
//             objectionTypeDistribution: metrics.objectionTypeDistribution,
//             fillerWordFrequency: metrics.fillerWordFrequency,
//             strengthsHighlight: metrics.strengthsHighlight,
//             areasForImprovement: metrics.areasForImprovement,

//             // BUG FIX 2: Corrected status to match the enum in your schema ('analysis_complete')
//             status: 'completed' as const,//'analytics completed'
//           };


//           await db
//             .update(transcriptionFiles)
//             .set(dataToUpdate) // Use the new, clean object
//             .where(eq(transcriptionFiles.id, file.id));
//         //   await db
//         //     .update(transcriptionFiles)
//         //     .set({
//         //       ...metrics,
//         //     // Convert numbers for decimal columns to strings, handling nulls.
//         //     questionRate: metrics.questionRate !== null ? String(metrics.questionRate) : null,
//         //     objectionHandlingEffectivenessScore: metrics.objectionHandlingEffectivenessScore !== null ? String(metrics.objectionHandlingEffectivenessScore) : null,
//         //     callPerformanceScore: metrics.callPerformanceScore !== null ? String(metrics.callPerformanceScore) : null,
//         //       status: 'analytics completed',
//         //     })
//         //     .where(eq(transcriptionFiles.id, file.id));


//         } catch (error) {
//           console.error(`Failed to analyze file ID: ${file.id}`, error);

//           let errorMessage = 'An unknown error occurred during analysis.';
//           if (error instanceof Error) {
//             errorMessage = error.message;
//           }
//           console.error('Error in analysis cron job:', errorMessage);
//           await db
//             .update(transcriptionFiles)
//             .set({ status: 'failed'})
//             .where(eq(transcriptionFiles.id, file.id));
//         }
//       })
//     );

//     return NextResponse.json({ success: true, message: `Analyzed ${recordsToAnalyze.length} files.` });

//   } catch (error) {
//     console.error('Error in analysis cron job:', error);
//     return NextResponse.json({ success: false, error: 'Analysis cron job failed.' }, { status: 500 });
//   }
// }





// app/api/analytics/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { transcriptionFiles } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import OpenAI from 'openai';

// Initialize the OpenAI Client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Interface for the structured data expected from the LLM
interface ITranscriptMetrics {
  talkToListenRatio: string | null;
  callDuration: string | null;
  longestRepMonologue: string | null;
  questionRate: number | null;
  objectionCount: number | null;
  objectionTypeDistribution: Record<string, number> | null;
  objectionHandlingEffectivenessScore: number | null;
  speechRateWPM: number | null;
  fillerWordFrequency: Record<string, number> | null;
  callPerformanceScore: number | null;
  strengthsHighlight: string[] | null;
  areasForImprovement: string[] | null;
}

/**
 * A Next.js API route to analyze completed transcripts using OpenAI.
 *
 * This route fetches all records from the 'transcriptionFiles' table with a status of
 * 'transcript completed'. It then sends the transcript to an OpenAI model for analysis
 * based on a predefined set of sales call metrics. The structured data returned by the
 * LLM is then used to update the corresponding record in the database.
 *
 * @param {NextRequest} request The incoming Next.js API request.
 * @returns {NextResponse} A JSON response indicating the outcome of the operation.
 */

/**
 * Robustly parses a value into an integer or returns null.
 * Handles null, undefined, non-numeric strings, etc.
 * @param val The value to parse.
 * @returns A number or null.
 */
const parseIntOrNull = (val: any): number | null => {
    if (val === null || val === undefined) {
      return null;
    }
    const num = parseInt(String(val), 10);
    return isNaN(num) ? null : num;
};

/**
 * Robustly parses a value into a float or returns null.
 * @param val The value to parse.
 * @returns A number or null.
 */
const parseFloatOrNull = (val: any): number | null => {
    if (val === null || val === undefined) {
      return null;
    }
    const num = parseFloat(String(val));
    return isNaN(num) ? null : num;
};


export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const recordsToAnalyze = await db
      .select()
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.status, 'transcript completed'));

    if (recordsToAnalyze.length === 0) {
      return NextResponse.json({ success: true, message: 'No transcripts to analyze.' });
    }

    const fileIdsToProcess = recordsToAnalyze.map((file) => file.id);
    // Update status to 'analytics processing' to prevent duplicate processing
    await db
      .update(transcriptionFiles)
      .set({ status: 'analytics processing' })
      .where(inArray(transcriptionFiles.id, fileIdsToProcess));

    await Promise.all(
      recordsToAnalyze.map(async (file) => {
        try {
          if (!file.transcription) {
            throw new Error('Transcription is empty.');
          }

          const prompt = `
            As a sales call analysis expert, please analyze the following sales call transcript.
            Your goal is to extract key metrics and provide a structured analysis.

            Transcript:
            ---
            ${file.transcription}
            ---

            Please return a valid JSON object with the following structure and data types:
            {
              "talkToListenRatio": "string",
              "callDuration": "string",
              "longestRepMonologue": "string",
              "questionRate": "number",
              "objectionCount": "number",
              "objectionTypeDistribution": { "price": "number", "timing": "number", "authority": "number", "need": "number", "product fit": "number", "Competitor":"number", "Trust/Credibility":"number", "Status Quo": "number", "Implementation/Effort":"number", "Urgency":"number"},
              "objectionHandlingEffectivenessScore": "number",
              "speechRateWPM": "number",
              "fillerWordFrequency": { "um": "number", "like": "number" },
              "callPerformanceScore": "number",
              "strengthsHighlight": ["string"],
              "areasForImprovement": ["string"]
            }

            Ensure all fields are populated based on the transcript analysis. If a metric cannot be determined, use a null value.
            fillerWordFrequency is An object where keys are the identified filler words (e.g., "um", "uh", "like", "you know", "so", "actually") and values are their frequency. This should dynamically include ALL filler words found, not justlimited to the example list provided.
            For areasForImprovement Provide specific, actionable areas for improvement. Example: "Could build more rapport at the beginning of the call by asking more open-ended questions about the customer's current situation."
            Do not repeat the streangthsHighlight in the areasForImprovement.
            For strengthsHighlight Provide specific, evidence-based strengths from the call. Example: "Effectively handled the price objection by reframing it around value."
            For talkToListenRatio Calculate this based on the number of sentences the sales agent says vs. the number of sentences the customer says (e.g., "1:1.2").
            longestRepMonologue is The duration of the longest uninterrupted monologue by the sales representative in MM:SS format.
            questionRate is The total number of questions asked by the sales representative.
            objectionCount is The total count of all objections raised by the customer.
            
            Ensure all fields are populated based on the transcript analysis. If a metric cannot be determined, use a null value.
            `;
          
          const response = await openai.chat.completions.create({
            model: 'gpt-4o', // Or 'gpt-4-turbo'
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 4096,
            response_format: { type: 'json_object' }, // Enable JSON mode
          });

          const responseText = response.choices[0].message.content;
          if (!responseText) {
            throw new Error('Received an empty response from OpenAI.');
          }

          const metrics: ITranscriptMetrics = JSON.parse(responseText);
          
          // Use the robust parsing functions to clean the data from the LLM.
          const dataToUpdate = {
            // Strings
            talkToListenRatio: metrics.talkToListenRatio,
            callDuration: metrics.callDuration,
            longestRepMonologue: metrics.longestRepMonologue,
            
            // Integers: Use the helper function to safely parse.
            objectionCount: parseIntOrNull(metrics.objectionCount),
            speechRateWPM: parseIntOrNull(metrics.speechRateWPM),

            // Decimals: Use the helper, then convert to string for Drizzle if not null.
            questionRate: String(parseFloatOrNull(metrics.questionRate) ?? ''),
            objectionHandlingEffectivenessScore: String(parseFloatOrNull(metrics.objectionHandlingEffectivenessScore) ?? ''),
            callPerformanceScore: String(parseFloatOrNull(metrics.callPerformanceScore) ?? ''),

            // JSONB and Array types
            objectionTypeDistribution: metrics.objectionTypeDistribution,
            fillerWordFrequency: metrics.fillerWordFrequency,
            strengthsHighlight: metrics.strengthsHighlight,
            areasForImprovement: metrics.areasForImprovement,
            
            status: 'completed' as const,
          };

          await db
            .update(transcriptionFiles)
            .set(dataToUpdate)
            .where(eq(transcriptionFiles.id, file.id));

        } catch (error) {
          console.error(`Failed to analyze file ID: ${file.id}`, error);
          await db
            .update(transcriptionFiles)
            .set({ status: 'failed'})
            .where(eq(transcriptionFiles.id, file.id));
        }
      })
    );

    return NextResponse.json({ success: true, message: `Analyzed ${recordsToAnalyze.length} files.` });

  } catch (error) {
    console.error('Error in analysis cron job:', error);
    return NextResponse.json({ success: false, error: 'Analysis cron job failed.' }, { status: 500 });
  }
}