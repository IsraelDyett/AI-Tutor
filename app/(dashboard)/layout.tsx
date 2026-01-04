'use client';

import Link from 'next/link';
import { use, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { CircleIcon, Home, LogOut, Edit } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/(login)/actions';
import { useRouter } from 'next/navigation';
import { User, Team } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';
import Image from 'next/image'; // Import the Next.js Image component


interface UserDetails {
  user: User;
  team: Team | null;
  role: 'owner' | 'member' | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: userDetails } = useSWR<UserDetails>('/api/user/details', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    mutate('/api/user/details');
    router.push('/');
  }

  const canPostBlog = userDetails?.team?.name === 'BMBEZ' && userDetails?.role === 'owner';
  const user = userDetails?.user;

  if (!user) {
    return (
      <>
        <Link href="/blog"
          className="text-sm font-medium text-gray-700 hover:text-gray-900">
          Blog
        </Link>
        <Link
          href="/pricing"
          //href="https://www.google.com/"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Pricing
        </Link>
        <Button asChild className="rounded-full">
          {/* <Link href="/sign-up">Sign Up</Link> */}
          <Link href="/sign-in">Login</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      {/* <Link href="/blog" 
            className="text-sm font-medium text-gray-700 hover:text-gray-900">
            Blog
      </Link> */}
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger>
          <Avatar className="cursor-pointer size-9">
            <AvatarImage alt={user.name || ''} />
            <AvatarFallback>
              {user.email
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="flex flex-col gap-1">
          <DropdownMenuItem className="cursor-pointer">
            <Link href="/dashboard" className="flex w-full items-center">
              <Home className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>
          {canPostBlog && (
            <DropdownMenuItem className="cursor-pointer">
              <Link href="/dashboard/blog/create" className="flex w-full items-center"><Edit className="mr-2 h-4 w-4" /><span>Create Post</span></Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <form action={handleSignOut} className="w-full">
            <button type="submit" className="flex w-full">
              <DropdownMenuItem className="w-full flex-1 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}


export function Header() {
  return (
    // --- Start of The Fix ---
    // Added `bg-white` to match the design in the screenshot
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* It's good practice to wrap the logo in a Link to the homepage */}
        <div className="flex items-center space-x-6">
          <Link href="/" aria-label="Back to homepage">
            <Image
              // Assuming the logo is in the `public/images/` directory
              src="/image/logo.png"
              // Corrected the alt text to accurately describe the image
              alt="AuraSell Logo"
              // --- Start of The Fix ---
              // Adjusted the dimensions to better match the aspect ratio in the screenshot.
              // This makes the logo wider and less tall.
              width={160}
              height={40}
              // --- End of The Fix ---
              // Remove the `className` as Next.js handles the aspect ratio with width/height
              // Add `priority` to hint Next.js to load this important image faster
              priority
            />
          </Link>

        </div>
        <div className="flex items-center space-x-4">
          {/* A more specific fallback can prevent layout shift */}
          <Suspense fallback={<div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col min-h-screen">
      <Header />
      {children}
    </section>
  );
}
