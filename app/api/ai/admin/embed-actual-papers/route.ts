import { db } from "@/lib/db/drizzle";
import { actualPastPaperQuestions } from "@/lib/db/schema";
import { isNull, eq } from "drizzle-orm";
import { embedText } from "@/lib/ai/embedding";
import { NextResponse } from "next/server";

export const maxDuration = 300; 

export async function POST(request: Request) {
  try {
    const pendingQuestions = await db
      .select()
      .from(actualPastPaperQuestions)
      .where(isNull(actualPastPaperQuestions.questionEmbedding));

    if (pendingQuestions.length === 0) {
      return NextResponse.json({ message: "No pending embeddings found." });
    }

    console.log(`Background: Processing ${pendingQuestions.length} embeddings...`);

    let successCount = 0;

    for (const q of pendingQuestions) {
      try {
        const cleanText = (q.questionHtml ?? "").replace(/<[^>]*>/g, "");
        const sourceText = `${q.topicTag || ""} ${q.topicDescription || ""} ${cleanText}`;

        const vector = await embedText(sourceText, false);

        await db.update(actualPastPaperQuestions)
          .set({ questionEmbedding: vector })
          .where(eq(actualPastPaperQuestions.id, q.id));
        
        successCount++;
      } catch (err) {
        console.error(`Failed to embed question ${q.id}:`, err);
      }
    }

    return NextResponse.json({ 
        success: true, 
        processed: successCount,
        total: pendingQuestions.length 
    });
  } catch (error: any) {
    console.error("Background Embedding API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}