// // // app/(dashboard)/dashboard/team/performance/performance-page-client.tsx
// // 'use client';

// // import { useState } from 'react';
// // import Link from 'next/link';
// // import { 
// //   BarChart2, Trophy, Brain, Clock, Target, TrendingUp, 
// //   ArrowLeft, Users, ChevronDown, ChevronUp
// // } from 'lucide-react';
// // import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// // import type { MemberPerformance } from '../actions';

// // interface Props {
// //   performances: MemberPerformance[];
// //   isAdmin: boolean;
// //   currentUserId: number;
// // }

// // function getInitials(name: string | null, email: string) {
// //   if (name) {
// //     const parts = name.trim().split(' ');
// //     return parts.length >= 2
// //       ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
// //       : parts[0].slice(0, 2).toUpperCase();
// //   }
// //   return email.slice(0, 2).toUpperCase();
// // }

// // const AVATAR_COLORS = [
// //   'bg-orange-100 text-orange-700',
// //   'bg-blue-100 text-blue-700',
// //   'bg-purple-100 text-purple-700',
// //   'bg-green-100 text-green-700',
// //   'bg-pink-100 text-pink-700',
// //   'bg-amber-100 text-amber-700',
// // ];

// // function scoreColor(score: number) {
// //   if (score >= 80) return 'text-green-600';
// //   if (score >= 60) return 'text-amber-600';
// //   return 'text-red-500';
// // }

// // function scoreBg(score: number) {
// //   if (score >= 80) return 'bg-green-50 border-green-100';
// //   if (score >= 60) return 'bg-amber-50 border-amber-100';
// //   return 'bg-red-50 border-red-100';
// // }

// // function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
// //   const pct = Math.min(100, (score / max) * 100);
// //   return (
// //     <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
// //       <div
// //         className={`h-2 rounded-full transition-all duration-500 ${
// //           pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-400'
// //         }`}
// //         style={{ width: `${pct}%` }}
// //       />
// //     </div>
// //   );
// // }

// // // Mini sparkline using raw SVG
// // function Sparkline({ scores }: { scores: { score: number; totalQuestions: number }[] }) {
// //   if (scores.length < 2) return <span className="text-xs text-gray-400">Not enough data</span>;

// //   const pcts = scores.map((s) => (s.totalQuestions > 0 ? (s.score / s.totalQuestions) * 100 : 0)).reverse();
// //   const min = Math.min(...pcts);
// //   const max = Math.max(...pcts);
// //   const range = max - min || 1;
// //   const w = 80;
// //   const h = 28;
// //   const points = pcts
// //     .map((p, i) => `${(i / (pcts.length - 1)) * w},${h - ((p - min) / range) * (h - 4) - 2}`)
// //     .join(' ');

// //   const lastPct = pcts[pcts.length - 1];
// //   const trend = pcts.length >= 2 ? pcts[pcts.length - 1] - pcts[0] : 0;

// //   return (
// //     <div className="flex items-center gap-2">
// //       <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
// //         <polyline
// //           fill="none"
// //           stroke={lastPct >= 80 ? '#16a34a' : lastPct >= 60 ? '#d97706' : '#ef4444'}
// //           strokeWidth="1.5"
// //           strokeLinecap="round"
// //           strokeLinejoin="round"
// //           points={points}
// //         />
// //       </svg>
// //       <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
// //         {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(Math.round(trend))}%
// //       </span>
// //     </div>
// //   );
// // }

// // // ─── Single Member Performance Card ──────────────────────────────────────────
// // function MemberPerformanceCard({
// //   perf,
// //   rank,
// //   isCurrentUser,
// // }: {
// //   perf: MemberPerformance;
// //   rank?: number;
// //   isCurrentUser: boolean;
// // }) {
// //   const [expanded, setExpanded] = useState(isCurrentUser);
// //   const colorClass = AVATAR_COLORS[perf.userId % AVATAR_COLORS.length];

// //   return (
// //     <Card className={`transition-all ${isCurrentUser ? 'border-orange-300 ring-1 ring-orange-200' : 'border-gray-100'}`}>
// //       <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
// //         <div className="flex items-center gap-3">
// //           {/* Rank badge */}
// //           {rank !== undefined && (
// //             <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
// //               rank === 1 ? 'bg-amber-100 text-amber-700' :
// //               rank === 2 ? 'bg-gray-100 text-gray-600' :
// //               rank === 3 ? 'bg-orange-50 text-orange-600' :
// //               'bg-gray-50 text-gray-400'
// //             }`}>
// //               {rank}
// //             </div>
// //           )}

// //           {/* Avatar */}
// //           <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${colorClass}`}>
// //             {getInitials(perf.name, perf.email)}
// //           </div>

// //           {/* Name / email */}
// //           <div className="flex-1 min-w-0">
// //             <div className="flex items-center gap-2 flex-wrap">
// //               <span className="font-semibold text-gray-900 text-sm">
// //                 {perf.name ?? perf.email.split('@')[0]}
// //               </span>
// //               {isCurrentUser && (
// //                 <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">You</span>
// //               )}
// //             </div>
// //             <p className="text-xs text-gray-500 truncate">{perf.email}</p>
// //           </div>

// //           {/* Quick stats */}
// //           <div className="flex items-center gap-4 flex-shrink-0">
// //             <div className="text-right hidden sm:block">
// //               <p className={`text-lg font-bold ${scoreColor(perf.averageScore)}`}>
// //                 {perf.totalTestsTaken > 0 ? `${perf.averageScore}%` : '—'}
// //               </p>
// //               <p className="text-xs text-gray-400">avg score</p>
// //             </div>
// //             <div className="text-right hidden md:block">
// //               <p className="text-lg font-bold text-gray-700">{perf.totalTestsTaken}</p>
// //               <p className="text-xs text-gray-400">tests</p>
// //             </div>
// //             <button className="text-gray-400">
// //               {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
// //             </button>
// //           </div>
// //         </div>
// //       </CardHeader>

// //       {expanded && (
// //         <CardContent className="pt-0">
// //           <div className="border-t border-gray-100 pt-4 space-y-4">
// //             {/* Stats grid */}
// //             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
// //               {[
// //                 { icon: Target, label: 'Avg score', value: perf.totalTestsTaken > 0 ? `${perf.averageScore}%` : '—', color: scoreColor(perf.averageScore) },
// //                 { icon: Trophy, label: 'Best score', value: perf.totalTestsTaken > 0 ? `${perf.bestScore}%` : '—', color: 'text-amber-600' },
// //                 { icon: Brain, label: 'Tests taken', value: String(perf.totalTestsTaken), color: 'text-blue-600' },
// //                 { icon: Clock, label: 'Study time', value: perf.totalStudyMinutes > 0 ? `${perf.totalStudyMinutes}m` : '—', color: 'text-purple-600' },
// //               ].map(({ icon: Icon, label, value, color }) => (
// //                 <div key={label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
// //                   <Icon className={`h-4 w-4 mb-1 ${color}`} />
// //                   <p className={`text-base font-bold ${color}`}>{value}</p>
// //                   <p className="text-xs text-gray-400">{label}</p>
// //                 </div>
// //               ))}
// //             </div>

// //             {/* Score bar */}
// //             {perf.totalTestsTaken > 0 && (
// //               <div>
// //                 <div className="flex justify-between items-center mb-1">
// //                   <span className="text-xs text-gray-500">Average score</span>
// //                   <span className={`text-xs font-bold ${scoreColor(perf.averageScore)}`}>{perf.averageScore}%</span>
// //                 </div>
// //                 <ScoreBar score={perf.averageScore} />
// //               </div>
// //             )}

// //             {/* Trend */}
// //             {perf.recentScores.length >= 2 && (
// //               <div className="flex items-center justify-between">
// //                 <span className="text-xs text-gray-500">Recent trend</span>
// //                 <Sparkline scores={perf.recentScores} />
// //               </div>
// //             )}

// //             {/* Empty state */}
// //             {perf.totalTestsTaken === 0 && (
// //               <p className="text-sm text-gray-400 text-center py-2">No activity yet — start a flashcard test!</p>
// //             )}
// //           </div>
// //         </CardContent>
// //       )}
// //     </Card>
// //   );
// // }

// // // ─── Team Summary Bar ─────────────────────────────────────────────────────────
// // function TeamSummaryBar({ performances }: { performances: MemberPerformance[] }) {
// //   const active = performances.filter((p) => p.totalTestsTaken > 0);
// //   const teamAvg = active.length > 0
// //     ? Math.round(active.reduce((s, p) => s + p.averageScore, 0) / active.length)
// //     : 0;
// //   const totalTests = performances.reduce((s, p) => s + p.totalTestsTaken, 0);
// //   const totalMinutes = performances.reduce((s, p) => s + p.totalStudyMinutes, 0);
// //   const topScorer = active.sort((a, b) => b.bestScore - a.bestScore)[0];

// //   return (
// //     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
// //       {[
// //         { label: 'Team average', value: active.length > 0 ? `${teamAvg}%` : '—', color: scoreColor(teamAvg) },
// //         { label: 'Total tests', value: String(totalTests), color: 'text-blue-600' },
// //         { label: 'Study minutes', value: String(totalMinutes), color: 'text-purple-600' },
// //         { label: 'Top scorer', value: topScorer ? `${topScorer.bestScore}%` : '—', color: 'text-amber-600' },
// //       ].map((stat) => (
// //         <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
// //           <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
// //           <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
// //         </div>
// //       ))}
// //     </div>
// //   );
// // }

// // // ─── Main Component ───────────────────────────────────────────────────────────
// // export default function PerformancePageClient({ performances, isAdmin, currentUserId }: Props) {
// //   const [sortBy, setSortBy] = useState<'score' | 'tests' | 'time'>('score');

// //   const sorted = [...performances].sort((a, b) => {
// //     if (sortBy === 'score') return b.averageScore - a.averageScore;
// //     if (sortBy === 'tests') return b.totalTestsTaken - a.totalTestsTaken;
// //     return b.totalStudyMinutes - a.totalStudyMinutes;
// //   });

// //   const myPerf = performances.find((p) => p.userId === currentUserId);

// //   return (
// //     <main className="min-h-screen bg-gray-50 p-4 lg:p-8">
// //       <div className="max-w-4xl mx-auto space-y-6">

// //         {/* Header */}
// //         <div>
// //           <Link href="/dashboard/team" className="text-sm text-gray-500 hover:text-orange-600 flex items-center gap-1 mb-3">
// //             <ArrowLeft className="h-3.5 w-3.5" /> Back to team
// //           </Link>
// //           <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
// //             <div>
// //               <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
// //                 <BarChart2 className="h-6 w-6 text-orange-500" />
// //                 {isAdmin && performances.length > 1 ? 'Team Performance' : 'My Performance'}
// //               </h1>
// //               <p className="text-gray-500 text-sm mt-0.5">
// //                 {isAdmin && performances.length > 1
// //                   ? `Tracking ${performances.length} members across flashcard tests and study sessions`
// //                   : 'Your personal learning progress'}
// //               </p>
// //             </div>

// //             {/* Sort controls (admin with multiple members) */}
// //             {isAdmin && performances.length > 1 && (
// //               <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
// //                 {(['score', 'tests', 'time'] as const).map((key) => (
// //                   <button
// //                     key={key}
// //                     onClick={() => setSortBy(key)}
// //                     className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
// //                       sortBy === key ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-700'
// //                     }`}
// //                   >
// //                     {key === 'score' ? 'Avg score' : key === 'tests' ? 'Tests' : 'Study time'}
// //                   </button>
// //                 ))}
// //               </div>
// //             )}
// //           </div>
// //         </div>

// //         {/* Team Summary (admin with multiple members only) */}
// //         {isAdmin && performances.length > 1 && (
// //           <TeamSummaryBar performances={performances} />
// //         )}

// //         {/* Individual performances */}
// //         <div className="space-y-3">
// //           {isAdmin && performances.length > 1 ? (
// //             // Admin view: ranked list
// //             sorted.map((perf, idx) => (
// //               <MemberPerformanceCard
// //                 key={perf.userId}
// //                 perf={perf}
// //                 rank={idx + 1}
// //                 isCurrentUser={perf.userId === currentUserId}
// //               />
// //             ))
// //           ) : (
// //             // Non-admin or solo admin: show only self
// //             myPerf ? (
// //               <MemberPerformanceCard
// //                 perf={myPerf}
// //                 isCurrentUser={true}
// //               />
// //             ) : (
// //               <Card className="border-dashed">
// //                 <CardContent className="py-12 text-center">
// //                   <TrendingUp className="h-10 w-10 text-gray-300 mx-auto mb-3" />
// //                   <p className="text-gray-500 font-medium">No performance data yet</p>
// //                   <p className="text-gray-400 text-sm mt-1">
// //                     Complete a flashcard test to start tracking your progress.
// //                   </p>
// //                   <Link
// //                     href="/dashboard"
// //                     className="mt-4 inline-block text-sm text-orange-600 hover:text-orange-700 font-medium"
// //                   >
// //                     Start studying →
// //                   </Link>
// //                 </CardContent>
// //               </Card>
// //             )
// //           )}
// //         </div>

// //         {/* Admin: note when they're alone */}
// //         {isAdmin && performances.length <= 1 && (
// //           <Card className="border-dashed border-orange-200 bg-orange-50/30">
// //             <CardContent className="py-6 text-center">
// //               <Users className="h-8 w-8 text-orange-300 mx-auto mb-2" />
// //               <p className="text-orange-700 font-medium text-sm">Invite team members to see comparative performance</p>
// //               <Link
// //                 href="/dashboard/team"
// //                 className="mt-2 inline-block text-sm text-orange-600 hover:text-orange-700 font-medium underline"
// //               >
// //                 Go to team page
// //               </Link>
// //             </CardContent>
// //           </Card>
// //         )}
// //       </div>
// //     </main>
// //   );
// // }


// // app/(dashboard)/dashboard/team/performance/performance-page-client.tsx
// 'use client';

// import { useState, useTransition } from 'react';
// import Link from 'next/link';
// import { 
//   BarChart2, Trophy, Brain, Clock, Target, TrendingUp, 
//   ArrowLeft, Users, ChevronDown, ChevronUp, MessageSquare, RefreshCw, FileText, Loader2
// } from 'lucide-react';
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Button } from '@/components/ui/button';
// import { generateStudentPerformanceSummaryAction } from '../actions';
// import type { MemberPerformance } from '../actions';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// interface Props {
//   performances: MemberPerformance[];
//   isAdmin: boolean;
//   currentUserId: number;
// }

// function getInitials(name: string | null, email: string) {
//   if (name) {
//     const parts = name.trim().split(' ');
//     return parts.length >= 2
//       ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
//       : parts[0].slice(0, 2).toUpperCase();
//   }
//   return email.slice(0, 2).toUpperCase();
// }

// function ScoreBadge({ score }: { score: number | null }) {
//   if (score === null) return <span className="text-gray-400">—</span>;
//   const color = score >= 80 ? 'text-green-600 bg-green-50' : score >= 60 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
//   return <span className={`px-2 py-1 rounded-md text-xs font-bold ${color}`}>{score}%</span>;
// }

// function MemberPerformanceCard({ perf, isCurrentUser }: { perf: MemberPerformance; isCurrentUser: boolean }) {
//   const [expanded, setExpanded] = useState(isCurrentUser);
//   const [isGenerating, startTransition] = useTransition();

//   const handleGenerateSummary = () => {
//     startTransition(async () => {
//       await generateStudentPerformanceSummaryAction(perf.userId);
//     });
//   };

//   // Prepare chart data
//   const tutorData = perf.tutorSessions.slice().reverse().map((s, i) => ({
//     name: `Session ${i+1}`,
//     score: s.score || 0,
//   }));

//   const paperData = perf.paperAttempts.slice().reverse().map(a => ({
//     name: a.reference,
//     score: a.score,
//   }));

//   return (
//     <Card className={`transition-all overflow-hidden ${isCurrentUser ? 'border-orange-300 ring-1 ring-orange-200' : 'border-gray-100'}`}>
//       <CardHeader className="pb-3 cursor-pointer bg-white hover:bg-gray-50 transition-colors" onClick={() => setExpanded(!expanded)}>
//         <div className="flex justify-between items-center">
//             <div className="flex items-center gap-3">
//             <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
//                 {getInitials(perf.name, perf.email)}
//             </div>
//             <div>
//                 <h3 className="font-bold text-gray-900 flex items-center gap-2">
//                 {perf.name ?? perf.email}
//                 {isCurrentUser && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">You</span>}
//                 </h3>
//                 <p className="text-xs text-gray-500">{perf.email}</p>
//             </div>
//             </div>
//             <div className="flex items-center gap-6">
//                 <div className="text-right hidden sm:block">
//                     <p className="text-xs text-gray-500 uppercase tracking-wider">Avg Score</p>
//                     <p className="text-xl font-black text-gray-900">{perf.totalTestsTaken > 0 ? `${perf.averageScore}%` : '—'}</p>
//                 </div>
//                 <div className="text-right hidden md:block">
//                     <p className="text-xs text-gray-500 uppercase tracking-wider">Study Time</p>
//                     <p className="text-xl font-black text-gray-900">{perf.totalStudyMinutes}m</p>
//                 </div>
//                 {expanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
//             </div>
//         </div>
//       </CardHeader>

//       {expanded && (
//         <div className="bg-gray-50 border-t border-gray-100 p-4 sm:p-6">
//           <Tabs defaultValue="overview" className="w-full">
//             <TabsList className="grid w-full max-w-md grid-cols-3 mb-6 bg-white border border-gray-200">
//               <TabsTrigger value="overview">Overview & AI</TabsTrigger>
//               <TabsTrigger value="tutor">Tutor Sessions</TabsTrigger>
//               <TabsTrigger value="papers">Past Papers</TabsTrigger>
//             </TabsList>

//             {/* OVERVIEW TAB */}
//             <TabsContent value="overview" className="space-y-6">
//               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                   <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
//                       <Target className="h-5 w-5 text-blue-500 mb-2" />
//                       <p className="text-2xl font-bold">{perf.totalTestsTaken > 0 ? `${perf.averageScore}%` : '0'}</p>
//                       <p className="text-xs text-gray-500 font-medium">Avg Flashcard Score</p>
//                   </div>
//                   <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
//                       <MessageSquare className="h-5 w-5 text-purple-500 mb-2" />
//                       <p className="text-2xl font-bold">{perf.tutorSessions.length}</p>
//                       <p className="text-xs text-gray-500 font-medium">Tutor Sessions</p>
//                   </div>
//                   <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
//                       <FileText className="h-5 w-5 text-green-500 mb-2" />
//                       <p className="text-2xl font-bold">{perf.paperAttempts.length}</p>
//                       <p className="text-xs text-gray-500 font-medium">Paper Attempts</p>
//                   </div>
//                   <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
//                       <Clock className="h-5 w-5 text-amber-500 mb-2" />
//                       <p className="text-2xl font-bold">{perf.totalStudyMinutes}m</p>
//                       <p className="text-xs text-gray-500 font-medium">Total Time</p>
//                   </div>
//               </div>

//               {/* AI SUMMARY BOX */}
//               <Card className="border-orange-200 bg-orange-50/50 shadow-inner">
//                   <CardHeader className="pb-2 flex flex-row items-center justify-between">
//                       <CardTitle className="text-lg flex items-center gap-2 text-orange-900">
//                           <Brain className="h-5 w-5 text-orange-600" /> AI Performance Analysis
//                       </CardTitle>
//                       <Button variant="outline" size="sm" onClick={handleGenerateSummary} disabled={isGenerating} className="bg-white text-orange-600 border-orange-200">
//                           {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
//                           Generate New
//                       </Button>
//                   </CardHeader>
//                   <CardContent>
//                       {perf.latestAiSummary ? (
//                           <div className="prose prose-sm prose-orange max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: perf.latestAiSummary }} />
//                       ) : (
//                           <p className="text-sm text-gray-500 italic text-center py-4">No summary generated yet. Click generate to analyze learning data.</p>
//                       )}
//                   </CardContent>
//               </Card>
//             </TabsContent>

//             {/* TUTOR SESSIONS TAB */}
//             <TabsContent value="tutor" className="space-y-6">
//                 <Card>
//                     <CardHeader><CardTitle className="text-sm text-gray-500 uppercase">Understanding Score Trend</CardTitle></CardHeader>
//                     <CardContent className="h-[250px]">
//                         {tutorData.length > 0 ? (
//                             <ResponsiveContainer width="100%" height="100%">
//                                 <LineChart data={tutorData}>
//                                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
//                                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
//                                     <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
//                                     <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
//                                     <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff'}} />
//                                 </LineChart>
//                             </ResponsiveContainer>
//                         ) : (
//                             <div className="h-full flex items-center justify-center text-sm text-gray-400">No tutor sessions completed yet.</div>
//                         )}
//                     </CardContent>
//                 </Card>

//                 <div className="space-y-3">
//                     <h4 className="font-bold text-gray-900 text-sm">Session Feedback Logs</h4>
//                     {perf.tutorSessions.length > 0 ? perf.tutorSessions.map((s, i) => (
//                         <div key={i} className="bg-white p-4 rounded-lg border border-gray-100 flex gap-4 items-start">
//                             <div className="mt-1"><ScoreBadge score={s.score} /></div>
//                             <div>
//                                 <p className="text-xs text-gray-400 font-medium mb-1">
//                                     {new Date(s.date).toLocaleDateString()} • {s.type === 'voice' ? '🎙️ Voice' : '💬 Text'} • {Math.round((s.duration||0)/60)} mins
//                                 </p>
//                                 <p className="text-sm text-gray-700">{s.feedback || 'No feedback recorded.'}</p>
//                             </div>
//                         </div>
//                     )) : <p className="text-sm text-gray-400 italic">No logs available.</p>}
//                 </div>
//             </TabsContent>

//             {/* PAST PAPERS TAB */}
//             <TabsContent value="papers" className="space-y-6">
//                 <Card>
//                     <CardHeader><CardTitle className="text-sm text-gray-500 uppercase">Worksheet & Exam Scores</CardTitle></CardHeader>
//                     <CardContent className="h-[250px]">
//                         {paperData.length > 0 ? (
//                             <ResponsiveContainer width="100%" height="100%">
//                                 <BarChart data={paperData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
//                                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
//                                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#888'}} />
//                                     <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
//                                     <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
//                                     <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
//                                 </BarChart>
//                             </ResponsiveContainer>
//                         ) : (
//                             <div className="h-full flex items-center justify-center text-sm text-gray-400">No past paper attempts yet.</div>
//                         )}
//                     </CardContent>
//                 </Card>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                     {perf.paperAttempts.length > 0 ? perf.paperAttempts.map((a, i) => (
//                         <div key={i} className="bg-white p-4 rounded-lg border border-gray-100 flex justify-between items-center">
//                             <div>
//                                 <p className="font-bold text-gray-900 text-sm">{a.reference}</p>
//                                 <p className="text-xs text-gray-500 capitalize">{a.type} Paper • {new Date(a.date).toLocaleDateString()}</p>
//                             </div>
//                             <div className="text-right">
//                                 <p className="font-bold text-lg text-emerald-600">{a.score}%</p>
//                                 <p className="text-xs text-gray-400">{a.correct} / {a.total} correct</p>
//                             </div>
//                         </div>
//                     )) : null}
//                 </div>
//             </TabsContent>

//           </Tabs>
//         </div>
//       )}
//     </Card>
//   );
// }


// // --- MAIN PAGE LAYOUT ---
// export default function PerformancePageClient({ performances, isAdmin, currentUserId }: Props) {
//   const sorted = [...performances].sort((a, b) => b.averageScore - a.averageScore);
//   const myPerf = performances.find((p) => p.userId === currentUserId);

//   return (
//     <main className="min-h-screen bg-gray-100 p-4 lg:p-8">
//       <div className="max-w-5xl mx-auto space-y-6">

//         {/* Header */}
//         <div>
//           <Link href="/dashboard/team" className="text-sm text-gray-500 hover:text-orange-600 flex items-center gap-1 mb-3">
//             <ArrowLeft className="h-3.5 w-3.5" /> Back to team
//           </Link>
//           <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
//             <div>
//               <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
//                 <BarChart2 className="h-7 w-7 text-orange-500" />
//                 {isAdmin && performances.length > 1 ? 'Team Performance Intelligence' : 'My Performance Insights'}
//               </h1>
//               <p className="text-gray-500 text-base mt-1">
//                 {isAdmin && performances.length > 1
//                   ? `Deep dive analytics across ${performances.length} team members.`
//                   : 'Comprehensive tracking of your study sessions and exam readiness.'}
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Admin Team Average Rollup */}
//         {isAdmin && performances.length > 1 && (
//             <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none shadow-xl">
//                 <CardContent className="p-6">
//                     <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-white/10">
//                         <div className="px-4">
//                             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Avg Test Score</p>
//                             <p className="text-3xl font-black text-emerald-400">{Math.round(performances.reduce((s,p) => s+p.averageScore, 0)/performances.length)}%</p>
//                         </div>
//                         <div className="px-4">
//                             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Study Time</p>
//                             <p className="text-3xl font-black text-blue-400">{performances.reduce((s,p) => s+p.totalStudyMinutes, 0)}m</p>
//                         </div>
//                         <div className="px-4">
//                             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Tutor Sessions</p>
//                             <p className="text-3xl font-black text-purple-400">{performances.reduce((s,p) => s+p.tutorSessions.length, 0)}</p>
//                         </div>
//                         <div className="px-4">
//                             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Paper Attempts</p>
//                             <p className="text-3xl font-black text-orange-400">{performances.reduce((s,p) => s+p.paperAttempts.length, 0)}</p>
//                         </div>
//                     </div>
//                 </CardContent>
//             </Card>
//         )}

//         {/* Individual performances */}
//         <div className="space-y-4">
//           {isAdmin && performances.length > 1 ? (
//             sorted.map((perf) => (
//               <MemberPerformanceCard
//                 key={perf.userId}
//                 perf={perf}
//                 isCurrentUser={perf.userId === currentUserId}
//               />
//             ))
//           ) : (
//             myPerf ? (
//               <MemberPerformanceCard perf={myPerf} isCurrentUser={true} />
//             ) : (
//               <Card className="border-dashed">
//                 <CardContent className="py-16 text-center">
//                   <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
//                   <p className="text-gray-500 text-lg font-medium">No performance data yet</p>
//                   <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
//                     Complete a flashcard test, talk to the AI tutor, or attempt a past paper to unlock deep analytics.
//                   </p>
//                   <Link href="/dashboard" className="mt-6 inline-flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-bold transition-colors">
//                     Start studying now
//                   </Link>
//                 </CardContent>
//               </Card>
//             )
//           )}
//         </div>
//       </div>
//     </main>
//   );
// }

// app/(dashboard)/dashboard/team/performance/performance-page-client.tsx
'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { 
  BarChart2, Trophy, Brain, Clock, Target, TrendingUp, 
  ArrowLeft, Users, ChevronDown, ChevronUp, MessageSquare, RefreshCw, FileText, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { generateStudentPerformanceSummaryAction } from '../actions';
import type { MemberPerformance } from '../actions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface Props {
  performances: MemberPerformance[];
  isAdmin: boolean;
  currentUserId: number;
}

// Lightweight utility to parse basic Markdown to semantic HTML
function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';

  const lines = markdown.split('\n');
  let html = '';
  let inList = false;

  for (let line of lines) {
    let trimmed = line.trim();

    // Check for unordered lists (* or -)
    const isListItem = trimmed.startsWith('* ') || trimmed.startsWith('- ');
    if (isListItem) {
      if (!inList) {
        html += '<ul class="list-disc pl-5 my-3 space-y-1">';
        inList = true;
      }
      const itemText = trimmed.substring(2);
      html += `<li>${parseInlineFormatting(itemText)}</li>`;
      continue;
    }

    // Close list if we are exiting a list block
    if (inList && !isListItem) {
      html += '</ul>';
      inList = false;
    }

    // Handle Headings
    if (trimmed.startsWith('### ')) {
      html += `<h4 class="text-base font-bold text-orange-800 mt-4 mb-2">${parseInlineFormatting(trimmed.substring(4))}</h4>`;
    } else if (trimmed.startsWith('## ')) {
      html += `<h3 class="text-lg font-bold text-orange-950 mt-5 mb-2">${parseInlineFormatting(trimmed.substring(3))}</h3>`;
    } else if (trimmed.startsWith('# ')) {
      html += `<h2 class="text-xl font-extrabold text-orange-950 mt-6 mb-3">${parseInlineFormatting(trimmed.substring(2))}</h2>`;
    } else if (trimmed.length > 0) {
      // Normal Paragraphs
      html += `<p class="mb-3 leading-relaxed text-gray-700">${parseInlineFormatting(trimmed)}</p>`;
    }
  }

  // Ensure trailing list wrapper is closed
  if (inList) {
    html += '</ul>';
  }

  return html;
}

// Formats inline markdown (bold & italic strings)
function parseInlineFormatting(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold formatting **bold text**
    .replace(/\*(.*?)\*/g, '<em>$1</em>');           // Italic formatting *italic text*
}

function getInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400">—</span>;
  const color = score >= 80 ? 'text-green-600 bg-green-50' : score >= 60 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  return <span className={`px-2 py-1 rounded-md text-xs font-bold ${color}`}>{score}%</span>;
}

function MemberPerformanceCard({ perf, isCurrentUser }: { perf: MemberPerformance; isCurrentUser: boolean }) {
  const [expanded, setExpanded] = useState(isCurrentUser);
  const [isGenerating, startTransition] = useTransition();

  const handleGenerateSummary = () => {
    startTransition(async () => {
      await generateStudentPerformanceSummaryAction(perf.userId);
    });
  };

  // Prepare chart data
  const tutorData = perf.tutorSessions.slice().reverse().map((s, i) => ({
    name: `Session ${i+1}`,
    score: s.score || 0,
  }));

  const paperData = perf.paperAttempts.slice().reverse().map(a => ({
    name: a.reference,
    score: a.score,
  }));

  return (
    <Card className={`transition-all overflow-hidden ${isCurrentUser ? 'border-orange-300 ring-1 ring-orange-200' : 'border-gray-100'}`}>
      <CardHeader className="pb-3 cursor-pointer bg-white hover:bg-gray-50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                {getInitials(perf.name, perf.email)}
            </div>
            <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                {perf.name ?? perf.email}
                {isCurrentUser && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">You</span>}
                </h3>
                <p className="text-xs text-gray-500">{perf.email}</p>
            </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Avg Score</p>
                    <p className="text-xl font-black text-gray-900">{perf.totalTestsTaken > 0 ? `${perf.averageScore}%` : '—'}</p>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Study Time</p>
                    <p className="text-xl font-black text-gray-900">{perf.totalStudyMinutes}m</p>
                </div>
                {expanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </div>
        </div>
      </CardHeader>

      {expanded && (
        <div className="bg-gray-50 border-t border-gray-100 p-4 sm:p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3 mb-6 bg-white border border-gray-200">
              <TabsTrigger value="overview">Overview & AI</TabsTrigger>
              <TabsTrigger value="tutor">Tutor Sessions</TabsTrigger>
              <TabsTrigger value="papers">Past Papers</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <Target className="h-5 w-5 text-blue-500 mb-2" />
                      <p className="text-2xl font-bold">{perf.totalTestsTaken > 0 ? `${perf.averageScore}%` : '0'}</p>
                      <p className="text-xs text-gray-500 font-medium">Avg Flashcard Score</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <MessageSquare className="h-5 w-5 text-purple-500 mb-2" />
                      <p className="text-2xl font-bold">{perf.tutorSessions.length}</p>
                      <p className="text-xs text-gray-500 font-medium">Tutor Sessions</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <FileText className="h-5 w-5 text-green-500 mb-2" />
                      <p className="text-2xl font-bold">{perf.paperAttempts.length}</p>
                      <p className="text-xs text-gray-500 font-medium">Paper Attempts</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <Clock className="h-5 w-5 text-amber-500 mb-2" />
                      <p className="text-2xl font-bold">{perf.totalStudyMinutes}m</p>
                      <p className="text-xs text-gray-500 font-medium">Total Time</p>
                  </div>
              </div>

              {/* AI SUMMARY BOX */}
              <Card className="border-orange-200 bg-orange-50/50 shadow-inner">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2 text-orange-900">
                          <Brain className="h-5 w-5 text-orange-600" /> AI Performance Analysis
                      </CardTitle>
                      <Button variant="outline" size="sm" onClick={handleGenerateSummary} disabled={isGenerating} className="bg-white text-orange-600 border-orange-200">
                          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                          Generate New
                      </Button>
                  </CardHeader>
                  <CardContent>
                      {perf.latestAiSummary ? (
                          // Renders parsed semantic HTML styled automatically by Tailwind's typography prose
                          <div className="prose prose-sm prose-orange max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(perf.latestAiSummary) }} />
                      ) : (
                          <p className="text-sm text-gray-500 italic text-center py-4">No summary generated yet. Click generate to analyze learning data.</p>
                      )}
                  </CardContent>
              </Card>
            </TabsContent>

            {/* TUTOR SESSIONS TAB */}
            <TabsContent value="tutor" className="space-y-6">
                <Card>
                    <CardHeader><CardTitle className="text-sm text-gray-500 uppercase">Understanding Score Trend</CardTitle></CardHeader>
                    <CardContent className="h-[250px]">
                        {tutorData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={tutorData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
                                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff'}} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-gray-400">No tutor sessions completed yet.</div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-3">
                    <h4 className="font-bold text-gray-900 text-sm">Session Feedback Logs</h4>
                    {perf.tutorSessions.length > 0 ? perf.tutorSessions.map((s, i) => (
                        <div key={i} className="bg-white p-4 rounded-lg border border-gray-100 flex gap-4 items-start">
                            <div className="mt-1"><ScoreBadge score={s.score} /></div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium mb-1">
                                    {new Date(s.date).toLocaleDateString()} • {s.type === 'voice' ? '🎙️ Voice' : '💬 Text'} • {Math.round((s.duration||0)/60)} mins
                                </p>
                                <p className="text-sm text-gray-700">{s.feedback || 'No feedback recorded.'}</p>
                            </div>
                        </div>
                    )) : <p className="text-sm text-gray-400 italic">No logs available.</p>}
                </div>
            </TabsContent>

            {/* PAST PAPERS TAB */}
            <TabsContent value="papers" className="space-y-6">
                <Card>
                    <CardHeader><CardTitle className="text-sm text-gray-500 uppercase">Worksheet & Exam Scores</CardTitle></CardHeader>
                    <CardContent className="h-[250px]">
                        {paperData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={paperData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#888'}} />
                                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-gray-400">No past paper attempts yet.</div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {perf.paperAttempts.length > 0 ? perf.paperAttempts.map((a, i) => (
                        <div key={i} className="bg-white p-4 rounded-lg border border-gray-100 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-gray-900 text-sm">{a.reference}</p>
                                <p className="text-xs text-gray-500 capitalize">{a.type} Paper • {new Date(a.date).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg text-emerald-600">{a.score}%</p>
                                <p className="text-xs text-gray-400">{a.correct} / {a.total} correct</p>
                            </div>
                        </div>
                    )) : null}
                </div>
            </TabsContent>

          </Tabs>
        </div>
      )}
    </Card>
  );
}


// --- MAIN PAGE LAYOUT ---
export default function PerformancePageClient({ performances, isAdmin, currentUserId }: Props) {
  const sorted = [...performances].sort((a, b) => b.averageScore - a.averageScore);
  const myPerf = performances.find((p) => p.userId === currentUserId);

  return (
    <main className="min-h-screen bg-gray-100 p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <Link href="/dashboard/team" className="text-sm text-gray-500 hover:text-orange-600 flex items-center gap-1 mb-3">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to team
          </Link>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
                <BarChart2 className="h-7 w-7 text-orange-500" />
                {isAdmin && performances.length > 1 ? 'Team Performance Intelligence' : 'My Performance Insights'}
              </h1>
              <p className="text-gray-500 text-base mt-1">
                {isAdmin && performances.length > 1
                  ? `Deep dive analytics across ${performances.length} team members.`
                  : 'Comprehensive tracking of your study sessions and exam readiness.'}
              </p>
            </div>
          </div>
        </div>

        {/* Admin Team Average Rollup */}
        {isAdmin && performances.length > 1 && (
            <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none shadow-xl">
                <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-white/10">
                        <div className="px-4">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Avg Test Score</p>
                            <p className="text-3xl font-black text-emerald-400">{Math.round(performances.reduce((s,p) => s+p.averageScore, 0)/performances.length)}%</p>
                        </div>
                        <div className="px-4">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Study Time</p>
                            <p className="text-3xl font-black text-blue-400">{performances.reduce((s,p) => s+p.totalStudyMinutes, 0)}m</p>
                        </div>
                        <div className="px-4">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Tutor Sessions</p>
                            <p className="text-3xl font-black text-purple-400">{performances.reduce((s,p) => s+p.tutorSessions.length, 0)}</p>
                        </div>
                        <div className="px-4">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Paper Attempts</p>
                            <p className="text-3xl font-black text-orange-400">{performances.reduce((s,p) => s+p.paperAttempts.length, 0)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )}

        {/* Individual performances */}
        <div className="space-y-4">
          {isAdmin && performances.length > 1 ? (
            sorted.map((perf) => (
              <MemberPerformanceCard
                key={perf.userId}
                perf={perf}
                isCurrentUser={perf.userId === currentUserId}
              />
            ))
          ) : (
            myPerf ? (
              <MemberPerformanceCard perf={myPerf} isCurrentUser={true} />
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center">
                  <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">No performance data yet</p>
                  <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
                    Complete a flashcard test, talk to the AI tutor, or attempt a past paper to unlock deep analytics.
                  </p>
                  <Link href="/dashboard" className="mt-6 inline-flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-bold transition-colors">
                    Start studying now
                  </Link>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>
    </main>
  );
}