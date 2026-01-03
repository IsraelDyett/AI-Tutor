// import { NextResponse } from 'next/server';
// import { db } from '@/lib/db/drizzle'; // Corrected Path
// import { transcriptionFiles } from '@/lib/db/schema';
// import { eq } from 'drizzle-orm';
// import { getTeamForUser } from '@/lib/db/queries'; // Corrected Path

// export async function GET() {
//   try {
//     const team = await getTeamForUser();
//     if (!team) {
//       return new NextResponse('Team not found', { status: 404 });
//     }

//     const files = await db
//       .select()
//       .from(transcriptionFiles)
//       .where(eq(transcriptionFiles.teamId, team.id));

//     return NextResponse.json(files);
//   } catch (error) {
//     console.error('Error fetching team files:', error);
//     return new NextResponse('Internal Server Error', { status: 500 });
//   }
// }

// /api/team/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser } from '@/lib/db/queries';
import { teams } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // getTeamForUser() should ideally return the basic team information.
    // If it already returns the full team object, you can adapt the following.
    const currentTeam = await getTeamForUser();

    if (!currentTeam) {
      return new NextResponse('Team not found', { status: 404 });
    }

    // Use Drizzle's relational query to fetch the team with its members and their user info.
    const teamWithMembers = await db.query.teams.findFirst({
      where: eq(teams.id, currentTeam.id),
      with: {
        teamMembers: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!teamWithMembers) {
      return new NextResponse('Team not found', { status: 404 });
    }

    return NextResponse.json(teamWithMembers);
  } catch (error) {
    console.error('Error fetching team data:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}