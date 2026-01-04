import { Button } from '@/components/ui/button';
import { ArrowRight, Bot, Mic, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="bg-gray-900 text-gray-100 min-h-screen">
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-48 sm:pb-28">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold tracking-tighter text-white sm:text-6xl lg:text-7xl">
            Success at CXC <span className="text-orange-500">Made Easy</span>
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-lg text-gray-400 sm:text-xl">
            Your personal AI Tutor for CXC subjects. Practice with flashcards, past papers, and having real conversations with your AI Tutor.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-lg rounded-full bg-orange-500 hover:bg-orange-600 w-full sm:w-auto" asChild>
              <Link href="/dashboard" className='flex items-center'>
                Start Studying <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}