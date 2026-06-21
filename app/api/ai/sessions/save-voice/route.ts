// app/api/sessions/save-voice/route.ts
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
    const {
      topicId,
      durationSeconds,
      topicsIntroduced = [],
      topicsConfirmed = [],
      studentMisconceptions = [],
      lastSummary = '',
    } = data;

    let understandingScore: number | null = null;
    let feedbackSummary: string | null = null;

    if (lastSummary && lastSummary.trim().length > 20) {
      try {
        const apiKey = process.env.NEXT_PUBLIC_API_KEY || process.env.GOOGLE_API_KEY || '';
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent(`
You are an educational assessment engine. Output ONLY valid JSON, no markdown.

Lesson Summary: "${lastSummary}"
Topics Introduced: ${topicsIntroduced.join(', ') || 'None'}
Topics Confirmed: ${topicsConfirmed.join(', ') || 'None'}
Misconceptions: ${studentMisconceptions.join(', ') || 'None'}

Return: {"score": <0-100>, "feedback": "<2-3 sentences>"}
        `);

        const text = result.response.text().replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(text);
        understandingScore = Math.min(100, Math.max(0, Number(parsed.score) || 0));
        feedbackSummary = String(parsed.feedback || '');
      } catch {
        // Fallback to ratio
      }
    }

    if (understandingScore === null) {
      const introduced = topicsIntroduced.length;
      const confirmed = topicsConfirmed.length;
      if (introduced === 0) {
        understandingScore = durationSeconds > 60 ? 40 : 20;
        feedbackSummary = 'Session recorded without topic tracking.';
      } else {
        const ratio = confirmed / introduced;
        const penalty = Math.min(20, studentMisconceptions.length * 5);
        understandingScore = Math.max(0, Math.round(ratio * 100) - penalty);
        feedbackSummary = confirmed === introduced
          ? `Good session — confirmed all ${confirmed} topic(s).`
          : `Confirmed ${confirmed} of ${introduced} topic(s). Review remaining topics next session.`;
      }
    }

    await db.insert(studySessions).values({
      userId: user.id,
      topicId: topicId ?? undefined,
      durationSeconds,
      understandingScore,
      feedbackSummary,
      startedAt: new Date(Date.now() - (durationSeconds * 1000)),
      endedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[save-voice beacon] Error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}