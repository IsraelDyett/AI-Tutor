// app/api/sprints/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { salesSprints } from '@/lib/db/schema';
import { and, eq, lte, desc } from 'drizzle-orm';
import { getTeamForUser, getUser } from '@/lib/db/queries';


// GET handler to fetch sprints
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    const currentTeam = await getTeamForUser();
    if (!user || !currentTeam) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    const sprints = await db
      .select({
        id: salesSprints.id,
        sprintName: salesSprints.sprintName,
        performanceScore: salesSprints.performanceScore,
        summary: salesSprints.summary,
        endDate: salesSprints.endDate,
      })
      .from(salesSprints)
      .where(
        and(
          eq(salesSprints.userId, user.id),
          lte(salesSprints.endDate, new Date(endDate))
        )
      )
      .orderBy(desc(salesSprints.endDate))
      .limit(limit);

    return NextResponse.json(sprints);
  } catch (error) {
    console.error('Error fetching sprints:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}


// POST handler to create a new sprint
export async function POST(request: NextRequest) {
  try {
    const user = await  getUser();
    const currentTeam = await getTeamForUser();
    if (!user || !currentTeam) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { sprintName, startDate, endDate, goals } = body;

    if (!sprintName || !startDate || !endDate || !goals) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const [newSprint] = await db
      .insert(salesSprints)
      .values({
        sprintName,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        goals,
        userId: user.id,
        teamId: currentTeam.id,
      })
      .returning();

    return NextResponse.json(newSprint, { status: 201 });
  } catch (error) {
    console.error('Error creating sprint:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}