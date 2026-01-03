// app/api/sprints/dashboard/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { salesSprints } from '@/lib/db/schema';
import { and, eq, gte, lte, asc, isNotNull, SQL } from 'drizzle-orm';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { format } from 'date-fns';

type Goal = { metric: string; target: string };
type Outcome = { metric: string; actual: string };

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    const currentTeam = await getTeamForUser();
    if (!user || !currentTeam) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const userIdStr = searchParams.get('userId');

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }
    
    // --- Build Dynamic Query ---
    const conditions: (SQL | undefined)[] = [
      eq(salesSprints.teamId, currentTeam.id),
      gte(salesSprints.endDate, new Date(startDateStr)),
      lte(salesSprints.endDate, new Date(endDateStr)),
      isNotNull(salesSprints.outcomes), // Only include sprints with results
      isNotNull(salesSprints.performanceScore),
    ];

    if (userIdStr && userIdStr !== 'all') {
      const memberId = parseInt(userIdStr, 10);
      if (!isNaN(memberId)) {
        conditions.push(eq(salesSprints.userId, memberId));
      }
    }

    const sprints = await db
      .select({
        performanceScore: salesSprints.performanceScore,
        endDate: salesSprints.endDate,
        goals: salesSprints.goals,
        outcomes: salesSprints.outcomes,
      })
      .from(salesSprints)
      .where(and(...conditions))
      .orderBy(asc(salesSprints.endDate));

    if (sprints.length === 0) {
        return NextResponse.json({ performanceOverTime: [], goalVsOutcome: [] });
    }

    // --- Process Data for Charts ---

    // 1. Performance Score Over Time
    const performanceOverTime = sprints.map(sprint => ({
      date: format(new Date(sprint.endDate), 'MMM d'),
      Score: parseFloat(sprint.performanceScore!),
    }));

    // 2. Aggregated Goals vs. Outcomes
    const aggregatedMetrics: { [key: string]: { metric: string; totalGoal: number; totalOutcome: number } } = {};

    sprints.forEach(sprint => {
        const goals = sprint.goals as Goal[];
        const outcomes = sprint.outcomes as Outcome[];
        const outcomeMap = new Map(outcomes.map(o => [o.metric, parseFloat(o.actual)]));

        goals.forEach(goal => {
            const goalValue = parseFloat(goal.target);
            const outcomeValue = outcomeMap.get(goal.metric);
            
            if (!isNaN(goalValue) && outcomeValue !== undefined && !isNaN(outcomeValue)) {
                if (!aggregatedMetrics[goal.metric]) {
                    aggregatedMetrics[goal.metric] = { metric: goal.metric, totalGoal: 0, totalOutcome: 0 };
                }
                aggregatedMetrics[goal.metric].totalGoal += goalValue;
                aggregatedMetrics[goal.metric].totalOutcome += outcomeValue;
            }
        });
    });

    const goalVsOutcome = Object.values(aggregatedMetrics);

    return NextResponse.json({ performanceOverTime, goalVsOutcome });

  } catch (error) {
    console.error('Error fetching sprint dashboard data:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}