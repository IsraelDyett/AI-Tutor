// File: app/(dashboard)/dashboard/blog/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function CreateBlogPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const response = await fetch('/api/blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, thumbnailUrl }),
    });
    
    const result = await response.json();
    setIsLoading(false);

    if (response.ok) {
      alert('Blog post created successfully!');
      router.push(`/blog/${result.post.slug}`); // Redirect to the new post
    } else {
      alert(`Error: ${result.error || 'Failed to create post.'}`);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h3 className="text-2xl font-bold">Create a New Blog Post</h3>
        <p className="text-sm text-gray-500">Publish a new article for all users to see.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">Post Title</label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="thumbnailUrl" className="block text-sm font-medium mb-1">Thumbnail Image URL</label>
          <Input id="thumbnailUrl" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="content" className="block text-sm font-medium mb-1">Content (supports line breaks)</label>
          <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={15} required />
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Publishing...' : 'Publish Post'}
        </Button>
      </form>
    </div>
  );
}