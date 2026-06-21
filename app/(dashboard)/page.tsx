// import { Button } from '@/components/ui/button';
// import { ArrowRight, Bot, Mic, Sparkles } from 'lucide-react';
// import Link from 'next/link';
// import Image from 'next/image';


// function FeatureSection() {
//   const features = [
//     {
//       title: 'AI Voice Tutoring',
//       description: 'Have real, spoken conversations with your AI Tutor. Perfect for practicing languages or explaining complex science concepts in real-time.',
//       icon: <Mic className="h-8 w-8 text-orange-500" />,
//     },
//     {
//       title: 'Past Paper Mastery',
//       description: 'Generate practice questions based on real CXC patterns. Get instant feedback and marking schemes for CSEC and CAPE subjects.',
//       icon: <Bot className="h-8 w-8 text-orange-500" />,
//     },
//     {
//       title: 'Smart Flashcards',
//       description: 'Convert your notes into intelligent flashcards instantly. Use spaced-repetition to memorize key terms for Biology, History, and more.',
//       icon: <Sparkles className="h-8 w-8 text-orange-500" />,
//     },
//   ];

//   return (
//     <section className="py-24 bg-gray-900 overflow-hidden">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="text-center mb-16">
//           <h2 className="text-3xl font-bold text-white sm:text-4xl">
//             Master Every Subject with AI-Powered Tools
//           </h2>
//           <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
//             Specifically designed for the Caribbean curriculum, helping you bridge the gap between "studying" and "passing".
//           </p>
//         </div>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//           {features.map((feature, index) => (
//             <div
//               key={index}
//               className="p-8 rounded-2xl bg-gray-800/50 border border-gray-700 hover:border-orange-500/50 transition-all group"
//             >
//               <div className="mb-4 p-3 bg-gray-900 rounded-lg w-fit group-hover:bg-orange-500/10 transition-colors">
//                 {feature.icon}
//               </div>
//               <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
//               <p className="text-gray-400 leading-relaxed">{feature.description}</p>
//             </div>
//           ))}
//         </div>
//       </div>
//     </section>
//   );
// }

// function BenefitsSection() {
//   return (
//     <section className="py-24 bg-gray-800/30">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex flex-col lg:flex-row items-center gap-16">
//           <div className="lg:w-1/2">
//             <h2 className="text-3xl font-bold text-white sm:text-5xl leading-tight">
//               From <span className="text-orange-500">Exam Stress</span> to Academic Success
//             </h2>
//             <p className="mt-6 text-lg text-gray-400">
//               CXC exams are tough, but you don't have to face them alone. Caribbean AI Tutor provides the high-quality, personalized support that every student deserves, regardless of their school or resources.
//             </p>
//             <ul className="mt-10 space-y-4">
//               {[
//                 'Tailored specifically for CSEC & CAPE syllabuses',
//                 'Accessible 24/7 on any device',
//                 'Reduces study time by focusing on what matters',
//                 'Builds confidence for oral and written exams',
//               ].map((benefit, i) => (
//                 <li key={i} className="flex items-center text-gray-200">
//                   <div className="h-2 w-2 rounded-full bg-orange-500 mr-3" />
//                   {benefit}
//                 </li>
//               ))}
//             </ul>
//           </div>
//           <div className="lg:w-1/2 relative">
//             <div className="absolute -inset-4 bg-orange-500/20 blur-3xl rounded-full" />
//             <div className="relative rounded-2xl overflow-hidden border border-gray-700 bg-gray-900 p-8 shadow-2xl">
//               <div className="flex items-center space-x-4 mb-6">
//                 <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white">AI</div>
//                 <div>
//                   <div className="text-sm font-medium text-white">AI Tutor</div>
//                   <div className="text-xs text-green-400">Online & Ready to Help</div>
//                 </div>
//               </div>
//               <div className="space-y-4">
//                 <div className="bg-gray-800 p-4 rounded-lg text-sm text-gray-300 max-w-[80%]">
//                   "I noticed you're struggling with Organic Chemistry. Let's practice with some past paper questions from 2023."
//                 </div>
//                 <div className="bg-orange-500 p-4 rounded-lg text-sm text-white max-w-[80%] ml-auto">
//                   "That sounds great! Can we focus on the reaction mechanisms?"
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }

// function Footer() {
//   return (
//     <footer className="bg-gray-900 border-t border-gray-800">
//       <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
//         <div className="flex flex-col md:flex-row justify-between items-center space-y-8 md:space-y-0 text-center md:text-left">
//           {/* Left Side: Builder Info & Logo */}
//           <div className="flex flex-col md:flex-row items-center gap-4">
//             <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold">Web Product Powered by</p>
//             <a
//               href="https://bmbez.com"
//               target="_blank"
//               rel="noopener noreferrer"
//               title="Visit bmbez.com"
//               className="hover:opacity-80 transition-opacity"
//             >
//               <Image
//                 src="https://bmbez.com/wp-content/uploads/2024/04/BMBEZ__1_-removebg-preview-2.png"
//                 alt="BMBEZ (BuidMore Build EZ) Logo"
//                 width={120}
//                 height={30}
//                 className="h-auto brightness-95 contrast-125"
//               />
//             </a>
//           </div>

//           {/* Right Side: Copyright */}
//           <div>
//             <p className="text-sm text-gray-400">
//               © {new Date().getFullYear()} Caribbean AI Tutor. All Rights Reserved.
//             </p>
//             <p className="text-xs text-gray-600 mt-2 font-medium tracking-wide italic">
//               Empowering the next generation of Caribbean leaders.
//             </p>
//           </div>
//         </div>
//       </div>
//     </footer>
//   );
// }

// export default function HomePage() {
//   return (
//     <main className="bg-gray-900 text-gray-100 min-h-screen selection:bg-orange-500/30">
//       {/* Hero Section */}
//       <section className="relative overflow-hidden pt-32 pb-24 sm:pt-48 sm:pb-32">
//         <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-40"></div>
//         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-orange-500/10 blur-[120px] rounded-full -z-10" />

//         <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
//           <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-gray-700 bg-gray-800/50 text-sm font-medium text-orange-400 mb-8">
//             <span className="flex h-2 w-2 rounded-full bg-orange-500 mr-2 animate-pulse" />
//             2026 Exam Prep Now Open
//           </div>
//           <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl lg:text-8xl">
//             Success at CXC <br />
//             <span className="text-orange-500 bg-clip-text">Made Easy</span>
//           </h1>
//           <p className="mt-8 max-w-2xl mx-auto text-lg text-gray-400 sm:text-xl leading-relaxed">
//             Your personal AI Tutor for <span className="text-gray-200">CSEC & CAPE</span> subjects. Practice with flashcards, past papers, and real conversations designed for your success.
//           </p>
//           <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
//             <Button size="lg" className="text-lg rounded-full h-14 px-10 bg-orange-500 hover:bg-orange-600 w-full sm:w-auto shadow-lg shadow-orange-500/20 active:scale-95 transition-all" asChild>
//               <Link href="/dashboard" className='flex items-center'>
//                 Start Studying Free <ArrowRight className="ml-2 h-5 w-5" />
//               </Link>
//             </Button>
//             <Link href="#features" className="text-gray-400 hover:text-white transition-colors font-medium">
//               Explore Features
//             </Link>
//           </div>
//         </div>
//       </section>

//       <div id="features">
//         <FeatureSection />
//       </div>
//       <BenefitsSection />

//       <Footer />
//     </main>
//   );
// }


'use client';

import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Mic,
  MessageSquare,
  GraduationCap,
  Building2,
  School,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense, useEffect, useRef, useState } from 'react';
import { UserMenu } from '@/app/(dashboard)/layout';

/* ----------------------------------------------------------------------
   Parallax / pointer tracking hook
---------------------------------------------------------------------- */
function usePointerParallax() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setPos({ x, y });
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  return pos;
}

function useScrollProgress() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    function onScroll() {
      setScrollY(window.scrollY);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return scrollY;
}

/* ----------------------------------------------------------------------
   Reveal-on-scroll wrapper
---------------------------------------------------------------------- */
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(36px) scale(0.98)',
        transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------------
   Floating 3D neural orb — hero signature element
---------------------------------------------------------------------- */
function NeuralOrb() {
  const { x, y } = usePointerParallax();
  return (
    <div
      className="relative mx-auto"
      style={{
        width: 'min(60vw, 520px)',
        height: 'min(60vw, 520px)',
        perspective: '1200px',
      }}
    >
      {/* ambient glow */}
      <div
        className="absolute inset-0 rounded-full blur-[90px]"
        style={{
          background:
            'radial-gradient(circle, rgba(255,122,26,0.45) 0%, rgba(255,122,26,0.08) 55%, transparent 75%)',
          transform: `translate(${x * 14}px, ${y * 14}px)`,
        }}
      />
      {/* orbit rings */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: '1px solid rgba(255,159,67,0.25)',
          transform: `rotateX(${66 + y * 6}deg) rotateZ(${x * 8}deg)`,
          transformStyle: 'preserve-3d',
          animation: 'spin-slow 22s linear infinite',
        }}
      />
      <div
        className="absolute inset-[8%] rounded-full"
        style={{
          border: '1px solid rgba(255,159,67,0.15)',
          transform: `rotateX(${70 + y * 6}deg) rotateZ(${-x * 10}deg)`,
          transformStyle: 'preserve-3d',
          animation: 'spin-slow-rev 30s linear infinite',
        }}
      />
      {/* core sphere */}
      <div
        className="absolute inset-[18%] rounded-full overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 32% 28%, #ffd9b3 0%, #ff7a1a 35%, #c2410c 65%, #2a0f02 100%)',
          boxShadow:
            '0 0 80px rgba(255,122,26,0.55), inset -20px -20px 60px rgba(0,0,0,0.55), inset 12px 12px 40px rgba(255,255,255,0.25)',
          transform: `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`,
          transition: 'transform 0.15s ease-out',
        }}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, transparent 2px, transparent 22px), repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, transparent 2px, transparent 22px)',
            animation: 'drift 12s linear infinite',
          }}
        />
      </div>
      {/* floating data nodes */}
      {[
        { label: 'Voice', icon: Mic, top: '4%', left: '6%', d: 0 },
        { label: 'Text', icon: MessageSquare, top: '10%', left: '78%', d: 0.6 },
        { label: 'Practice', icon: Sparkles, top: '82%', left: '14%', d: 1.2 },
      ].map(({ label, icon: Icon, top, left, d }) => (
        <div
          key={label}
          className="absolute flex items-center gap-2 rounded-full border border-orange-500/30 bg-gray-950/70 backdrop-blur-md px-3 py-1.5 text-xs font-medium text-orange-200 shadow-lg"
          style={{
            top,
            left,
            animation: `float 5s ease-in-out ${d}s infinite`,
            transform: `translate(${x * 18}px, ${y * 18}px)`,
          }}
        >
          <Icon className="h-3.5 w-3.5 text-orange-400" />
          {label}
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------
   Tilt card — used for feature & path cards
---------------------------------------------------------------------- */
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setStyle({
      transform: `perspective(800px) rotateX(${-py * 8}deg) rotateY(${px * 10}deg) translateZ(8px)`,
    });
  }
  function onLeave() {
    setStyle({ transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px)' });
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{ ...style, transition: 'transform 0.25s ease-out' }}
    >
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------------
   Sections
---------------------------------------------------------------------- */

function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/" aria-label="Back to homepage" className="shrink-0 flex items-center">
            <Image src="/image/edulogo.png" alt="EduCaribbean Logo" width={36} height={36} priority />
          </Link>
          <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">EduCaribbean</h1>
        </div>

        <div className="hidden lg:flex items-center gap-8 text-sm text-gray-600 shrink-0">
          <a href="#tools" className="hover:text-gray-900 transition-colors">Tools</a>
          <a href="#education" className="hover:text-gray-900 transition-colors">For Schools</a>
          <a href="#corporate" className="hover:text-gray-900 transition-colors">For Organizations</a>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Suspense
            fallback={
              <div className="flex items-center gap-2 sm:gap-4">
                <Link href="/pricing" className="text-sm font-medium text-gray-700 hover:text-gray-900 whitespace-nowrap">
                  Pricing
                </Link>
                <Button asChild size="sm" className="rounded-full">
                  <Link href="/sign-in">Login</Link>
                </Button>
              </div>
            }
          >
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const scrollY = useScrollProgress();
  return (
    <section className="relative overflow-hidden pt-40 pb-28 sm:pt-48">
      {/* background grid + glow, parallaxed by scroll */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          transform: `translateY(${scrollY * 0.15}px)`,
        }}
      />
      <div
        className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-orange-500/10 blur-[140px] rounded-full"
        style={{ transform: `translate(-50%, ${scrollY * 0.1}px)` }}
      />

      <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-gray-700 bg-gray-800/50 text-sm font-medium text-orange-400 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-orange-500 mr-2 animate-pulse" />
            SEA · CSEC · CAPE + Corporate Training
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.05]">
            Learning that
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-300 bg-clip-text text-transparent">
              thinks with you
            </span>
          </h1>
          <p className="mt-8 max-w-xl mx-auto lg:mx-0 text-lg text-gray-400 sm:text-xl leading-relaxed">
            EduCaribbean pairs an AI voice tutor, AI text tutor, and smart practice
            questions to help students, teachers, and schools learn faster — and gives
            companies the same engine to build their own training.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Button
              size="lg"
              className="text-lg rounded-full h-14 px-10 bg-orange-500 hover:bg-orange-600 w-full sm:w-auto shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
              asChild
            >
              <Link href="/dashboard" className="flex items-center">
                Start Studying Free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <a
              href="#corporate"
              className="text-gray-400 hover:text-white transition-colors font-medium"
            >
              Explore corporate training →
            </a>
          </div>
        </div>

        <NeuralOrb />
      </div>

      <style>{`
        @keyframes spin-slow { from { transform: rotateX(70deg) rotateZ(0deg); } to { transform: rotateX(70deg) rotateZ(360deg); } }
        @keyframes spin-slow-rev { from { transform: rotateX(70deg) rotateZ(0deg); } to { transform: rotateX(70deg) rotateZ(-360deg); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes drift { from { background-position: 0 0; } to { background-position: 80px 80px; } }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </section>
  );
}

function AudienceSplit() {
  const paths = [
    {
      id: 'education',
      icon: School,
      eyebrow: 'For students, teachers & schools',
      title: 'Built-in SEA & CXC curriculum',
      desc:
        'Ready-to-use subjects for SEA, CSEC, and CAPE — from Biology to Mathematics — with past papers, flashcards, and tutors mapped to the real syllabus.',
      bullets: ['Voice & text AI tutors for every subject', 'CXC-style past paper practice with instant feedback', 'Progress tracking for students, parents & teachers'],
      cta: 'Start studying free',
      href: '/dashboard',
    },
    {
      id: 'corporate',
      icon: Building2,
      eyebrow: 'For companies & organizations',
      title: 'Build your own training, your way',
      desc:
        'Turn your sales playbook, HR policies, or onboarding manual into an AI tutor your team can talk to — no curriculum required, just your content.',
      bullets: ['Upload your own materials to train the AI', 'Custom voice & text tutors for any topic', 'Team performance dashboards built in'],
      cta: 'Talk to us about corporate training',
      href: '/dashboard',
    },
  ];

  return (
    <section className="relative py-24 bg-gray-950" id="education">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">One platform, two paths</h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            Whether you&apos;re prepping for an exam or training a team, the same AI
            tutoring engine adapts to what you need to learn.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-8" id="corporate">
          {paths.map((p, i) => (
            <Reveal key={p.id} delay={i * 120}>
              <TiltCard className="h-full rounded-3xl p-px bg-gradient-to-br from-orange-500/40 via-gray-700/40 to-transparent">
                <div className="h-full rounded-[calc(1.5rem-1px)] bg-gray-900 p-9 flex flex-col">
                  <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6">
                    <p.icon className="h-6 w-6 text-orange-400" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-orange-400">
                    {p.eyebrow}
                  </span>
                  <h3 className="mt-3 text-2xl font-bold text-white">{p.title}</h3>
                  <p className="mt-4 text-gray-400 leading-relaxed">{p.desc}</p>
                  <ul className="mt-6 space-y-3 flex-1">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-sm text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className="mt-8 w-full rounded-full border-gray-700 hover:border-orange-500 hover:bg-orange-500/10 text-gray-500"
                    asChild
                  >
                    <Link href={p.href} className="flex items-center justify-center">
                      {p.cta} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ToolsSection() {
  const tools = [
    {
      title: 'AI Voice Tutor',
      description:
        'Have real, spoken conversations with your AI Tutor — practice languages, talk through a tough topic, or rehearse for an oral exam.',
      icon: Mic,
    },
    {
      title: 'AI Text Tutor',
      description:
        'Chat through any subject or training topic, upload notes or documents, and get explanations tuned to how you learn.',
      icon: MessageSquare,
    },
    {
      title: 'Smart Practice Questions',
      description:
        'Auto-generated questions — from CXC past papers to your own company material — with instant marking and feedback.',
      icon: Sparkles,
    },
  ];

  return (
    <section className="py-24 bg-gray-900 overflow-hidden" id="tools">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Three tools. Every subject. Any topic.
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            The same engine powers exam prep and corporate training — built to close
            the gap between &ldquo;studying&rdquo; and &ldquo;understanding.&rdquo;
          </p>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tools.map((tool, index) => (
            <Reveal key={tool.title} delay={index * 100}>
              <TiltCard className="h-full p-8 rounded-2xl bg-gray-800/50 border border-gray-700 hover:border-orange-500/50 transition-colors group">
                <div className="mb-4 p-3 bg-gray-900 rounded-lg w-fit group-hover:bg-orange-500/10 transition-colors">
                  <tool.icon className="h-8 w-8 text-orange-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{tool.title}</h3>
                <p className="text-gray-400 leading-relaxed">{tool.description}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConversationDemo() {
  const scrollY = useScrollProgress();
  return (
    <section className="py-24 bg-gray-800/30 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <Reveal className="lg:w-1/2">
            <h2 className="text-3xl font-bold text-white sm:text-5xl leading-tight">
              From <span className="text-orange-500">exam stress</span> to{' '}
              <span className="text-orange-500">exam-day confidence</span>
            </h2>
            <p className="mt-6 text-lg text-gray-400">
              CXC exams are tough, but no one should face them alone. EduCaribbean gives
              every student the kind of personalized, patient support that used to take
              a private tutor — available any time, on any device.
            </p>
            <ul className="mt-10 space-y-4">
              {[
                'Tailored to SEA, CSEC & CAPE syllabuses',
                'Accessible 24/7 on any device',
                'Focuses study time on what actually matters',
                'Builds confidence for oral and written exams',
              ].map((benefit) => (
                <li key={benefit} className="flex items-center text-gray-200">
                  <div className="h-2 w-2 rounded-full bg-orange-500 mr-3" />
                  {benefit}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="lg:w-1/2 relative" delay={150}>
            <div
              className="absolute -inset-4 bg-orange-500/20 blur-3xl rounded-full"
              style={{ transform: `translateY(${(scrollY - 800) * -0.05}px)` }}
            />
            <div
              className="relative rounded-2xl overflow-hidden border border-gray-700 bg-gray-900 p-8 shadow-2xl"
              style={{
                transform: `rotateY(${Math.max(-6, Math.min(6, (scrollY - 900) * 0.01))}deg)`,
                transformStyle: 'preserve-3d',
              }}
            >
              <div className="flex items-center space-x-4 mb-6">
                <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white">
                  AI
                </div>
                <div>
                  <div className="text-sm font-medium text-white">AI Tutor</div>
                  <div className="text-xs text-green-400">Online & ready to help</div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-800 p-4 rounded-lg text-sm text-gray-300 max-w-[80%]">
                  I noticed you&apos;re struggling with Organic Chemistry. Let&apos;s
                  practice with some past paper questions from 2023.
                </div>
                <div className="bg-orange-500 p-4 rounded-lg text-sm text-white max-w-[80%] ml-auto">
                  That sounds great! Can we focus on the reaction mechanisms?
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function CorporateBand() {
  const items = [
    'Sales training',
    'HR onboarding',
    'Compliance & policy',
    'Product knowledge',
    'Customer service',
    'Leadership development',
  ];
  return (
    <section className="py-20 bg-gray-950 border-y border-gray-800 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <Reveal>
          <span className="text-xs font-semibold uppercase tracking-widest text-orange-400">
            For organizations
          </span>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Your training material, turned into an AI tutor
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            Upload your own content and EduCaribbean builds custom voice and text
            tutors plus practice questions around it — for any topic your team needs.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {items.map((item) => (
              <span
                key={item}
                className="px-4 py-2 rounded-full border border-gray-700 bg-gray-900 text-sm text-gray-300 hover:border-orange-500/50 hover:text-orange-300 transition-colors"
              >
                {item}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-28 bg-gray-900 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-orange-500/10 blur-[120px] rounded-full" />
      <Reveal className="relative max-w-3xl mx-auto px-6 text-center">
        <GraduationCap className="h-10 w-10 text-orange-500 mx-auto mb-6" />
        <h2 className="text-3xl sm:text-5xl font-bold text-white leading-tight">
          Ready to learn smarter?
        </h2>
        <p className="mt-6 text-lg text-gray-400">
          Free for students. Built for schools. Ready for your organization.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <Button
            size="lg"
            className="text-lg rounded-full h-14 px-10 bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20"
            asChild
          >
            <Link href="/dashboard" className="flex items-center justify-center">
              Start Studying Free <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-lg rounded-full h-14 px-10 border-gray-700 text-gray-500 hover:border-orange-500 hover:bg-orange-500/10"
            asChild
          >
            <a href="#corporate">Explore corporate training</a>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto py-16 px-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-8 md:space-y-0 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold">
              Web Product Powered by
            </p>
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
          <div>
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} EduCaribbean. All Rights Reserved.
            </p>
            <p className="text-xs text-gray-600 mt-2 font-medium tracking-wide italic">
              Empowering learners and teams across the Caribbean — and beyond.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <main className="bg-gray-950 text-gray-100 min-h-screen selection:bg-orange-500/30">
      {/* <Nav /> */}
      <Hero />
      <AudienceSplit />
      <ToolsSection />
      <ConversationDemo />
      <CorporateBand />
      <CTASection />
      <Footer />
    </main>
  );
}