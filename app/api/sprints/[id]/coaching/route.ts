// /app/api/sprints/[id]/coaching/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { salesSprints } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

// Define the expected structure of the incoming request body from the coaching session
type CoachingAnalysisPayload = {
    summary: string;
    strengths: string[];
    areasForImprovement: string[];
    performanceScore: string;
};

/**
 * PUT handler to update a sprint with the results of an AI coaching session.
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    const sprintId = parseInt(params.id, 10);

    // Use the same authorization and validation logic as your other route
    if (!user || isNaN(sprintId)) {
      return new NextResponse('Unauthorized or Invalid ID', { status: 401 });
    }

    const body: CoachingAnalysisPayload = await request.json();

    // Validate that the payload from the frontend contains all the necessary analysis data
    if (!body.summary || !body.strengths || !body.areasForImprovement || body.performanceScore === undefined) {
        return NextResponse.json({ error: 'Invalid payload. All analysis fields are required.' }, { status: 400 });
    }

    // Update the specific sprint record in the database with the new analysis fields
    const [updatedSprint] = await db
      .update(salesSprints)
      .set({
        summary: body.summary,
        strengths: body.strengths,
        areasForImprovement: body.areasForImprovement,
        performanceScore: body.performanceScore,
        updatedAt: new Date(), // Always good to update the timestamp
      })
      .where(and(eq(salesSprints.id, sprintId), eq(salesSprints.userId, user.id)))
      .returning();

    if (!updatedSprint) {
      return new NextResponse('Sprint not found or user not authorized', { status: 404 });
    }

    return NextResponse.json(updatedSprint);
    
  } catch (error) {
    console.error('[SPRINT_COACHING_UPDATE_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
