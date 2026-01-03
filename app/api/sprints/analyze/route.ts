import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 10) {
      return NextResponse.json({ error: 'Valid transcript is required.' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fast and cost-effective, or use "gpt-4o" for better quality
      messages: [
        {
          role: "system",
          content: `You are an expert sales manager analyzing coaching session transcripts. 
Output ONLY valid JSON with no additional text, markdown, or code blocks.
The JSON must have this exact structure:
{
  "summary": "string",
  "strengths": ["string", "string"],
  "areasForImprovement": ["string", "string"],
  "performanceScore": number
}`
        },
        {
          role: "user",
          content: `Analyze this sales coaching transcript between a sales rep (user) and AI coach (Orus).

GUIDELINES:
- "summary": Concise paragraph summarizing key takeaways and the user's self-assessment
- "strengths": 2-3 specific strengths or successes the user mentioned
- "areasForImprovement": 2-3 clear, actionable steps for improvement
- "performanceScore": Integer 1-10 assessing sprint performance based on their reflection

TRANSCRIPT:
${transcript}

Return only the JSON object, nothing else.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000,
    });

    const text = completion.choices[0].message.content;
    if (!text) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(text);

    // Validate the response structure
    if (!analysis.summary || !Array.isArray(analysis.strengths) || 
        !Array.isArray(analysis.areasForImprovement) || 
        typeof analysis.performanceScore !== 'number') {
      throw new Error('Invalid analysis structure returned from AI');
    }

    // Ensure performanceScore is within range
    if (analysis.performanceScore < 1 || analysis.performanceScore > 10) {
      analysis.performanceScore = Math.max(1, Math.min(10, analysis.performanceScore));
    }

    return NextResponse.json(analysis);

  } catch (error: any) {
    console.error("Error in /api/sprints/analyze:", error);
    
    const errorMessage = error.message || 'Failed to generate analysis.';
    
    return NextResponse.json({ 
      error: 'Failed to generate analysis.',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}