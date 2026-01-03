// app/api/comments/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { managerComments, teamMembers } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { and, eq } from 'drizzle-orm';

export async function POST(request: Request) {
  // 1. Get the current user
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Now, explicitly query the teamMembers table to find the user's role and team
  const [memberDetails] = await db
    .select({
      role: teamMembers.role,
      teamId: teamMembers.teamId,
    })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  // 3. Check the role from the specific query result
  if (!memberDetails || memberDetails.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden: Must be an owner to comment.' }, { status: 403 });
  }

  try {
    const { transcriptionFileId, content } = await request.json();

    if (!transcriptionFileId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newComment = {
      transcriptionFileId: parseInt(transcriptionFileId),
      content,
      authorId: user.id,
    };

    const [createdComment] = await db.insert(managerComments).values(newComment).returning();

    return NextResponse.json(createdComment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}