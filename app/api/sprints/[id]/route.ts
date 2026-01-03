// // // app/api/sprints/[id]/route.ts

// import { NextResponse, NextRequest } from 'next/server';
// import { db } from '@/lib/db/drizzle';
// import { salesSprints } from '@/lib/db/schema';
// import { and, eq } from 'drizzle-orm';
// import { getTeamForUser, getUser } from '@/lib/db/queries';


// // GET handler for a single sprint
// export async function GET(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const user = await getUser();
//     const sprintId = parseInt(params.id, 10);

//     if (!user || isNaN(sprintId)) {
//       return new NextResponse('Unauthorized or Invalid ID', { status: 401 });
//     }

//     const sprint = await db.query.salesSprints.findFirst({
//       where: and(eq(salesSprints.id, sprintId), eq(salesSprints.userId, user.id)),
//       // You can expand this to include comments later if needed
//       // with: { comments: { with: { author: true } } }
//     });

//     if (!sprint) {
//       return new NextResponse('Sprint not found', { status: 404 });
//     }

//     return NextResponse.json(sprint);
//   } catch (error) {
//     console.error('Error fetching sprint:', error);
//     return new NextResponse('Internal Server Error', { status: 500 });
//   }
// }


// // PUT handler to update a sprint with outcomes
// export async function PUT(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const user = await getUser();
//     const sprintId = parseInt(params.id, 10);

//     if (!user || isNaN(sprintId)) {
//       return new NextResponse('Unauthorized or Invalid ID', { status: 401 });
//     }

//     const body = await request.json();
//     const { outcomes } = body;

//     if (!outcomes) {
//       return NextResponse.json({ error: 'Outcomes are required.' }, { status: 400 });
//     }

//     const [updatedSprint] = await db
//       .update(salesSprints)
//       .set({
//         outcomes,
//         updatedAt: new Date(),
//       })
//       .where(and(eq(salesSprints.id, sprintId), eq(salesSprints.userId, user.id)))
//       .returning();

//     if (!updatedSprint) {
//         return new NextResponse('Sprint not found or user not authorized', { status: 404 });
//     }
    

//     return NextResponse.json(updatedSprint);
//   } catch (error) {
//     console.error('Error updating sprint:', error);
//     return new NextResponse('Internal Server Error', { status: 500 });
//   }
// }


import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { salesSprints } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

interface RouteContext {
  params: Promise<{ id: string }>; // Updated to Promise
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params; // Await params before accessing properties
    const sprintId = parseInt(id, 10);
    if (isNaN(sprintId)) {
      return new NextResponse('Invalid ID', { status: 400 });
    }

    const user = await getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const sprint = await db.query.salesSprints.findFirst({
      where: and(eq(salesSprints.id, sprintId), eq(salesSprints.userId, user.id)),
    });

    if (!sprint) {
      return new NextResponse('Sprint not found', { status: 404 });
    }

    return NextResponse.json(sprint);
  } catch (error) {
    console.error('Error fetching sprint:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params; // Await params before accessing properties
    const sprintId = parseInt(id, 10);
    if (isNaN(sprintId)) {
        return new NextResponse('Invalid ID', { status: 400 });
    }
    
    const user = await getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { outcomes } = body;

    if (!outcomes) {
      return NextResponse.json({ error: 'Outcomes are required.' }, { status: 400 });
    }

    const [updatedSprint] = await db
      .update(salesSprints)
      .set({
        outcomes,
        updatedAt: new Date(),
      })
      .where(and(eq(salesSprints.id, sprintId), eq(salesSprints.userId, user.id)))
      .returning();

    if (!updatedSprint) {
        return new NextResponse('Sprint not found or user not authorized', { status: 404 });
    }
    
    return NextResponse.json(updatedSprint);
  } catch (error) {
    console.error('Error updating sprint:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}