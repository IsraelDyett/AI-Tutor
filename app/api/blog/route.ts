// File: app/api/blog/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { blogPosts, users } from '@/lib/db/schema';
import { getUserWithTeam } from '@/lib/db/queries'; // Assuming this function exists and is correct
import { desc, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';

// Helper function to create a URL-friendly slug
const slugify = (text: string) => {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-');        // Replace multiple - with single -
};

// API handler to CREATE a new blog post
export async function POST(request: Request) {
  try {
    const sessionCookie = (await cookies()).get('session');
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const sessionData = await verifyToken(sessionCookie.value);
    if (!sessionData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userDetails = await getUserWithTeam(sessionData.user.id);
    
    if (userDetails?.team?.name !== 'BMBEZ' || userDetails?.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, content, thumbnailUrl } = await request.json();
    if (!title || !content || !thumbnailUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const slug = slugify(title);
    const newPost = await db.insert(blogPosts).values({
      title,
      slug,
      content,
      thumbnailUrl,
      authorId: userDetails.user.id,
    }).returning();

    return NextResponse.json({ success: true, post: newPost[0] });
  } catch (error) {
    console.error('Error creating blog post:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// API handler to GET all blog posts (public)
export async function GET() {
  try {
    const posts = await db.select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        thumbnailUrl: blogPosts.thumbnailUrl,
        createdAt: blogPosts.createdAt,
        authorName: users.name,
      })
      .from(blogPosts)
      .leftJoin(users, eq(blogPosts.authorId, users.id))
      .orderBy(desc(blogPosts.createdAt));

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}