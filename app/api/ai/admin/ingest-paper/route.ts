// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { NextResponse } from "next/server";
// import { db } from "@/lib/db/drizzle";
// import { actualPastPaperQuestions } from "@/lib/db/schema";
// import { embedText } from "@/lib/ai/embedding"; 

// export const maxDuration = 60; 


// export async function POST(req: Request) {
//   try {
//     const { pdfData, subject, level, year } = await req.json();

//     if (!pdfData || !subject || !level || !year) {
//       return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
//     }

//     const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
//     // Using 1.5-flash for speed and high context window for PDFs
//     const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

//     const prompt = `
//       You are an expert curriculum digitizer. I am providing a PDF of a ${level} ${subject} past paper from the year ${year}.
      
//       TASK:
//       Extract every question from this PDF and format it into a JSON array matching the database schema below.
      
//       SCHEMA:
//       - section: integer (1, 2, or 3)
//       - questionNumber: integer
//       - marks: integer
//       - markingType: "K" | "A" | "R" (Look at the "K", "A", "R" markers or total boxes in the PDF)
//       - topicTag: Short category (e.g., "Fractions", "Time", "Geometry")
//       - topicDescription: A brief description of the topic that is being covered in the paper.
//       - questionHtml: The question text. 
//         - IMPORTANT: Use HTML for formatting. 
//         - For fractions, use: <span style="display: inline-block; vertical-align: middle; text-align: center;"><span style="display: block; border-bottom: 1px solid black;">Numerator</span><span>Denominator</span></span>
//         - For tables, use standard <table> tags with borders.
//         - Use <b> for bold text.
//       - answerHtml: Provide the correct model answer in the same HTML style.
//       - workingHtml: Provide a step-by-step calculation string in HTML.

//       RETURN FORMAT:
//       Return ONLY a valid JSON array. Do not include markdown formatting or backticks.
//       Example: [{"section": 1, "questionNumber": 1, ...}]
//     `;

//     // Process PDF as inlineData
//     const result = await model.generateContent([
//       {
//         inlineData: {
//           mimeType: "application/pdf",
//           data: pdfData, // Base64 string from client
//         },
//       },
//       { text: prompt },
//     ]);

//     const response = await result.response;
//     let text = response.text();
    
//     // Clean JSON string
//     text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
//     const questions = JSON.parse(text);

//     // Add metadata and insert into DB
//     const recordsToInsert = questions.map((q: any) => ({
//       ...q,
//       subject,
//       level,
//       year: parseInt(year),
//       createdAt: new Date(),
//     }));

//     // Batch insert using Drizzle
//     await db.insert(actualPastPaperQuestions).values(recordsToInsert);

//     const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
//     const host = req.headers.get('host');
    
//     // Added /admin/ to the path to match your folder structure
//     fetch(`${protocol}://${host}/api/ai/admin/embed-actual-papers`, {
//         method: 'POST',
//     }).catch(err => console.error("Background trigger failed:", err));

//     return NextResponse.json({ 
//       success: true, 
//       count: recordsToInsert.length 
//     });

//   } catch (error: any) {
//     console.error("Ingestion Error:", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }


import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/drizzle";
import { actualPastPaperQuestions } from "@/lib/db/schema";

export const maxDuration = 300; 

export async function POST(req: Request) {
  try {
    const { pdfData, subject, level, year } = await req.json();

    if (!pdfData || !subject || !level || !year) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    // Initialize the Generative AI client
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use gemini-1.5-flash (Ensure no trailing spaces or version typos)
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

    const prompt = `
      Extract every question from this PDF (${level} ${subject} ${year}).
      Return a JSON array ONLY. Use \\n for newlines.
      
      TASK:
       Extract every question from this PDF and format it into a JSON array matching the database schema below.
      
      SCHEMA:
       - section: integer (1, 2, or 3)
       - questionNumber: integer
       - marks: integer
       - markingType: "K" | "A" | "R" (Look at the "K", "A", "R" markers or total boxes in the PDF)
       - topicTag: Short category (e.g., "Fractions", "Time", "Geometry")
       - topicDescription: A brief description of the topic that is being covered in the paper.
       - questionHtml: The question text. 
         - IMPORTANT: Use HTML for formatting. 
         - For fractions, use: <span style="display: inline-block; vertical-align: middle; text-align: center;"><span style="display: block; border-bottom: 1px solid black;">Numerator</span><span>Denominator</span></span>
         - For tables, use standard <table> tags with borders.
         - Use <b> for bold text.
       - answerHtml: Provide the correct model answer in the same HTML style.
       - workingHtml: Provide a step-by-step calculation string in HTML.
    `;

    // FIX: Corrected object structure to remove syntax errors
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfData,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    let text = response.text();
    
    // 1. Strip Markdown blocks
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // 2. Sanitize Control Characters (Fix for the JSON Parsing Error)
    // This removes literal newlines and tabs inside strings that break JSON.parse
    const sanitizedText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
        if (match === '\n') return '\\n';
        if (match === '\r') return '\\r';
        if (match === '\t') return '\\t';
        return '';
    });

    let questions;
    try {
        questions = JSON.parse(sanitizedText);
    } catch (parseError) {
        // Fallback: Aggressive cleanup if standard sanitization fails
        const aggressiveCleanup = text.replace(/\r?\n|\r/g, " ");
        questions = JSON.parse(aggressiveCleanup);
    }

    // 3. Prepare records
    const recordsToInsert = questions.map((q: any) => ({
      ...q,
      subject,
      level,
      year: parseInt(year),
      createdAt: new Date(),
    }));

    // 4. Batch Insert
    await db.insert(actualPastPaperQuestions).values(recordsToInsert);

    // 5. Trigger Background Worker
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = req.headers.get('host');
    
    fetch(`${protocol}://${host}/api/ai/admin/embed-actual-papers`, {
        method: 'POST',
    }).catch(err => console.error("Background trigger failed:", err));

    return NextResponse.json({ 
      success: true, 
      count: recordsToInsert.length 
    });

  } catch (error: any) {
    console.error("Ingestion Error Detailed:", error);
    
    // Improved error feedback
    const isModelError = error.message?.includes("404") || error.message?.includes("not found");
    const errorMessage = isModelError 
        ? "AI Model connection failed (404). Please ensure your API key is valid and has access to Gemini 1.5 Flash." 
        : error.message;

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}