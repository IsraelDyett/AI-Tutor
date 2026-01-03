// // app/api/comments/[id]/route.ts
// import { NextResponse, NextRequest } from 'next/server';
// import { db } from '@/lib/db';
// import { managerComments, teamMembers } from '@/lib/db/schema';
// import { getUser } from '@/lib/db/queries';
// import { and, eq } from 'drizzle-orm';

// export async function DELETE(
//     request: NextRequest,
//     context: any // 👈 no type check on params
//   ) {
//     const commentId = parseInt(context.params.id, 10);
  
//     if (isNaN(commentId)) {
//       return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 });
//     }

//   const user = await getUser();
//   if (!user) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//   }

//   // Explicitly query for the user's role
//   const [memberDetails] = await db
//     .select({ role: teamMembers.role })
//     .from(teamMembers)
//     .where(eq(teamMembers.userId, user.id))
//     .limit(1);

//   // Check the role
//   if (!memberDetails || memberDetails.role !== 'owner') {
//     return NextResponse.json({ error: 'Forbidden: Must be an owner to delete comments.' }, { status: 403 });
//   }

//   try {
//     // Delete the comment ONLY if the current user is the author
//     const [deletedComment] = await db.delete(managerComments).where(
//       and(
//         eq(managerComments.id, commentId),
//         eq(managerComments.authorId, user.id)
//       )
//     ).returning();

//     if (!deletedComment) {
//       return NextResponse.json({ error: 'Comment not found or you do not have permission to delete it' }, { status: 404 });
//     }

//     return NextResponse.json({ success: true }, { status: 200 });
//   } catch (error) {
//     console.error('Error deleting comment:', error);
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }



// app/api/comments/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { managerComments, teamMembers } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { and, eq } from 'drizzle-orm';

export async function DELETE(
    request: NextRequest,
    context: any
  ) {
    const { params } = context as { params: { id: string } };
    const commentId = parseInt(params.id, 10);

  if (isNaN(commentId)) {
    return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [memberDetails] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  if (!memberDetails || memberDetails.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden: Must be an owner to delete comments.' }, { status: 403 });
  }

  try {
    const [deletedComment] = await db.delete(managerComments).where(
      and(
        eq(managerComments.id, commentId),
        eq(managerComments.authorId, user.id)
      )
    ).returning();

    if (!deletedComment) {
      return NextResponse.json({ error: 'Comment not found or you do not have permission to delete it' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
