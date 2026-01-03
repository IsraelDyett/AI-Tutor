// File: app/blog/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db/drizzle';
import { blogPosts, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { format } from 'date-fns';

async function getPosts() {
  return await db.select({
      title: blogPosts.title,
      slug: blogPosts.slug,
      thumbnailUrl: blogPosts.thumbnailUrl,
      createdAt: blogPosts.createdAt,
      authorName: users.name,
    }).from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .orderBy(desc(blogPosts.createdAt));
}

export default async function BlogIndexPage() {
  const posts = await getPosts();

  return (
    <main className="bg-gray-900 text-gray-100">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 text-center">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <div className="relative container mx-auto px-4">
            <h1 className="text-4xl font-bold tracking-tighter text-white sm:text-6xl">The AurahSell Blog</h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">
                Insights, strategies, and stories from the world of AI-powered sales.
            </p>
        </div>
      </section>

      {/* Posts List */}
      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-4">
            <div className="grid gap-12">
            {posts.map((post) => (
                <Link href={`/blog/${post.slug}`} key={post.slug} className="group block">
                <div className="grid md:grid-cols-3 gap-6 items-center">
                <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-800 bg-black/20 flex items-center justify-center">
                        <Image 
                            src={post.thumbnailUrl} 
                            alt={post.title} 
                            fill 
                            // Change 'object-cover' to 'object-contain'
                            className="object-contain transition-transform duration-300 group-hover:scale-105" 
                        />
                    </div>
                    <div className="md:col-span-2">
                    <h2 className="text-2xl font-semibold text-white group-hover:text-orange-500 transition-colors">{post.title}</h2>
                    <p className="text-gray-400 mt-2">
                        By {post.authorName || 'Staff'} • {format(new Date(post.createdAt), 'MMMM d, yyyy')}
                    </p>
                    </div>
                </div>
                </Link>
            ))}
            </div>
        </div>
      </section>
    </main>
  );
}