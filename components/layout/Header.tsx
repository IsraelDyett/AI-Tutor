'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import useSWR from 'swr';
import Image from 'next/image';
import { User } from '@/lib/db/schema';
// Re-using the UserMenu from your dashboard layout would be ideal
// but for simplicity, we'll create a basic version here.

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function AuthNav() {
  const { data: user } = useSWR<User>('/api/user', fetcher);

  if (!user) {
    return (
       <>
        <Link href="/blog" className="text-sm font-medium text-gray-300 hover:text-white">Blog</Link>
        <Link href="/pricing" className="text-sm font-medium text-gray-300 hover:text-white">Pricing</Link>
        <Button asChild className="rounded-full bg-orange-500 hover:bg-orange-600">
            <Link href="/sign-in">Login</Link>
        </Button>
       </>
    );
  }

  return (
    <>
        <Link href="/blog" className="text-sm font-medium text-gray-300 hover:text-white">Blog</Link>
        <Link href="/dashboard" className="text-sm font-medium text-gray-300 hover:text-white">Dashboard</Link>
    </>
  );
}


export function Header() {
  return (
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/" aria-label="Back to homepage">
          <Image src="/image/logo.png" alt="AuraSell Logo" width={160} height={40} priority />
        </Link>
        <div className="flex items-center space-x-4">
          <Suspense fallback={<div className="h-9 w-20 rounded-full bg-gray-700 animate-pulse" />}>
            <AuthNav />
          </Suspense>
        </div>
      </div>
    </header>
  );
}