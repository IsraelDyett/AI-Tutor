// app/api/team/analytics/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { transcriptionFiles } from '@/lib/db/schema';
import { and, eq, gte, lte, SQL  } from 'drizzle-orm';
import { getTeamForUser } from '@/lib/db/queries';

// Helper function to safely parse numbers
const parseAndValidateNumber = (val: any): number | null => {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

// Helper function to average ratio strings like "40:60"
const averageRatio = (ratios: (string | null | undefined)[]): string => {
  const validRatios = ratios.filter((r): r is string => !!r && r.includes(':'));
  if (validRatios.length === 0) return 'N/A';

  let totalLeft = 0;
  let totalRight = 0;

  validRatios.forEach(ratio => {
    const parts = ratio.split(':').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      totalLeft += parts[0];
      totalRight += parts[1];
    }
  });

  const count = validRatios.length;
  const avgLeft = Math.round(totalLeft / count);
  const avgRight = Math.round(totalRight / count);

  return `${avgLeft}:${avgRight}`;
};


export async function GET(request: NextRequest) {
  try {
    const team = await getTeamForUser();
    if (!team) {
      return new NextResponse('Unauthorized or no team found for user', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const userIdStr = searchParams.get('userId'); 
 

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    // Set the time to the end of the day for the end date
    endDate.setHours(23, 59, 59, 999);


    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    
    // // Fetch all completed transcriptions within the date range for the user's team
    // const files = await db
    //   .select()
    //   .from(transcriptionFiles)
    //   .where(
    //     and(
    //       eq(transcriptionFiles.teamId, team.id),
    //       eq(transcriptionFiles.status, 'completed'),
    //       gte(transcriptionFiles.createdAt, startDate),
    //       lte(transcriptionFiles.createdAt, endDate)
    //     )
    //   );

    
    // --- Start of The Fix: Build a dynamic query ---
    const conditions: (SQL | undefined)[] = [
        eq(transcriptionFiles.teamId, team.id),
        eq(transcriptionFiles.status, 'completed'),
        gte(transcriptionFiles.createdAt, startDate),
        lte(transcriptionFiles.createdAt, endDate),
    ];

    if (userIdStr && userIdStr !== 'all') {
        const userId = parseInt(userIdStr, 10);
        if (!isNaN(userId)) {
            conditions.push(eq(transcriptionFiles.userId, userId));
        }
    }

    const files = await db
      .select()
      .from(transcriptionFiles)
      .where(and(...conditions));
    // --- End of The Fix ---

    if (files.length === 0) {
        return NextResponse.json({
            message: 'No transcriptions found for the given criteria.',
            transcriptionCount: 0,
          });    }

    // --- Start Aggregation Logic ---

    const aggregatedData = {
      objectionTypeDistribution: {} as { [key: string]: number },
      fillerWordFrequency: {} as { [key: string]: number },
      strengthsHighlight: [] as string[],
      areasForImprovement: [] as string[],
      totalCallPerformanceScore: 0,
      totalObjectionCount: 0,
      validPerformanceScores: 0,
      validObjectionCounts: 0,
      ratios: [] as string[],
    };

    files.forEach(file => {
      // Aggregate Objection Distribution
      if (file.objectionTypeDistribution && typeof file.objectionTypeDistribution === 'object') {
        for (const [key, value] of Object.entries(file.objectionTypeDistribution)) {
            if (typeof value === 'number') {
                aggregatedData.objectionTypeDistribution[key] = (aggregatedData.objectionTypeDistribution[key] || 0) + value;
            }
        }
      }

      // Aggregate Filler Word Frequency
      if (file.fillerWordFrequency && typeof file.fillerWordFrequency === 'object') {
        for (const [key, value] of Object.entries(file.fillerWordFrequency)) {
            if (typeof value === 'number') {
                aggregatedData.fillerWordFrequency[key] = (aggregatedData.fillerWordFrequency[key] || 0) + value;
            }
        }
      }
      
      // Aggregate lists
      if (file.strengthsHighlight) {
        aggregatedData.strengthsHighlight.push(...file.strengthsHighlight);
      }
      if (file.areasForImprovement) {
        aggregatedData.areasForImprovement.push(...file.areasForImprovement);
      }
      
      // Sum scores and counts for averaging
      const performanceScore = parseAndValidateNumber(file.callPerformanceScore);
      if (performanceScore !== null) {
          aggregatedData.totalCallPerformanceScore += performanceScore;
          aggregatedData.validPerformanceScores++;
      }

      const objectionCount = parseAndValidateNumber(file.objectionCount);
      if (objectionCount !== null) {
        aggregatedData.totalObjectionCount += objectionCount;
        aggregatedData.validObjectionCounts++;
      }

      if (file.talkToListenRatio) {
        aggregatedData.ratios.push(file.talkToListenRatio);
      }
    });
    
    // --- Calculate Averages ---
    const averageCallPerformanceScore = aggregatedData.validPerformanceScores > 0
      ? (aggregatedData.totalCallPerformanceScore / aggregatedData.validPerformanceScores).toFixed(2)
      : 'N/A';

    const averageObjectionCount = aggregatedData.validObjectionCounts > 0
      ? (aggregatedData.totalObjectionCount / aggregatedData.validObjectionCounts).toFixed(2)
      : 'N/A';
      
    const averageTalkToListenRatio = averageRatio(aggregatedData.ratios);

    // --- Final Response ---
    const response = {
        objectionTypeDistribution: aggregatedData.objectionTypeDistribution,
        fillerWordFrequency: aggregatedData.fillerWordFrequency,
        strengthsHighlight: [...new Set(aggregatedData.strengthsHighlight)], // Remove duplicates
        areasForImprovement: [...new Set(aggregatedData.areasForImprovement)], // Remove duplicates
        averageCallPerformanceScore,
        averageObjectionCount,
        averageTalkToListenRatio,
        transcriptionCount: files.length,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching team analytics:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}