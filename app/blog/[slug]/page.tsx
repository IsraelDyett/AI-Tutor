// File: app/blog/[slug]/page.tsx
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/drizzle';
import { blogPosts, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns';

async function getPost(slug: string) {
  const result = await db.select({
      title: blogPosts.title,
      content: blogPosts.content,
      thumbnailUrl: blogPosts.thumbnailUrl,
      createdAt: blogPosts.createdAt,
      authorName: users.name,
    }).from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .where(eq(blogPosts.slug, slug))
    .limit(1);
  return result[0];
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  return (
    <main className="bg-gray-900 text-gray-100">
      <div className="container mx-auto max-w-3xl py-24 px-4">
        <article>
          <p className="text-base font-semibold text-orange-500 tracking-wider uppercase">AurahSell Blog</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">{post.title}</h1>
          <p className="text-gray-400 mt-6 mb-8">
            Posted by {post.authorName || 'Staff'} on {format(new Date(post.createdAt), 'MMMM d, yyyy')}
          </p>
          <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-12 border border-gray-800 bg-black/20 flex items-center justify-center">
            <Image 
              src={post.thumbnailUrl} 
              alt={post.title} 
              fill 
              // Change 'object-cover' to 'object-contain'
              className="object-contain" 
            />
          </div>
          {/* The 'prose-invert' class is key for styling text on a dark background */}
          <div
            className="prose prose-invert prose-lg max-w-none prose-p:text-gray-300 prose-headings:text-white prose-a:text-orange-500 hover:prose-a:text-orange-400"
            dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}
          />
        </article>
      </div>
    </main>
  );
}