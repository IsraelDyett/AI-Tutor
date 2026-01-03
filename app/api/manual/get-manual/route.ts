import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { teams } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTeamForUser } from '@/lib/db/queries';


export async function GET() {
  try {
    // getTeam() authenticates the user and ensures they belong to a team.
    // This is perfect because we want any team member to have access.
    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch only the sales manual for the user's team
    const result = await db
      .select({
        salesManual: teams.salesManual,
      })
      .from(teams)
      .where(eq(teams.id, team.id))
      .limit(1);

    const manual = result[0];

    // Check if a manual exists and has content
    if (!manual || !manual.salesManual) {
      return NextResponse.json(
        { error: 'No sales manual has been uploaded for this team.' },
        { status: 404 }
      );
    }

    // Send the manual text back to the client
    return NextResponse.json({ manualText: manual.salesManual });

  } catch (error) {
    console.error('Failed to fetch sales manual:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}