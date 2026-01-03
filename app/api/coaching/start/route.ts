// app/api/coaching/start/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teamUsage, plans } from '@/lib/db/schema';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { eq, sql } from 'drizzle-orm';


export async function POST() {
  try {
    // --- 1. Authenticate and get the user's team ---
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ success: false, error: 'User is not part of a team.' }, { status: 400 });
    }
    if (!team.planName) {
      return NextResponse.json({ success: false, error: 'Team does not have an active plan.' }, { status: 400 });
    }

      // --- 2. Get the coaching call limit from the team's plan in the DB (FIXED QUERY) ---
      const planResult = await db
      .select({
        // Explicitly select the column we need and give it an alias
        limit: plans.coaching_calls_limit,
      })
      .from(plans)
      .where(eq(plans.name, team.planName))
      .limit(1); // We only need the first result

    // The db.select().limit(1) returns an array, so we check if it's empty
    if (planResult.length === 0) {
      // This is an important check for data integrity
      return NextResponse.json({ success: false, error: `Invalid plan configured for your team.` }, { status: 400 });
    }
    
    // The limit is now dynamically pulled from the database
    const maxCoachingCalls = planResult[0].limit;


    // --- 2. Check the current usage against the limit ---
    //const maxCoachingCalls = parseInt(process.env.MAX_COACHING_CALLS_LIMIT || '100'); // Get limit from .env

    const currentUsage = await db.query.teamUsage.findFirst({
        where: eq(teamUsage.teamId, team.id),
    });

    // Block the action if the team has reached its coaching call limit
    if (currentUsage && currentUsage.coachingCallsUsed >= maxCoachingCalls) {
        return NextResponse.json(
            { success: false, error: 'Your team has reached its monthly limit for live coaching calls.' },
            { status: 403 } // 403 Forbidden is the correct status code for a limit reached
        );
    }
    
    // --- 3. Atomically update the usage count ---
    const newCoachingCallCountExpr = sql`${teamUsage.coachingCallsUsed} + 1`;
    await db
      .update(teamUsage)
      .set({
        coachingCallsUsed: newCoachingCallCountExpr,
        isCoachingCallLimitReached: sql`${newCoachingCallCountExpr} >= ${maxCoachingCalls}`,
        updatedAt: new Date()
      })
      .where(eq(teamUsage.teamId, team.id));

    // --- 4. Return a success response ---
    return NextResponse.json({ success: true, message: 'Coaching session approved.' });

  } catch (error) {
    console.error('Error starting coaching session:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred.' },
      { status: 500 }
    );
  }
}