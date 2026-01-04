import { Button } from '@/components/ui/button';
import { ArrowRight, Bot, Mic, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';


function FeatureSection() {
  const features = [
    {
      title: 'AI Voice Tutoring',
      description: 'Have real, spoken conversations with your AI Tutor. Perfect for practicing languages or explaining complex science concepts in real-time.',
      icon: <Mic className="h-8 w-8 text-orange-500" />,
    },
    {
      title: 'Past Paper Mastery',
      description: 'Generate practice questions based on real CXC patterns. Get instant feedback and marking schemes for CSEC and CAPE subjects.',
      icon: <Bot className="h-8 w-8 text-orange-500" />,
    },
    {
      title: 'Smart Flashcards',
      description: 'Convert your notes into intelligent flashcards instantly. Use spaced-repetition to memorize key terms for Biology, History, and more.',
      icon: <Sparkles className="h-8 w-8 text-orange-500" />,
    },
  ];

  return (
    <section className="py-24 bg-gray-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Master Every Subject with AI-Powered Tools
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            Specifically designed for the Caribbean curriculum, helping you bridge the gap between "studying" and "passing".
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-8 rounded-2xl bg-gray-800/50 border border-gray-700 hover:border-orange-500/50 transition-all group"
            >
              <div className="mb-4 p-3 bg-gray-900 rounded-lg w-fit group-hover:bg-orange-500/10 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section className="py-24 bg-gray-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="text-3xl font-bold text-white sm:text-5xl leading-tight">
              From <span className="text-orange-500">Exam Stress</span> to Academic Success
            </h2>
            <p className="mt-6 text-lg text-gray-400">
              CXC exams are tough, but you don't have to face them alone. Caribbean AI Tutor provides the high-quality, personalized support that every student deserves, regardless of their school or resources.
            </p>
            <ul className="mt-10 space-y-4">
              {[
                'Tailored specifically for CSEC & CAPE syllabuses',
                'Accessible 24/7 on any device',
                'Reduces study time by focusing on what matters',
                'Builds confidence for oral and written exams',
              ].map((benefit, i) => (
                <li key={i} className="flex items-center text-gray-200">
                  <div className="h-2 w-2 rounded-full bg-orange-500 mr-3" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:w-1/2 relative">
            <div className="absolute -inset-4 bg-orange-500/20 blur-3xl rounded-full" />
            <div className="relative rounded-2xl overflow-hidden border border-gray-700 bg-gray-900 p-8 shadow-2xl">
              <div className="flex items-center space-x-4 mb-6">
                <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white">AI</div>
                <div>
                  <div className="text-sm font-medium text-white">AI Tutor</div>
                  <div className="text-xs text-green-400">Online & Ready to Help</div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-800 p-4 rounded-lg text-sm text-gray-300 max-w-[80%]">
                  "I noticed you're struggling with Organic Chemistry. Let's practice with some past paper questions from 2023."
                </div>
                <div className="bg-orange-500 p-4 rounded-lg text-sm text-white max-w-[80%] ml-auto">
                  "That sounds great! Can we focus on the reaction mechanisms?"
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-8 md:space-y-0 text-center md:text-left">
          {/* Left Side: Builder Info & Logo */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold">Web Product Powered by</p>
            <a
              href="https://bmbez.com"
              target="_blank"
              rel="noopener noreferrer"
              title="Visit bmbez.com"
              className="hover:opacity-80 transition-opacity"
            >
              <Image
                src="https://bmbez.com/wp-content/uploads/2024/04/BMBEZ__1_-removebg-preview-2.png"
                alt="BMBEZ (BuidMore Build EZ) Logo"
                width={120}
                height={30}
                className="h-auto brightness-95 contrast-125"
              />
            </a>
          </div>

          {/* Right Side: Copyright */}
          <div>
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} Caribbean AI Tutor. All Rights Reserved.
            </p>
            <p className="text-xs text-gray-600 mt-2 font-medium tracking-wide italic">
              Empowering the next generation of Caribbean leaders.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <main className="bg-gray-900 text-gray-100 min-h-screen selection:bg-orange-500/30">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-24 sm:pt-48 sm:pb-32">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-40"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-orange-500/10 blur-[120px] rounded-full -z-10" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-gray-700 bg-gray-800/50 text-sm font-medium text-orange-400 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-orange-500 mr-2 animate-pulse" />
            2026 Exam Prep Now Open
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl lg:text-8xl">
            Success at CXC <br />
            <span className="text-orange-500 bg-clip-text">Made Easy</span>
          </h1>
          <p className="mt-8 max-w-2xl mx-auto text-lg text-gray-400 sm:text-xl leading-relaxed">
            Your personal AI Tutor for <span className="text-gray-200">CSEC & CAPE</span> subjects. Practice with flashcards, past papers, and real conversations designed for your success.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button size="lg" className="text-lg rounded-full h-14 px-10 bg-orange-500 hover:bg-orange-600 w-full sm:w-auto shadow-lg shadow-orange-500/20 active:scale-95 transition-all" asChild>
              <Link href="/dashboard" className='flex items-center'>
                Start Studying Free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Link href="#features" className="text-gray-400 hover:text-white transition-colors font-medium">
              Explore Features
            </Link>
          </div>
        </div>
      </section>

      <div id="features">
        <FeatureSection />
      </div>
      <BenefitsSection />

      <Footer />
    </main>
  );
}
