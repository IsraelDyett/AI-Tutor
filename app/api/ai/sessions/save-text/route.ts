// app/api/sessions/save-text/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { studySessions } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const { topicId, topicName, subject, messages = [] } = data;

    const numericTopicId = topicId === 'all' || isNaN(parseInt(topicId))
      ? undefined
      : parseInt(topicId);

    const meaningfulMessages = messages.filter((m: any) => m.content?.trim().length > 10);
    const durationEstimateSeconds = Math.max(60, meaningfulMessages.length * 30);

    if (meaningfulMessages.length < 3) {
      return NextResponse.json({ skipped: true });
    }

    let understandingScore: number | null = null;
    let feedbackSummary: string | null = null;

    try {
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || process.env.GOOGLE_API_KEY || '';
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const transcript = meaningfulMessages
        .map((m: any) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
        .join('\n')
        .slice(0, 3000);

      const result = await model.generateContent(`
You are an educational assessment engine. Output ONLY valid JSON, no markdown.

Subject: ${subject}
Topic: ${topicName}

Transcript:
${transcript}

Return: {"score": <0-100>, "feedback": "<2-3 sentences for the student>"}
      `);

      const text = result.response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(text);
      understandingScore = Math.min(100, Math.max(0, Number(parsed.score) || 0));
      feedbackSummary = String(parsed.feedback || '');
    } catch {
      understandingScore = Math.min(100, meaningfulMessages.length * 5);
      feedbackSummary = 'Session recorded.';
    }

    await db.insert(studySessions).values({
      userId: user.id,
      topicId: numericTopicId,
      durationSeconds: durationEstimateSeconds,
      understandingScore,
      feedbackSummary,
      startedAt: new Date(Date.now() - (durationEstimateSeconds * 1000)),
      endedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[save-text beacon] Error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}