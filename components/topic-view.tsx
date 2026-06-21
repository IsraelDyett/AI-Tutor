// // components/topic-view.tsx
// 'use client';

// import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
// import Link from 'next/link';
// import { useRouter } from 'next/navigation';
// import { getUser, getUserWithTeam } from '@/lib/db/queries';
// import { 
//     Brain, FileText, MessageCircle, Mic, ArrowLeft, 
//     RefreshCw, Trophy, ChevronDown, ChevronUp, Eye, EyeOff, Send, Loader2, X,
//     CheckCircle, XCircle, CheckSquare // Added newly used icons
// } from 'lucide-react';

// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Textarea } from '@/components/ui/textarea'; // Added Textarea

// import { saveLessonProgress, clearLessonProgress } from '@/app/(dashboard)/lesson-progress-actions';
// import LiveAudioComponent, { type LessonProgress } from '@/components/live-simulation-component';
// import FlashcardGenerator from '@/components/flashcard-generator';
// import PastPaperGenerator from '@/components/past-paper-generator';
// import KnowledgeUploader from '@/components/knowledge-uploader';
// import TopicSettingsDialog from '@/components/topic-settings-dialog';
// import TextTutorChat from '@/components/text-tutor-chat';
// import FlashcardTestModal from '@/components/flashcard-test-modal';
// import { savePastPaperAttemptAction, saveVoiceSessionAction, evaluateAnswerWithAIAction  } from '@/app/(dashboard)/actions';
// import type { ActualPastPaperQuestion } from '@/lib/db/schema';



// interface Flashcard {
//     id?: number;
//     front: string;
//     back: string;
//     topic?: string;
// }

// interface Question {
//     id: number;
//     year: string;
//     question: string;
//     answerMarkdown: string;
//     explanationMarkdown?: string;
//     topic?: string;
//     worksheetName?: string;     // Added
//     worksheetNumber?: number;
// }

// interface TopicViewProps {
//     level: string;
//     subject: string;
//     topicId: string;
//     topicName: string;
//     isAllTopics: boolean;
//     flashcards: Flashcard[];
//     questions: Question[];
//     actualQuestions?: ActualPastPaperQuestion[];
//     voicePrompt: string;
//     backgroundContext?: string;
//     lessonPlan?: string;
//     initialBestScore?: { score: number; totalQuestions: number } | null;
//     canEdit: boolean;
//     initialLessonProgress?: LessonProgress | null;
//     preloadedVoiceContext?: string;
//     userRole?: string;
// }

// interface EvaluationResult {
//     score: number;
//     isCorrect: boolean;
//     feedback?: string;     
//     isEvaluating?: boolean;
// }

// // Lightweight similarity algorithm (Sørensen–Dice coefficient)
// function getDiceCoefficient(s1: string, s2: string): number {
//     const clean1 = s1.replace(/<[^>]*>?/gm, '').replace(/[^\w\s]/gi, '').toLowerCase().trim();
//     const clean2 = s2.replace(/<[^>]*>?/gm, '').replace(/[^\w\s]/gi, '').toLowerCase().trim();
    
//     if (clean1 === clean2) return 100;
//     if (clean1.length < 2 || clean2.length < 2) return 0;

//     let bigrams1 = new Map<string, number>();
//     for (let i = 0; i < clean1.length - 1; i++) {
//         const bg = clean1.substring(i, i + 2);
//         bigrams1.set(bg, (bigrams1.get(bg) || 0) + 1);
//     }

//     let intersectionSize = 0;
//     for (let i = 0; i < clean2.length - 1; i++) {
//         const bg = clean2.substring(i, i + 2);
//         const count = bigrams1.get(bg);
//         if (count && count > 0) {
//             bigrams1.set(bg, count - 1);
//             intersectionSize++;
//         }
//     }

//     const score = (2.0 * intersectionSize) / (clean1.length - 1 + clean2.length - 1);
//     return Math.min(Math.round(score * 100), 100);
// }


// function ActualQuestionItem({ 
//     q, 
//     userAnswer, 
//     evalResult, 
//     hasAttempted,
//     onAnswerChange, 
//     onSubmitAnswer 
// }: { 
//     q: any; 
//     userAnswer: string; 
//     evalResult?: EvaluationResult; 
//     hasAttempted: boolean;
//     onAnswerChange: (val: string) => void; 
//     onSubmitAnswer: () => void;
// }) {
//     const [showAnswer, setShowAnswer] = useState(false);
//     const [isChatOpen, setIsChatOpen] = useState(false);
//     const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
//     const [input, setInput] = useState('');
//     const [isTyping, setIsTyping] = useState(false);
//     //const [hasAttempted, setHasAttempted] = useState(false);

//     // useEffect(() => {
//     //     if (evalResult) {
//     //         setHasAttempted(true);
//     //     }
//     // }, [evalResult]);

//     const handleSend = async () => {
//         if (!input.trim() || isTyping) return;
//         const userMsg = { role: 'user', content: input };
//         setMessages(prev => [...prev, userMsg as any]);
//         setInput('');
//         setIsTyping(true);

//         try {
//             const res = await fetch('/api/ai/past-paper-tutor', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     questionData: q,
//                     history: [...messages, userMsg]
//                 })
//             });
//             const data = await res.json();
//             setMessages(prev => [...prev, { role: 'ai', content: data.text }]);
//         } catch (e) {
//             console.error("Tutor error", e);
//         } finally {
//             setIsTyping(false);
//         }
//     };

//     return (
//         <div className="border-b border-gray-100 last:border-0 py-6">
//             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
//                 <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded whitespace-nowrap">
//                     Question {q.questionNumber} ({q.marks} Marks)
//                 </span>
//                 {hasAttempted && (
//                     <div className="flex w-full sm:w-auto gap-2">
//                         <Button 
//                             variant="outline" 
//                             size="sm" 
//                             onClick={() => setIsChatOpen(!isChatOpen)}
//                             className={`h-8 flex-1 sm:flex-none transition-colors ${isChatOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'text-gray-500'}`}
//                         >
//                             <MessageCircle className="h-4 w-4 mr-1.5 shrink-0" />
//                             <span className="whitespace-nowrap">{isChatOpen ? "Close Tutor" : "Ask Tutor"}</span>
//                         </Button>
//                         <Button 
//                             variant="ghost" 
//                             size="sm" 
//                             onClick={() => setShowAnswer(!showAnswer)} 
//                             className="text-blue-600 h-8 flex-1 sm:flex-none bg-blue-50/50 sm:bg-transparent ring-1 ring-blue-100 sm:ring-0"
//                         >
//                             {showAnswer ? <EyeOff className="h-4 w-4 mr-1.5 shrink-0" /> : <Eye className="h-4 w-4 mr-1.5 shrink-0" />}
//                             <span className="whitespace-nowrap">{showAnswer ? "Hide Answer" : "Show Answer"}</span>
//                         </Button>
//                     </div>
//                 )}
//             </div>

//             <div className="prose prose-slate max-w-none actual-paper-content" dangerouslySetInnerHTML={{ __html: q.questionHtml }} />

//             {/* AI Tutor Chat Interface */}
//             {isChatOpen && hasAttempted && (
//                 <div className="mt-4 border border-blue-100 rounded-xl bg-blue-50/30 overflow-hidden shadow-inner">
//                     <div className="p-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
//                         <span className="text-xs font-bold text-blue-700 flex items-center">
//                             <Brain className="h-3 w-3 mr-1.5" /> PERSONAL TUTOR: QUESTION {q.questionNumber}
//                         </span>
//                         <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)} className="h-6 w-6 text-blue-400">
//                             <X className="h-3 w-3" />
//                         </Button>
//                     </div>
                    
//                     <div className="p-4 max-h-60 overflow-y-auto space-y-3">
//                         {messages.length === 0 && (
//                             <p className="text-sm text-blue-600 italic">"Hi! I can help you understand the logic behind this question or explain the topic. What's on your mind?"</p>
//                         )}
//                         {messages.map((m, i) => (
//                             <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
//                                 <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
//                                     m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-blue-100'
//                                 }`}>
//                                     <div dangerouslySetInnerHTML={{ __html: m.content }} />
//                                 </div>
//                             </div>
//                         ))}
//                         {isTyping && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
//                     </div>

//                     <div className="p-3 bg-white border-t border-blue-100 flex gap-2">
//                         <input 
//                             type="text" 
//                             value={input}
//                             onChange={(e) => setInput(e.target.value)}
//                             onKeyDown={(e) => e.key === 'Enter' && handleSend()}
//                             placeholder="Ask about this question..."
//                             className="flex-1 text-sm border-none focus:ring-0 outline-none px-2"
//                         />
//                         <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="h-8 w-8 bg-blue-600">
//                             <Send className="h-3 w-3" />
//                         </Button>
//                     </div>
//                 </div>
//             )}

//             {/* Answer Input & Evaluation */}
//             <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
//                 <label className="text-xs font-bold text-slate-600 mb-2 block uppercase tracking-wider">Your Answer:</label>
//                 <Textarea 
//                     placeholder="Type your answer here..." 
//                     value={userAnswer}
//                     onChange={(e) => onAnswerChange(e.target.value)}
//                     className="w-full text-sm resize-y min-h-[100px] mb-3 bg-white"
//                 />
//                 <div className="flex justify-between items-center">
//                     <Button 
//                         onClick={onSubmitAnswer} 
//                         size="sm" 
//                         variant="secondary" 
//                         disabled={!userAnswer.trim()}
//                         className="bg-blue-600 text-white hover:bg-blue-700"
//                     >
//                         Submit Answer
//                     </Button>
//                     {evalResult && (
//                         <div className={`text-sm font-bold flex items-center px-3 py-1.5 rounded-lg border ${
//                             evalResult.isCorrect 
//                                 ? 'bg-green-50 text-green-700 border-green-200' 
//                                 : 'bg-red-50 text-red-700 border-red-200'
//                         }`}>
//                             {evalResult.isCorrect ? <CheckCircle className="h-4 w-4 mr-1.5" /> : <XCircle className="h-4 w-4 mr-1.5" />}
//                             {evalResult.isCorrect ? 'Correct' : 'Needs Review'} ({evalResult.score}% Match)
//                         </div>
//                     )}
//                 </div>
//             </div>

//             {showAnswer && hasAttempted && (
//                 <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg">
//                     <p className="text-xs font-bold text-green-700 mb-2 uppercase">Model Answer:</p>
//                     <div className="prose prose-green max-w-none" dangerouslySetInnerHTML={{ __html: q.answerHtml }} />
//                     {q.workingHtml && (
//                         <div 
//                              className="mt-3 pt-3 border-t border-green-200 italic text-sm text-green-800"
//                             dangerouslySetInnerHTML={{ __html: q.workingHtml }} 
//                          />
//                     )}
//                 </div>
//             )}
//         </div>
//     );
// }

// function GeneratedQuestionItem({ 
//     q, 
//     userAnswer, 
//     evalResult, 
//     hasAttempted,
//     onAnswerChange, 
//     onSubmitAnswer 
// }: { 
//     q: Question; 
//     userAnswer: string; 
//     evalResult?: EvaluationResult; 
//     hasAttempted: boolean;
//     onAnswerChange: (val: string) => void; 
//     onSubmitAnswer: () => void;
// }) {
//     const [showAnswer, setShowAnswer] = useState(false);
//     const [isChatOpen, setIsChatOpen] = useState(false);
//     const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
//     const [input, setInput] = useState('');
//     const [isTyping, setIsTyping] = useState(false);
//     //const [hasAttempted, setHasAttempted] = useState(false);

//     // useEffect(() => {
//     //     if (evalResult) {
//     //         setHasAttempted(true);
//     //     }
//     // }, [evalResult]);

//     const handleSend = async () => {
//         if (!input.trim() || isTyping) return;
//         const userMsg = { role: 'user', content: input };
//         setMessages(prev => [...prev, userMsg as any]);
//         setInput('');
//         setIsTyping(true);

//         try {
//             const res = await fetch('/api/ai/past-paper-tutor', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     questionData: q,
//                     history: [...messages, userMsg]
//                 })
//             });
//             const data = await res.json();
//             setMessages(prev => [...prev, { role: 'ai', content: data.text }]);
//         } catch (e) {
//             console.error("Tutor error", e);
//         } finally {
//             setIsTyping(false);
//         }
//     };

//     return (
//         <div className="border-b border-gray-100 last:border-0 py-6">
//             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
//                 <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded whitespace-nowrap">
//                     Year: {q.year}
//                 </span>
//                 {hasAttempted && (
//                     <div className="flex w-full sm:w-auto gap-2">
//                         <Button 
//                             variant="outline" 
//                             size="sm" 
//                             onClick={() => setIsChatOpen(!isChatOpen)}
//                             className={`h-8 flex-1 sm:flex-none transition-colors ${isChatOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'text-gray-500'}`}
//                         >
//                             <MessageCircle className="h-4 w-4 mr-1.5 shrink-0" />
//                             <span className="whitespace-nowrap">{isChatOpen ? "Close Tutor" : "Ask Tutor"}</span>
//                         </Button>
//                         <Button 
//                             variant="ghost" 
//                             size="sm" 
//                             onClick={() => setShowAnswer(!showAnswer)} 
//                             className="text-blue-600 h-8 flex-1 sm:flex-none bg-blue-50/50 sm:bg-transparent ring-1 ring-blue-100 sm:ring-0"
//                         >
//                             {showAnswer ? <EyeOff className="h-4 w-4 mr-1.5 shrink-0" /> : <Eye className="h-4 w-4 mr-1.5 shrink-0" />}
//                             <span className="whitespace-nowrap">{showAnswer ? "Hide Answer" : "Show Answer"}</span>
//                         </Button>
//                     </div>
//                 )}
//             </div>

//             <p className="font-medium mb-4 text-gray-900 leading-relaxed">{q.question}</p>

//             {/* AI Tutor Chat Interface */}
//             {isChatOpen && hasAttempted && (
//                 <div className="mt-4 border border-blue-100 rounded-xl bg-blue-50/30 overflow-hidden shadow-inner">
//                     <div className="p-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
//                         <span className="text-xs font-bold text-blue-700 flex items-center">
//                             <Brain className="h-3 w-3 mr-1.5" /> PERSONAL TUTOR: GENERATED QUESTION
//                         </span>
//                         <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)} className="h-6 w-6 text-blue-400">
//                             <X className="h-3 w-3" />
//                         </Button>
//                     </div>
                    
//                     <div className="p-4 max-h-60 overflow-y-auto space-y-3">
//                         {messages.length === 0 && (
//                             <p className="text-sm text-blue-600 italic">"Hi! I can help you understand the logic behind this question or explain the topic. What's on your mind?"</p>
//                         )}
//                         {messages.map((m, i) => (
//                             <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
//                                 <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
//                                     m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-blue-100'
//                                 }`}>
//                                     <div dangerouslySetInnerHTML={{ __html: m.content }} />
//                                 </div>
//                             </div>
//                         ))}
//                         {isTyping && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
//                     </div>

//                     <div className="p-3 bg-white border-t border-blue-100 flex gap-2">
//                         <input 
//                             type="text" 
//                             value={input}
//                             onChange={(e) => setInput(e.target.value)}
//                             onKeyDown={(e) => e.key === 'Enter' && handleSend()}
//                             placeholder="Ask about this question..."
//                             className="flex-1 text-sm border-none focus:ring-0 outline-none px-2"
//                         />
//                         <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="h-8 w-8 bg-blue-600">
//                             <Send className="h-3 w-3" />
//                         </Button>
//                     </div>
//                 </div>
//             )}

//             {/* Answer Input & Evaluation */}
//             <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
//                 <label className="text-xs font-bold text-slate-600 mb-2 block uppercase tracking-wider">Your Answer:</label>
//                 <Textarea 
//                     placeholder="Type your answer here..." 
//                     value={userAnswer}
//                     onChange={(e) => onAnswerChange(e.target.value)}
//                     className="w-full text-sm resize-y min-h-[100px] mb-3 bg-white"
//                 />
//                 <div className="flex justify-between items-center">
//                     <Button 
//                         onClick={onSubmitAnswer} 
//                         size="sm" 
//                         variant="secondary" 
//                         disabled={!userAnswer.trim()}
//                         className="bg-blue-600 text-white hover:bg-blue-700"
//                     >
//                         Submit Answer
//                     </Button>
//                     {evalResult && (
//                         <div className={`text-sm font-bold flex items-center px-3 py-1.5 rounded-lg border ${
//                             evalResult.isCorrect 
//                                 ? 'bg-green-50 text-green-700 border-green-200' 
//                                 : 'bg-red-50 text-red-700 border-red-200'
//                         }`}>
//                             {evalResult.isCorrect ? <CheckCircle className="h-4 w-4 mr-1.5" /> : <XCircle className="h-4 w-4 mr-1.5" />}
//                             {evalResult.isCorrect ? 'Correct' : 'Needs Review'} ({evalResult.score}% Match)
//                         </div>
//                     )}
//                 </div>
//             </div>

//             {showAnswer && hasAttempted &&(
//                 <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg">
//                     <p className="text-xs font-bold text-green-700 mb-2 uppercase">Model Answer:</p>
//                     <div className="prose prose-sm prose-green max-w-none" dangerouslySetInnerHTML={{ __html: q.answerMarkdown }} />
//                     {q.explanationMarkdown && (
//                         <div className="mt-3 pt-3 border-t border-green-200">
//                             <p className="text-xs font-bold text-green-700 mb-1 uppercase">Explanation:</p>
//                             <div className="prose prose-sm prose-green max-w-none italic" dangerouslySetInnerHTML={{ __html: q.explanationMarkdown }} />
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );
// }

// function FlashcardItem({ card, isAllTopics }: { card: Flashcard; isAllTopics: boolean }) {
//     const [isFlipped, setIsFlipped] = useState(false);

//     return (
//         <div
//             className="group perspective-1000 h-64 cursor-pointer"
//             onClick={() => setIsFlipped(!isFlipped)}
//         >
//             <div className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
//                 {/* Front Face */}
//                 <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
//                     <Card className="h-full flex flex-col justify-center items-center text-center p-6 hover:shadow-lg transition-shadow border-orange-100 relative">
//                         {isAllTopics && card.topic && (
//                             <span className="absolute top-4 right-4 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
//                                 {card.topic}
//                             </span>
//                         )}
//                         <div className="flex-1 flex flex-col justify-center items-center overflow-y-auto w-full">
//                             <p className="font-medium text-lg text-gray-800">{card.front}</p>
//                         </div>
//                         <span className="text-xs text-gray-400 mt-4 md:block hidden">Hover or tap to reveal</span>
//                         <span className="text-xs text-gray-400 mt-4 md:hidden block">Tap to reveal</span>
//                     </Card>
//                 </div>

//                 {/* Back Face */}
//                 <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
//                     <Card className="h-full flex flex-col justify-center items-center text-center p-6 bg-orange-50 border-orange-200 shadow-md relative">
//                         {isAllTopics && card.topic && (
//                             <span className="absolute top-4 right-4 text-xs font-bold text-orange-600 bg-white px-2 py-1 rounded-full">
//                                 {card.topic}
//                             </span>
//                         )}
//                         <div className="flex-1 flex flex-col justify-center items-center overflow-y-auto w-full">
//                             <p className="text-orange-700 font-bold text-lg">{card.back}</p>
//                         </div>
//                     </Card>
//                 </div>
//             </div>
//         </div>
//     );
// }

// export default function TopicView({
//     level,
//     subject,
//     topicId,
//     topicName,
//     isAllTopics,
//     flashcards,
//     questions,
//     actualQuestions = [],
//     voicePrompt,
//     backgroundContext = "",
//     lessonPlan = "",
//     initialBestScore = null,
//     canEdit = false,
//     initialLessonProgress = null,
//     preloadedVoiceContext = '',
//     userRole = '', // Read the passed-in role
// }: TopicViewProps) {
//     const [activeTab, setActiveTab] = useState('voice');
//     const [isTestOpen, setIsTestOpen] = useState(false);
//     const [bestScore, setBestScore] = useState(initialBestScore); 

//     // Submission and evaluation states
//     const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
//     const [evaluations, setEvaluations] = useState<Record<string, EvaluationResult>>({});
//     const [attemptedQuestions, setAttemptedQuestions] = useState<Record<string, boolean>>({}); 
//     const [expandedWorksheets, setExpandedWorksheets] = useState<Record<string, boolean>>({});


//     const isVoiceActiveRef = useRef(false);
//     const voiceSessionStartRef = useRef<number>(Date.now());
//     const textTutorSaveRef = useRef<(() => void) | null>(null);


//     useEffect(() => {
//         // Called when the component unmounts (user navigates away, closes tab, etc.)
//         return () => {
//         if (!isVoiceActiveRef.current) return;
    
//         const durationSeconds = Math.round((Date.now() - voiceSessionStartRef.current) / 1000);
//         if (durationSeconds < 30) return;
    
//         const progress = lessonProgressRef.current;
    
//         // sendBeacon is the only reliable way to send data during page unload.
//         // It fires a POST even when the page is closing.
//         // We use a dedicated lightweight API route for this.
//         const payload = JSON.stringify({
//             topicId: topicId === 'all' ? null : parseInt(topicId),
//             durationSeconds,
//             topicsIntroduced: progress.topicsIntroduced,
//             topicsConfirmed: progress.topicsConfirmed,
//             studentMisconceptions: progress.studentMisconceptions,
//             lastSummary: progress.lastSummary,
//         });
    
//         navigator.sendBeacon('/api/sessions/save-voice', payload);
//         };
//     }, []);

//     const lessonProgressRef = useRef<LessonProgress>(initialLessonProgress || {
//         topicsIntroduced: [],
//         topicsConfirmed: [],
//         currentTopic: '',
//         studentMisconceptions: [],
//         lastSummary: '',
//         sessionCount: 0,
//       });


//     const handleVoiceConversationEnd = useCallback(async (
//         blob: Blob,
//         progress: LessonProgress
//       ) => {
//         isVoiceActiveRef.current = false; 
//         // Calculate duration from when recording started
//         const durationSeconds = Math.round((Date.now() - voiceSessionStartRef.current) / 1000);
    
//         // Only save if session was meaningful (more than 30 seconds)
//         if (durationSeconds < 30) return;
    
//         await saveVoiceSessionAction({
//           topicId: topicId === 'all' ? null : parseInt(topicId),
//           durationSeconds,
//           topicsIntroduced: progress.topicsIntroduced,
//           topicsConfirmed: progress.topicsConfirmed,
//           studentMisconceptions: progress.studentMisconceptions,
//           lastSummary: progress.lastSummary,
//         });
//       }, [topicId]);
//     // Default to 'generated' if there are no actual past papers
//     const [paperType, setPaperType] = useState<'actual' | 'generated'>(
//         actualQuestions && actualQuestions.length > 0 ? 'actual' : 'generated'
//     );
    
//     const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});
//     const router = useRouter();

//     const handleLessonProgressUpdate = useCallback(async (progress: LessonProgress) => {
//         lessonProgressRef.current = progress; // ← ADD THIS LINE
//         if (topicId !== 'all') {
//           const numericId = parseInt(topicId);
//           if (!isNaN(numericId)) {
//             await saveLessonProgress(numericId, progress);
//           }
//         }
//       }, [topicId]);

//     // Handle answer input change
//     const handleAnswerChange = (id: string, text: string) => {
//         setUserAnswers(prev => ({ ...prev, [id]: text }));
//         // Clear evaluation when user continues typing
//         if (evaluations[id]) {
//             setEvaluations(prev => {
//                 const newEv = { ...prev };
//                 delete newEv[id];
//                 return newEv;
//             });
//         }
//     };

//     // Calculate score for a single answer
//     const evaluateAnswer = (id: string, userAnswer: string, modelAnswer: string) => {
//         const score = getDiceCoefficient(userAnswer, modelAnswer);
//         const isCorrect = score >= 65; // Matches 65% - 100%
//         setEvaluations(prev => ({ ...prev, [id]: { score, isCorrect } }));
//         setAttemptedQuestions(prev => ({ ...prev, [id]: true }));
//     };

//     // Handle single Submit
//     const handleEvaluateSingle = (id: string, modelAnswer: string) => {
//         const ans = userAnswers[id] || '';
//         if (!ans.trim()) return;
//         evaluateAnswer(id, ans, modelAnswer);
//     };


//     const handleSubmitAll = async () => {
//         if (paperType === 'actual') {
//             const grouped: Record<number, any[]> = {};
//             actualQuestions.forEach(q => {
//                 const id = `actual-${q.id}`;
//                 if (userAnswers[id]?.trim()) {
//                     if (!grouped[q.year]) grouped[q.year] = [];
//                     grouped[q.year].push(q);
//                 }
//             });

//             for (const [year, qs] of Object.entries(grouped)) {
//                 let correct = 0;
//                 let total = 0;
//                 qs.forEach(q => {
//                     const id = `actual-${q.id}`;
//                     total++;
//                     const score = getDiceCoefficient(userAnswers[id], q.answerHtml || '');
//                     const isCorrect = score >= 65;
//                     if (isCorrect) correct++;
                    
//                     setEvaluations(prev => ({ ...prev, [id]: { score, isCorrect } }));
//                     setAttemptedQuestions(prev => ({ ...prev, [id]: true }));
//                 });

//                 if (total > 0) {
//                     await savePastPaperAttemptAction({
//                         topicId: topicId === 'all' ? -1 : parseInt(topicId),
//                         paperType: 'actual',
//                         reference: `${year} Examination`,
//                         correctQuestions: correct,
//                         totalQuestions: total
//                     });
//                 }
//             }
//         } else {
//             // Group dynamic generated questions by Worksheet
//             const grouped: Record<string, any[]> = {};
//             questions.forEach(q => {
//                 const id = `generated-${q.id}`;
//                 if (userAnswers[id]?.trim()) {
//                     let key = "Worksheet 1";
//                     if (q.worksheetName) {
//                         key = q.worksheetName;
//                     } else if (q.worksheetNumber) {
//                         key = `Worksheet ${q.worksheetNumber}`;
//                     }
//                     if (!grouped[key]) grouped[key] = [];
//                     grouped[key].push(q);
//                 }
//             });

//             for (const [worksheetKey, qs] of Object.entries(grouped)) {
//                 let correct = 0;
//                 let total = 0;
//                 qs.forEach(q => {
//                     const id = `generated-${q.id}`;
//                     total++;
//                     const score = getDiceCoefficient(userAnswers[id], q.answerMarkdown || '');
//                     const isCorrect = score >= 65;
//                     if (isCorrect) correct++;
                    
//                     setEvaluations(prev => ({ ...prev, [id]: { score, isCorrect } }));
//                     setAttemptedQuestions(prev => ({ ...prev, [id]: true }));
//                 });

//                 if (total > 0) {
//                     await savePastPaperAttemptAction({
//                         topicId: topicId === 'all' ? -1 : parseInt(topicId),
//                         paperType: 'generated',
//                         reference: worksheetKey,
//                         correctQuestions: correct,
//                         totalQuestions: total
//                     });
//                 }
//             }
//         }
//     };


//     const groupedGenerated = useMemo(() => {
//         const groups: Record<string, any[]> = {};
//         questions.forEach((q: any) => {
//             let key = "Worksheet 1";
//             if (q.worksheetName) {
//                 key = q.worksheetName;
//             } else if (q.worksheetNumber) {
//                 key = `Worksheet ${q.worksheetNumber}`;
//             }
//             if (!groups[key]) groups[key] = [];
//             groups[key].push(q);
//         });
//         return groups;
//     }, [questions]);

//     const contextPrompt = useMemo(() => {
//         let context = `\n\n--- Background Subject Context (Syllabus/Manual) ---\n${backgroundContext}\n\n`;
//         context += `\n\nHere is the Context Data (Use this to help the student, refer to specific cards or questions if relevant):\n`;

//         if (flashcards && flashcards.length > 0) {
//             context += `\n--- Flashcards ---\n`;
//             flashcards.forEach((card, i) => {
//                 context += `${i + 1}. Front: "${card.front}" | Back: "${card.back}"\n`;
//             });
//         } else {
//             context += `\n(No flashcards available)\n`;
//         }

//         if (questions && questions.length > 0) {
//             context += `\n--- Past Paper Questions ---\n`;
//             questions.forEach((q, i) => {
//                 context += `${i + 1}. [Year: ${q.year}] Q: "${q.question}"\n   A: "${q.answerMarkdown}"\n`;
//             });
//         } else {
//             context += `\n(No past paper questions available)\n`;
//         }

//         return voicePrompt + context;
//     }, [flashcards, questions, voicePrompt, backgroundContext]);

//     // Group actual questions by Year
//     const groupedActual = useMemo(() => {
//         const groups: Record<number, any[]> = {};
//         actualQuestions.forEach((q: any) => {
//             if (!groups[q.year]) groups[q.year] = [];
//             groups[q.year].push(q);
//         });
//         return groups;
//     }, [actualQuestions]);

//     const toggleYear = (year: number) => {
//         setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
//     };

//     const toggleWorksheet = (name: string) => {
//         setExpandedWorksheets(prev => ({ ...prev, [name]: !prev[name] }));
//     };

//     return (
//         <div className="max-w-6xl mx-auto space-y-6">
//             {/* Navigation & Header */}
//             <div>
//                 <Link href={`/dashboard/${level}/subjects/${subject}`} className="text-sm text-gray-500 hover:text-orange-600 mb-2 flex items-center">
//                     <ArrowLeft className="h-4 w-4 mr-1" /> Back to {subject}
//                 </Link>
//                 <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
//                     <div>
//                         <h1 className="text-3xl font-extrabold text-gray-900">{topicName}</h1>
//                         <p className="text-gray-600">
//                             {isAllTopics
//                                 ? "Comprehensive review of all topics in this subject."
//                                 : "Master the building blocks of life."}
//                         </p>
//                     </div>
//                     {canEdit && !isAllTopics && (
//                         <div className="flex gap-2">
//                             <KnowledgeUploader topicId={topicId} topicName={topicName} />
//                             <TopicSettingsDialog
//                                 topicId={topicId}
//                                 topicName={topicName}
//                                 initialLessonPlan={lessonPlan}
//                             />
//                         </div>
//                     )}
//                     {/* Generator & Test Component */}
//                     {activeTab === 'flashcards' && (
//                         <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
//                             {flashcards.length > 0 && (
//                                 <div className="flex flex-col items-start sm:items-end flex-1 sm:flex-none">
//                                     {bestScore && (
//                                         <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 shadow-sm mb-2">
//                                             <Trophy className="h-3.5 w-3.5" /> Best: {bestScore.score}/{bestScore.totalQuestions}
//                                         </div>
//                                     )}
//                                     <Button
//                                         onClick={() => setIsTestOpen(true)}
//                                         className="bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all px-6 font-bold w-full sm:w-auto"
//                                     >
//                                         Test Yourself
//                                     </Button>
//                                 </div>
//                             )}
//                             {!isAllTopics && (
//                                 <div className="flex-1 sm:flex-none">
//                                     <FlashcardGenerator
//                                         subject={subject}
//                                         topicId={topicId}
//                                         topicName={topicName}
//                                         onSaved={() => router.refresh()}
//                                     />
//                                 </div>
//                             )}
//                         </div>
//                     )}
//                     {!isAllTopics && activeTab === 'pastpapers' && (
//                         <div className="w-full sm:w-auto">
//                             <PastPaperGenerator
//                                 subject={subject}
//                                 topicId={topicId}
//                                 topicName={topicName}
//                                 onSaved={() => router.refresh()}
//                             />
//                         </div>
//                     )}
//                 </div>
//             </div>

//             <Tabs defaultValue="voice" className="w-full" onValueChange={(newTab) => {
//                 // If switching AWAY from text tab, trigger text session save
//                 if (activeTab === 'text' && newTab !== 'text') {
//                 // The TextTutorChat useEffect cleanup will handle this
//                 // because React will re-render but not unmount on tab switch.
//                 // Signal it via a ref instead:
//                 textTutorSaveRef.current?.();
//                 }
//                 setActiveTab(newTab);
//             }}>
//                 <div className="overflow-x-auto pb-2 -mx-2 px-2 custom-scrollbar">
//                     <TabsList className="flex w-max min-w-full lg:grid lg:w-[500px] lg:grid-cols-4">
//                         <TabsTrigger value="voice" className="flex-1">Voice Tutor</TabsTrigger>
//                         <TabsTrigger value="text" className="flex-1">Text Tutor</TabsTrigger>
//                         <TabsTrigger value="flashcards" className="flex-1">Flashcards</TabsTrigger>
//                         <TabsTrigger value="pastpapers" className="flex-1">Past Papers</TabsTrigger>
//                     </TabsList>
//                 </div>

//                 {/* Voice Tutor Tab */}
//                 <TabsContent value="voice" className="mt-6">
//                     <Card className="border-orange-200 shadow-md">
//                         <CardHeader className="bg-gradient-to-r from-orange-50 to-white border-b border-orange-100">
//                             <CardTitle className="flex items-center text-orange-700">
//                                 <Mic className="h-5 w-5 mr-2" />
//                                 Voice Tutor Session {isAllTopics ? "(General)" : ""}
//                             </CardTitle>
//                         </CardHeader>
//                         <CardContent className="p-0 min-h-[500px] relative">
//                             <div className="h-[500px]">
//                                 <LiveAudioComponent
//                                     prompt={contextPrompt}
//                                     topicId={topicId === 'all' ? -1 : parseInt(topicId)}
//                                     topicIds={topicId === 'all' ? undefined : [parseInt(topicId)]} 
//                                     subject={subject}
//                                     level={level}
//                                     onConversationEnd={(blob) => {
//                                         // Reset start time for next session
//                                         voiceSessionStartRef.current = Date.now();
//                                         // Pass current lesson progress to the save handler
//                                         handleVoiceConversationEnd(blob, lessonProgressRef.current);
//                                       }}
//                                     onSessionStart={() => {         // ← ADD this prop
//                                         isVoiceActiveRef.current = true;
//                                         voiceSessionStartRef.current = Date.now();
//                                       }}
//                                     isEnding={false}
//                                     onLessonProgressUpdate={handleLessonProgressUpdate}   
//                                     initialLessonProgress={initialLessonProgress} 
//                                     preloadedContext={preloadedVoiceContext}
//                                 />
//                             </div>
//                         </CardContent>
//                     </Card>
//                 </TabsContent>

//                 {/* Text Tutor Tab */}
//                 <TabsContent value="text" className="mt-6">
//                     <TextTutorChat
//                         level={level}
//                         contextPrompt={contextPrompt}
//                         topicName={topicName}
//                         subject={subject}
//                         topicId={topicId}
//                         saveRef={textTutorSaveRef}
//                     />
//                 </TabsContent>

//                 {/* Flashcards Tab */}
//                 <TabsContent value="flashcards" className="mt-6 space-y-6">
//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                         {flashcards.map((card, idx) => (
//                             <FlashcardItem key={card.id || idx} card={card} isAllTopics={isAllTopics} />
//                         ))}

//                         {/* Generator Placeholder */}
//                         {!isAllTopics && flashcards.length === 0 && (
//                             <div className="col-span-full flex justify-center py-10">
//                                 <div className="text-center">
//                                     <p className="text-gray-500 mb-4">No flashcards yet.</p>
//                                     <FlashcardGenerator
//                                         subject={subject}
//                                         topicId={topicId}
//                                         topicName={topicName}
//                                         onSaved={() => router.refresh()}
//                                     />
//                                 </div>
//                             </div>
//                         )}
//                     </div>
//                 </TabsContent>

//                 {/* Past Papers Tab */}
//                 <TabsContent value="pastpapers" className="mt-6">
//                     <Card>
//                         <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
//                             <div className="flex items-center gap-4">
//                                 <CardTitle>Questions</CardTitle>
//                                 <Button 
//                                     size="sm" 
//                                     onClick={handleSubmitAll}
//                                     className="bg-orange-600 hover:bg-orange-700 text-white hidden sm:flex"
//                                 >
//                                     <CheckSquare className="h-4 w-4 mr-1.5" /> Submit All Visible
//                                 </Button>
//                             </div>
                            
//                             {/* Toggle Switch - Only show if actual questions exist */}
//                             {(actualQuestions && actualQuestions.length > 0) && (
//                                 <div className="flex bg-gray-100 p-1 rounded-lg">
//                                     <button 
//                                         onClick={() => setPaperType('actual')}
//                                         className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${paperType === 'actual' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
//                                     >
//                                         Official Papers
//                                     </button>
//                                     <button 
//                                         onClick={() => setPaperType('generated')}
//                                         className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${paperType === 'generated' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
//                                     >
//                                         AI Generated
//                                     </button>
//                                 </div>
//                             )}

//                             {/* Mobile submit all */}
//                             <Button 
//                                 size="sm" 
//                                 onClick={handleSubmitAll}
//                                 className="bg-orange-600 hover:bg-orange-700 text-white flex w-full sm:hidden"
//                             >
//                                 <CheckSquare className="h-4 w-4 mr-1.5" /> Submit All Visible
//                             </Button>
//                         </CardHeader>
                        
//                         <CardContent>
//                             {paperType === 'generated' ? (
//                                 <div className="space-y-4">
//                                     {questions.length === 0 ? (
//                                         <div className="text-center py-10 text-gray-400">
//                                             No AI Generated questions found for this topic.
//                                         </div>
//                                     ) : (
//                                         Object.entries(groupedGenerated).map(([worksheetKey, qs]: any) => (
//                                             <div key={worksheetKey} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
//                                                 <button 
//                                                     onClick={() => toggleWorksheet(worksheetKey)}
//                                                     className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
//                                                 >
//                                                     <div className="flex items-center gap-3">
//                                                         <span className="text-lg font-bold text-gray-900">{worksheetKey}</span>
//                                                         <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
//                                                             {qs.length} Questions
//                                                         </span>
//                                                     </div>
//                                                     {expandedWorksheets[worksheetKey] ? <ChevronUp /> : <ChevronDown />}
//                                                 </button>
                                                
//                                                 {expandedWorksheets[worksheetKey] && (
//                                                     <div className="p-6 bg-white space-y-0">
//                                                         {qs.map((q: any) => (
//                                                             <GeneratedQuestionItem 
//                                                                 key={`generated-${q.id}`} 
//                                                                 q={q} 
//                                                                 userAnswer={userAnswers[`generated-${q.id}`] || ''}
//                                                                 evalResult={evaluations[`generated-${q.id}`]}
//                                                                 hasAttempted={!!attemptedQuestions[`generated-${q.id}`]}
//                                                                 onAnswerChange={(val) => handleAnswerChange(`generated-${q.id}`, val)}
//                                                                 onSubmitAnswer={() => handleEvaluateSingle(`generated-${q.id}`, q.answerMarkdown || '')}
//                                                             />
//                                                         ))}
//                                                     </div>
//                                                 )}
//                                             </div>
//                                         ))
//                                     )}
//                                 </div>
//                             ) : (
//                                 <div className="space-y-4">
//                                     {actualQuestions.length === 0 ? (
//                                         <div className="text-center py-10 text-gray-400">
//                                             No official questions found for this topic.
//                                         </div>
//                                     ) : (
//                                         Object.entries(groupedActual).reverse().map(([year, qs]: any) => (
//                                             <div key={year} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
//                                                 <button 
//                                                     onClick={() => toggleYear(Number(year))}
//                                                     className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
//                                                 >
//                                                     <div className="flex items-center gap-3">
//                                                         <span className="text-lg font-bold text-gray-900">{year} Examination</span>
//                                                         <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
//                                                             {qs.length} Questions
//                                                         </span>
//                                                     </div>
//                                                     {expandedYears[Number(year)] ? <ChevronUp /> : <ChevronDown />}
//                                                 </button>
                                                
//                                                 {expandedYears[Number(year)] && (
//                                                     <div className="p-6 bg-white space-y-0">
//                                                         {qs.map((q: any) => (
//                                                             <ActualQuestionItem 
//                                                                 key={`actual-${q.id}`} 
//                                                                 q={q} 
//                                                                 userAnswer={userAnswers[`actual-${q.id}`] || ''}
//                                                                 evalResult={evaluations[`actual-${q.id}`]}
//                                                                 hasAttempted={!!attemptedQuestions[`actual-${q.id}`]}
//                                                                 onAnswerChange={(val) => handleAnswerChange(`actual-${q.id}`, val)}
//                                                                 onSubmitAnswer={() => handleEvaluateSingle(`actual-${q.id}`, q.answerHtml || '')}
//                                                             />
//                                                         ))}
//                                                     </div>
//                                                 )}
//                                             </div>
//                                         ))
//                                     )}
//                                 </div>
//                             )}
//                         </CardContent>
//                     </Card>
//                 </TabsContent>
//             </Tabs>

//             <FlashcardTestModal
//                 isOpen={isTestOpen}
//                 onClose={() => setIsTestOpen(false)}
//                 topicId={topicId === 'all' ? -1 : parseInt(topicId)}
//                 topicName={topicName}
//                 flashcards={flashcards}
//                 onComplete={(score) => {
//                     // Update local best score if current is better
//                     if (!bestScore || score > bestScore.score) {
//                         setBestScore({ score, totalQuestions: flashcards.length });
//                     }
//                 }}
//             />
//         </div>
//     );
// }

















//components\topic-view.tsx
'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { 
    Brain, FileText, MessageCircle, Mic, ArrowLeft, 
    RefreshCw, Trophy, ChevronDown, ChevronUp, Eye, EyeOff, Send, Loader2, X,
    CheckCircle, XCircle, CheckSquare 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import QuestionVoiceTutor from '@/components/question-voice-tutor';
import { saveLessonProgress, clearLessonProgress } from '@/app/(dashboard)/lesson-progress-actions';
import LiveAudioComponent, { type LessonProgress } from '@/components/live-simulation-component';
import FlashcardGenerator from '@/components/flashcard-generator';
import PastPaperGenerator from '@/components/past-paper-generator';
import KnowledgeUploader from '@/components/knowledge-uploader';
import TopicSettingsDialog from '@/components/topic-settings-dialog';
import TextTutorChat from '@/components/text-tutor-chat';
import FlashcardTestModal from '@/components/flashcard-test-modal';
import { savePastPaperAttemptAction, saveVoiceSessionAction, evaluateAnswerWithAIAction } from '@/app/(dashboard)/actions';
import type { ActualPastPaperQuestion } from '@/lib/db/schema';

interface Flashcard {
    id?: number;
    front: string;
    back: string;
    topic?: string;
}

interface Question {
    id: number;
    year: string;
    question: string;
    answerMarkdown: string;
    explanationMarkdown?: string;
    topic?: string;
    worksheetName?: string;     
    worksheetNumber?: number;
}

interface TopicViewProps {
    level: string;
    subject: string;
    topicId: string;
    topicName: string;
    isAllTopics: boolean;
    flashcards: Flashcard[];
    questions: Question[];
    actualQuestions?: ActualPastPaperQuestion[];
    voicePrompt: string;
    backgroundContext?: string;
    lessonPlan?: string;
    initialBestScore?: { score: number; totalQuestions: number } | null;
    canEdit: boolean;
    initialLessonProgress?: LessonProgress | null;
    preloadedVoiceContext?: string;
    userRole?: string;
}

interface EvaluationResult {
    score: number;
    isCorrect: boolean;
    feedback?: string;     
    isEvaluating?: boolean;
}

// Add near the top of topic-view.tsx, after the getDiceCoefficient function:

function stripHtmlForPrompt(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function buildQuestionVoicePrompt(data: {
    questionNumber?: number | string;
    questionText: string;
    modelAnswer: string;
    workingText?: string;
    topicTag?: string;
    subject?: string;
    level?: string;
}): string {
    return `You are a Personal Exam Tutor helping a student understand a specific past paper question.

YOUR ONLY JOB: Help the student understand THIS question and how to answer it correctly.
Stay focused on this one question — do not drift into teaching the broader topic.

${data.questionNumber ? `Question Number: ${data.questionNumber}` : ''}
${data.topicTag ? `Topic: ${data.topicTag}` : ''}
${data.subject ? `Subject: ${data.subject} (${data.level || ''})` : ''}

THE QUESTION:
${stripHtmlForPrompt(data.questionText)}

MODEL ANSWER:
${stripHtmlForPrompt(data.modelAnswer)}
${data.workingText ? `\nSTEP-BY-STEP WORKING:\n${stripHtmlForPrompt(data.workingText)}` : ''}

YOUR APPROACH:
1. Start by asking the student what part confused them or where they got stuck.
2. Do NOT read out the model answer — guide them to understand the reasoning behind it.
3. Walk through the working steps piece by piece when needed.
4. Ask checking questions like "Does that make sense?" after each explanation.
5. Keep all responses to 1-3 sentences maximum. This is a conversation, not a lecture.
6. If the student gives an incorrect response, gently correct them and explain why.

VOICE RULES:
- Speak conversationally. No LaTeX, no dollar signs. Say "squared" not "x^2".
- Stay on this question. If the student asks something unrelated, gently redirect.
- Always call update_blackboard before showing any working or formula.`;
}


// Lightweight similarity algorithm (Sørensen–Dice coefficient)
function getDiceCoefficient(s1: string, s2: string): number {
    const clean1 = s1.replace(/<[^>]*>?/gm, '').replace(/[^\w\s]/gi, '').toLowerCase().trim();
    const clean2 = s2.replace(/<[^>]*>?/gm, '').replace(/[^\w\s]/gi, '').toLowerCase().trim();
    
    if (clean1 === clean2) return 100;
    if (clean1.length < 2 || clean2.length < 2) return 0;

    let bigrams1 = new Map<string, number>();
    for (let i = 0; i < clean1.length - 1; i++) {
        const bg = clean1.substring(i, i + 2);
        bigrams1.set(bg, (bigrams1.get(bg) || 0) + 1);
    }

    let intersectionSize = 0;
    for (let i = 0; i < clean2.length - 1; i++) {
        const bg = clean2.substring(i, i + 2);
        const count = bigrams1.get(bg);
        if (count && count > 0) {
            bigrams1.set(bg, count - 1);
            intersectionSize++;
        }
    }

    const score = (2.0 * intersectionSize) / (clean1.length - 1 + clean2.length - 1);
    return Math.min(Math.round(score * 100), 100);
}

function ActualQuestionItem({ 
    q, 
    userAnswer, 
    evalResult, 
    hasAttempted,
    onAnswerChange, 
    onSubmitAnswer,
    subject,
    level,
    topicId,
}: { 
    q: any; 
    userAnswer: string; 
    evalResult?: EvaluationResult; 
    hasAttempted: boolean;
    onAnswerChange: (val: string) => void; 
    onSubmitAnswer: () => void;
    subject: string;
    level: string;
    topicId: number;
}) {
    const [showAnswer, setShowAnswer] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isVoiceOpen, setIsVoiceOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;
        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg as any]);
        setInput('');
        setIsTyping(true);
        try {
            const res = await fetch('/api/ai/past-paper-tutor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionData: q, history: [...messages, userMsg] })
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'ai', content: data.text }]);
        } catch (e) {
            console.error("Tutor error", e);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="border-b border-gray-100 last:border-0 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded whitespace-nowrap">
                    Question {q.questionNumber} ({q.marks} Marks)
                </span>
                {hasAttempted && (
                    <div className="flex w-full sm:w-auto gap-2 flex-wrap">
                        {/* Text Tutor button */}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => { setIsChatOpen(!isChatOpen); setIsVoiceOpen(false); }}
                            className={`h-8 flex-1 sm:flex-none transition-colors ${isChatOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'text-gray-500'}`}
                        >
                            <MessageCircle className="h-4 w-4 mr-1.5 shrink-0" />
                            <span className="whitespace-nowrap">{isChatOpen ? "Close Text" : "Text Tutor"}</span>
                        </Button>

                        {/* Voice Tutor button */}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => { setIsVoiceOpen(!isVoiceOpen); setIsChatOpen(false); }}
                            className={`h-8 flex-1 sm:flex-none transition-colors ${isVoiceOpen ? 'bg-purple-50 border-purple-200 text-purple-600' : 'text-purple-600 border-purple-200 hover:bg-purple-50'}`}
                        >
                            <Mic className="h-4 w-4 mr-1.5 shrink-0" />
                            <span className="whitespace-nowrap">{isVoiceOpen ? "Close Voice" : "Voice Tutor"}</span>
                        </Button>

                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowAnswer(!showAnswer)} 
                            className="text-blue-600 h-8 flex-1 sm:flex-none bg-blue-50/50 sm:bg-transparent ring-1 ring-blue-100 sm:ring-0"
                        >
                            {showAnswer ? <EyeOff className="h-4 w-4 mr-1.5 shrink-0" /> : <Eye className="h-4 w-4 mr-1.5 shrink-0" />}
                            <span className="whitespace-nowrap">{showAnswer ? "Hide Answer" : "Show Answer"}</span>
                        </Button>
                    </div>
                )}
            </div>

            <div className="prose prose-slate max-w-none actual-paper-content" dangerouslySetInnerHTML={{ __html: q.questionHtml }} />

            {/* Text Tutor Chat Interface */}
            {isChatOpen && hasAttempted && (
                <div className="mt-4 border border-blue-100 rounded-xl bg-blue-50/30 overflow-hidden shadow-inner">
                    <div className="p-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-blue-700 flex items-center">
                            <Brain className="h-3 w-3 mr-1.5" /> TEXT TUTOR: QUESTION {q.questionNumber}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)} className="h-6 w-6 text-blue-400">
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                    <div className="p-4 max-h-60 overflow-y-auto space-y-3">
                        {messages.length === 0 && (
                            <p className="text-sm text-blue-600 italic">"Hi! I can help you understand the logic behind this question. What's on your mind?"</p>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                                    m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-blue-100'
                                }`}>
                                    <div dangerouslySetInnerHTML={{ __html: m.content }} />
                                </div>
                            </div>
                        ))}
                        {isTyping && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                    </div>
                    <div className="p-3 bg-white border-t border-blue-100 flex gap-2">
                        <input 
                            type="text" value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask about this question..."
                            className="flex-1 text-sm border-none focus:ring-0 outline-none px-2"
                        />
                        <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="h-8 w-8 bg-blue-600">
                            <Send className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Voice Tutor inline panel */}
            {isVoiceOpen && hasAttempted && (
                <div className="mt-4 border border-purple-200 rounded-xl overflow-hidden shadow-inner bg-white">
                    <div className="p-3 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                            <Mic className="h-3 w-3" /> VOICE TUTOR: QUESTION {q.questionNumber}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => setIsVoiceOpen(false)} className="h-6 w-6 text-purple-400 hover:text-purple-700 hover:bg-purple-100">
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                    <div className="h-[310px] relative w-full overflow-hidden bg-slate-950">
                        <div className="absolute top-0 left-0 w-[200%] h-[420px] origin-top-left scale-50">
                            <LiveAudioComponent
                                prompt={buildQuestionVoicePrompt({
                                    questionNumber: q.questionNumber,
                                    questionText: q.questionHtml || '',
                                    modelAnswer: q.answerHtml || '',
                                    workingText: q.workingHtml || '',
                                    topicTag: q.topicTag || '',
                                    subject,
                                    level,
                                })}
                                topicId={topicId}
                                subject={subject}
                                level={level}
                                onConversationEnd={() => {}}
                                isEnding={false}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Answer Input & Evaluation */}
            <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label className="text-xs font-bold text-slate-600 mb-2 block uppercase tracking-wider">Your Answer:</label>
                <Textarea 
                    placeholder="Type your answer here..." 
                    value={userAnswer}
                    onChange={(e) => onAnswerChange(e.target.value)}
                    disabled={evalResult?.isEvaluating}
                    className="w-full text-sm resize-y min-h-[100px] mb-3 bg-white"
                />
                <div className="flex justify-between items-center">
                    <Button 
                        onClick={onSubmitAnswer} size="sm" variant="secondary" 
                        disabled={!userAnswer.trim() || evalResult?.isEvaluating}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                        {evalResult?.isEvaluating ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Evaluating...</> : 'Submit Answer'}
                    </Button>
                    {evalResult && !evalResult.isEvaluating && (
                        <div className={`text-sm font-bold flex items-center px-3 py-1.5 rounded-lg border ${evalResult.isCorrect ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {evalResult.isCorrect ? <CheckCircle className="h-4 w-4 mr-1.5" /> : <XCircle className="h-4 w-4 mr-1.5" />}
                            {evalResult.isCorrect ? 'Correct' : 'Needs Review'} ({evalResult.score}%)
                        </div>
                    )}
                </div>
                {evalResult?.feedback && !evalResult.isEvaluating && (
                    <div className={`mt-3 p-2.5 rounded-lg text-xs leading-relaxed border ${evalResult.isCorrect ? 'bg-green-50/50 text-green-800 border-green-100' : 'bg-red-50/50 text-red-800 border-red-100'}`}>
                        <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">Feedback:</span>
                        {evalResult.feedback}
                    </div>
                )}
            </div>

            {showAnswer && hasAttempted && (
                <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg">
                    <p className="text-xs font-bold text-green-700 mb-2 uppercase">Model Answer:</p>
                    <div className="prose prose-green max-w-none" dangerouslySetInnerHTML={{ __html: q.answerHtml }} />
                    {q.workingHtml && (
                        <div className="mt-3 pt-3 border-t border-green-200 italic text-sm text-green-800" dangerouslySetInnerHTML={{ __html: q.workingHtml }} />
                    )}
                </div>
            )}
        </div>
    );
}

function GeneratedQuestionItem({ 
    q, 
    userAnswer, 
    evalResult, 
    hasAttempted,
    onAnswerChange, 
    onSubmitAnswer,
    subject, 
    level, 
    topicId,
}: { 
    q: Question; 
    userAnswer: string; 
    evalResult?: EvaluationResult; 
    hasAttempted: boolean;
    onAnswerChange: (val: string) => void; 
    onSubmitAnswer: () => void;
    subject: string; 
    level: string; 
    topicId: number;
}) {
    const [showAnswer, setShowAnswer] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isVoiceOpen, setIsVoiceOpen] = useState(false);


    const handleSend = async () => {
        if (!input.trim() || isTyping) return;
        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg as any]);
        setInput('');
        setIsTyping(true);

        try {
            const res = await fetch('/api/ai/past-paper-tutor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionData: q,
                    history: [...messages, userMsg]
                })
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'ai', content: data.text }]);
        } catch (e) {
            console.error("Tutor error", e);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="border-b border-gray-100 last:border-0 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded whitespace-nowrap">
                    Year: {q.year}
                </span>
                {hasAttempted && (
                    <div className="flex w-full sm:w-auto gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => { setIsChatOpen(!isChatOpen); setIsVoiceOpen(false); }}
                            className={`h-8 flex-1 sm:flex-none transition-colors ${isChatOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'text-gray-500'}`}
                        >
                            <MessageCircle className="h-4 w-4 mr-1.5 shrink-0" />
                            <span className="whitespace-nowrap">{isChatOpen ? "Close Text" : "Text Tutor"}</span>
                        </Button>
                        <Button variant="outline" size="sm"
                            onClick={() => { setIsVoiceOpen(!isVoiceOpen); setIsChatOpen(false); }}
                            className={`h-8 flex-1 sm:flex-none transition-colors ${isVoiceOpen ? 'bg-purple-50 border-purple-200 text-purple-600' : 'text-purple-600 border-purple-200 hover:bg-purple-50'}`}
                        >
                            <Mic className="h-4 w-4 mr-1.5 shrink-0" />
                            <span className="whitespace-nowrap">{isVoiceOpen ? "Close Voice" : "Voice Tutor"}</span>
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowAnswer(!showAnswer)} 
                            className="text-blue-600 h-8 flex-1 sm:flex-none bg-blue-50/50 sm:bg-transparent ring-1 ring-blue-100 sm:ring-0"
                        >
                            {showAnswer ? <EyeOff className="h-4 w-4 mr-1.5 shrink-0" /> : <Eye className="h-4 w-4 mr-1.5 shrink-0" />}
                            <span className="whitespace-nowrap">{showAnswer ? "Hide Answer" : "Show Answer"}</span>
                        </Button>
                    </div>
                )}
            </div>

            <p className="font-medium mb-4 text-gray-900 leading-relaxed">{q.question}</p>

            {/* AI Tutor Chat Interface */}
            {isChatOpen && hasAttempted && (
                <div className="mt-4 border border-blue-100 rounded-xl bg-blue-50/30 overflow-hidden shadow-inner">
                    <div className="p-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-blue-700 flex items-center">
                            <Brain className="h-3 w-3 mr-1.5" /> PERSONAL TUTOR: GENERATED QUESTION
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)} className="h-6 w-6 text-blue-400">
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                    
                    <div className="p-4 max-h-60 overflow-y-auto space-y-3">
                        {messages.length === 0 && (
                            <p className="text-sm text-blue-600 italic">"Hi! I can help you understand the logic behind this question or explain the topic. What's on your mind?"</p>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                                    m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-blue-100'
                                }`}>
                                    <div dangerouslySetInnerHTML={{ __html: m.content }} />
                                </div>
                            </div>
                        ))}
                        {isTyping && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                    </div>

                    <div className="p-3 bg-white border-t border-blue-100 flex gap-2">
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask about this question..."
                            className="flex-1 text-sm border-none focus:ring-0 outline-none px-2"
                        />
                        <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="h-8 w-8 bg-blue-600">
                            <Send className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            )}

            {isVoiceOpen && hasAttempted && (
                <div className="mt-4 border border-purple-200 rounded-xl overflow-hidden shadow-inner">
                    <div className="p-3 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                            <Mic className="h-3 w-3" /> VOICE TUTOR: GENERATED QUESTION
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => setIsVoiceOpen(false)} className="h-6 w-6 text-purple-400 hover:text-purple-700 hover:bg-purple-100">
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                    <div className="h-[310px] relative w-full overflow-hidden bg-slate-950">
                        <div className="absolute top-0 left-0 w-[200%] h-[420px] origin-top-left scale-50">
                            <LiveAudioComponent
                                prompt={buildQuestionVoicePrompt({
                                    questionText: q.question,
                                    modelAnswer: q.answerMarkdown || '',
                                    workingText: q.explanationMarkdown || '',
                                    subject,
                                    level,
                                })}
                                topicId={topicId}
                                subject={subject}
                                level={level}
                                onConversationEnd={() => {}}
                                isEnding={false}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Answer Input & Evaluation */}
            <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label className="text-xs font-bold text-slate-600 mb-2 block uppercase tracking-wider">Your Answer:</label>
                <Textarea 
                    placeholder="Type your answer here..." 
                    value={userAnswer}
                    onChange={(e) => onAnswerChange(e.target.value)}
                    disabled={evalResult?.isEvaluating}
                    className="w-full text-sm resize-y min-h-[100px] mb-3 bg-white"
                />
                <div className="flex justify-between items-center">
                    <Button 
                        onClick={onSubmitAnswer} 
                        size="sm" 
                        variant="secondary" 
                        disabled={!userAnswer.trim() || evalResult?.isEvaluating}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                        {evalResult?.isEvaluating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Evaluating...
                            </>
                        ) : 'Submit Answer'}
                    </Button>
                    {evalResult && (
                        <div className={`text-sm font-bold flex items-center px-3 py-1.5 rounded-lg border ${
                            evalResult.isEvaluating
                                ? 'bg-slate-100 text-slate-500 border-slate-200 animate-pulse'
                                : evalResult.isCorrect 
                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                    : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                            {evalResult.isEvaluating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                    AI Analyzing...
                                </>
                            ) : (
                                <>
                                    {evalResult.isCorrect ? <CheckCircle className="h-4 w-4 mr-1.5" /> : <XCircle className="h-4 w-4 mr-1.5" />}
                                    {evalResult.isCorrect ? 'Correct' : 'Needs Review'} ({evalResult.score}%)
                                </>
                            )}
                        </div>
                    )}
                </div>
                {evalResult && evalResult.feedback && !evalResult.isEvaluating && (
                    <div className={`mt-3 p-2.5 rounded-lg text-xs leading-relaxed border ${
                        evalResult.isCorrect 
                            ? 'bg-green-50/50 text-green-800 border-green-100' 
                            : 'bg-red-50/50 text-red-800 border-red-100'
                    }`}>
                        <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">Feedback:</span>
                        {evalResult.feedback}
                    </div>
                )}
            </div>

            {showAnswer && hasAttempted && (
                <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg">
                    <p className="text-xs font-bold text-green-700 mb-2 uppercase">Model Answer:</p>
                    <div className="prose prose-sm prose-green max-w-none" dangerouslySetInnerHTML={{ __html: q.answerMarkdown }} />
                    {q.explanationMarkdown && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                            <p className="text-xs font-bold text-green-700 mb-1 uppercase">Explanation:</p>
                            <div className="prose prose-sm prose-green max-w-none italic" dangerouslySetInnerHTML={{ __html: q.explanationMarkdown }} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function FlashcardItem({ card, isAllTopics }: { card: Flashcard; isAllTopics: boolean }) {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div
            className="group perspective-1000 h-64 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <div className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                {/* Front Face */}
                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
                    <Card className="h-full flex flex-col justify-center items-center text-center p-6 hover:shadow-lg transition-shadow border-orange-100 relative">
                        {isAllTopics && card.topic && (
                            <span className="absolute top-4 right-4 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
                                {card.topic}
                            </span>
                        )}
                        <div className="flex-1 flex flex-col justify-center items-center overflow-y-auto w-full">
                            <p className="font-medium text-lg text-gray-800">{card.front}</p>
                        </div>
                        <span className="text-xs text-gray-400 mt-4 md:block hidden">Hover or tap to reveal</span>
                        <span className="text-xs text-gray-400 mt-4 md:hidden block">Tap to reveal</span>
                    </Card>
                </div>

                {/* Back Face */}
                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <Card className="h-full flex flex-col justify-center items-center text-center p-6 bg-orange-50 border-orange-200 shadow-md relative">
                        {isAllTopics && card.topic && (
                            <span className="absolute top-4 right-4 text-xs font-bold text-orange-600 bg-white px-2 py-1 rounded-full">
                                {card.topic}
                            </span>
                        )}
                        <div className="flex-1 flex flex-col justify-center items-center overflow-y-auto w-full">
                            <p className="text-orange-700 font-bold text-lg">{card.back}</p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function TopicView({
    level,
    subject,
    topicId,
    topicName,
    isAllTopics,
    flashcards,
    questions,
    actualQuestions = [],
    voicePrompt,
    backgroundContext = "",
    lessonPlan = "",
    initialBestScore = null,
    canEdit = false,
    initialLessonProgress = null,
    preloadedVoiceContext = '',
    userRole = '', 
}: TopicViewProps) {
    const [activeTab, setActiveTab] = useState('voice');
    const [isTestOpen, setIsTestOpen] = useState(false);
    const [bestScore, setBestScore] = useState(initialBestScore); 

    // Submission and evaluation states
    const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
    const [evaluations, setEvaluations] = useState<Record<string, EvaluationResult>>({});
    const [attemptedQuestions, setAttemptedQuestions] = useState<Record<string, boolean>>({}); 
    const [expandedWorksheets, setExpandedWorksheets] = useState<Record<string, boolean>>({});

    const isVoiceActiveRef = useRef(false);
    const voiceSessionStartRef = useRef<number>(Date.now());
    const textTutorSaveRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        return () => {
            if (!isVoiceActiveRef.current) return;
        
            const durationSeconds = Math.round((Date.now() - voiceSessionStartRef.current) / 1000);
            if (durationSeconds < 30) return;
        
            const progress = lessonProgressRef.current;
        
            const payload = JSON.stringify({
                topicId: topicId === 'all' ? null : parseInt(topicId),
                durationSeconds,
                topicsIntroduced: progress.topicsIntroduced,
                topicsConfirmed: progress.topicsConfirmed,
                studentMisconceptions: progress.studentMisconceptions,
                lastSummary: progress.lastSummary,
            });
        
            navigator.sendBeacon('/api/sessions/save-voice', payload);
        };
    }, [topicId]);

    const lessonProgressRef = useRef<LessonProgress>(initialLessonProgress || {
        topicsIntroduced: [],
        topicsConfirmed: [],
        currentTopic: '',
        studentMisconceptions: [],
        lastSummary: '',
        sessionCount: 0,
    });

    const handleVoiceConversationEnd = useCallback(async (
        blob: Blob,
        progress: LessonProgress
    ) => {
        isVoiceActiveRef.current = false; 
        const durationSeconds = Math.round((Date.now() - voiceSessionStartRef.current) / 1000);
    
        if (durationSeconds < 30) return;
    
        await saveVoiceSessionAction({
            topicId: topicId === 'all' ? null : parseInt(topicId),
            durationSeconds,
            topicsIntroduced: progress.topicsIntroduced,
            topicsConfirmed: progress.topicsConfirmed,
            studentMisconceptions: progress.studentMisconceptions,
            lastSummary: progress.lastSummary,
        });
    }, [topicId]);

    const [paperType, setPaperType] = useState<'actual' | 'generated'>(
        actualQuestions && actualQuestions.length > 0 ? 'actual' : 'generated'
    );
    
    const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});
    const router = useRouter();

    const handleLessonProgressUpdate = useCallback(async (progress: LessonProgress) => {
        lessonProgressRef.current = progress;
        if (topicId !== 'all') {
            const numericId = parseInt(topicId);
            if (!isNaN(numericId)) {
                await saveLessonProgress(numericId, progress);
            }
        }
    }, [topicId]);

    // Handle answer input change
    const handleAnswerChange = (id: string, text: string) => {
        setUserAnswers(prev => ({ ...prev, [id]: text }));
        if (evaluations[id]) {
            setEvaluations(prev => {
                const newEv = { ...prev };
                delete newEv[id];
                return newEv;
            });
        }
    };

    // Evaluate single answer with local similarity fast-pass followed by AI fallback
    const handleEvaluateSingle = async (id: string, questionText: string, modelAnswer: string) => {
        const ans = userAnswers[id] || '';
        if (!ans.trim()) return;

        // 1. Local similarity fast pass (Avoid AI costs for near-perfect lexical matches)
        const localScore = getDiceCoefficient(ans, modelAnswer);
        if (localScore >= 85) {
            setEvaluations(prev => ({ 
                ...prev, 
                [id]: { 
                    score: localScore, 
                    isCorrect: true, 
                    feedback: "Spot on! Your answer matches our model answer standard." 
                } 
            }));
            setAttemptedQuestions(prev => ({ ...prev, [id]: true }));
            return;
        }

        // 2. Transition state to active AI Evaluation
        setEvaluations(prev => ({ 
            ...prev, 
            [id]: { score: 0, isCorrect: false, feedback: "", isEvaluating: true } 
        }));

        try {
            const res = await evaluateAnswerWithAIAction({
                question: questionText,
                userAnswer: ans,
                modelAnswer: modelAnswer
            });

            if (res && 'success' in res && res.success) {
                setEvaluations(prev => ({ 
                    ...prev, 
                    [id]: { 
                        score: res.score ?? 0, 
                        isCorrect: !!res.isCorrect, 
                        feedback: res.feedback || "",
                        isEvaluating: false 
                    } 
                }));
                setAttemptedQuestions(prev => ({ ...prev, [id]: true }));
            } else {
                // Fallback locally on processing errors
                setEvaluations(prev => ({ 
                    ...prev, 
                    [id]: { 
                        score: localScore, 
                        isCorrect: localScore >= 65, 
                        feedback: "Processed via secondary local fallback analysis.",
                        isEvaluating: false 
                    } 
                }));
                setAttemptedQuestions(prev => ({ ...prev, [id]: true }));
            }
        } catch (error) {
            console.error("AI Evaluation error:", error);
            setEvaluations(prev => ({ 
                ...prev, 
                [id]: { 
                    score: localScore, 
                    isCorrect: localScore >= 65, 
                    feedback: "Could not connect to evaluator. Performed lexical local match.",
                    isEvaluating: false 
                } 
            }));
            setAttemptedQuestions(prev => ({ ...prev, [id]: true }));
        }
    };

    // Submits and evaluates all currently typed, visible, and un-evaluated answers
    const handleSubmitAll = async () => {
        const targets: { id: string; question: string; modelAnswer: string; isActual: boolean; yearOrWorksheet: string }[] = [];

        if (paperType === 'actual') {
            actualQuestions.forEach(q => {
                const id = `actual-${q.id}`;
                if (userAnswers[id]?.trim() && !attemptedQuestions[id]) {
                    targets.push({
                        id,
                        question: q.questionHtml || '',
                        modelAnswer: q.answerHtml || '',
                        isActual: true,
                        yearOrWorksheet: String(q.year)
                    });
                }
            });
        } else {
            questions.forEach(q => {
                const id = `generated-${q.id}`;
                if (userAnswers[id]?.trim() && !attemptedQuestions[id]) {
                    let wsKey = "Worksheet 1";
                    if (q.worksheetName) {
                        wsKey = q.worksheetName;
                    } else if (q.worksheetNumber) {
                        wsKey = `Worksheet ${q.worksheetNumber}`;
                    }
                    targets.push({
                        id,
                        question: q.question || '',
                        modelAnswer: q.answerMarkdown || '',
                        isActual: false,
                        yearOrWorksheet: wsKey
                    });
                }
            });
        }

        if (targets.length === 0) return;

        // Set all to evaluating state
        setEvaluations(prev => {
            const updated = { ...prev };
            targets.forEach(t => {
                updated[t.id] = { score: 0, isCorrect: false, feedback: "", isEvaluating: true };
            });
            return updated;
        });

        // Parallel processing of batches with hybrid grading logic
        const evaluationPromises = targets.map(async (t) => {
            const ans = userAnswers[t.id] || '';
            const localScore = getDiceCoefficient(ans, t.modelAnswer);

            if (localScore >= 85) {
                const localResult = { 
                    score: localScore, 
                    isCorrect: true, 
                    feedback: "Spot on! Your answer matches our model answer standard." 
                };
                setEvaluations(prev => ({ ...prev, [t.id]: localResult }));
                setAttemptedQuestions(prev => ({ ...prev, [t.id]: true }));
                return { ...t, eval: localResult };
            }

            try {
                const res = await evaluateAnswerWithAIAction({
                    question: t.question,
                    userAnswer: ans,
                    modelAnswer: t.modelAnswer
                });

                if (res && 'success' in res && res.success) {
                    const aiResult = {
                        score: res.score ?? 0,
                        isCorrect: !!res.isCorrect,
                        feedback: res.feedback || ""
                    };
                    setEvaluations(prev => ({ ...prev, [t.id]: aiResult }));
                    setAttemptedQuestions(prev => ({ ...prev, [t.id]: true }));
                    return { ...t, eval: aiResult };
                }
            } catch (err) {
                console.error(`Batch AI match failure on question: ${t.id}`, err);
            }

            const fallbackResult = {
                score: localScore,
                isCorrect: localScore >= 65,
                feedback: "Processed via secondary local fallback analysis."
            };
            setEvaluations(prev => ({ ...prev, [t.id]: fallbackResult }));
            setAttemptedQuestions(prev => ({ ...prev, [t.id]: true }));
            return { ...t, eval: fallbackResult };
        });

        const results = await Promise.all(evaluationPromises);

        // Group attempts for backend submission tracking
        const groupSubmissions: Record<string, { correct: number; total: number; isActual: boolean }> = {};
        results.forEach(r => {
            const key = r.yearOrWorksheet;
            if (!groupSubmissions[key]) {
                groupSubmissions[key] = { correct: 0, total: 0, isActual: r.isActual };
            }
            groupSubmissions[key].total++;
            if (r.eval.isCorrect) {
                groupSubmissions[key].correct++;
            }
        });

        for (const [key, meta] of Object.entries(groupSubmissions)) {
            await savePastPaperAttemptAction({
                topicId: topicId === 'all' ? -1 : parseInt(topicId),
                paperType: meta.isActual ? 'actual' : 'generated',
                reference: meta.isActual ? `${key} Examination` : key,
                correctQuestions: meta.correct,
                totalQuestions: meta.total
            });
        }
    };

    const groupedGenerated = useMemo(() => {
        const groups: Record<string, any[]> = {};
        questions.forEach((q: any) => {
            let key = "Worksheet 1";
            if (q.worksheetName) {
                key = q.worksheetName;
            } else if (q.worksheetNumber) {
                key = `Worksheet ${q.worksheetNumber}`;
            }
            if (!groups[key]) groups[key] = [];
            groups[key].push(q);
        });
        return groups;
    }, [questions]);

    const contextPrompt = useMemo(() => {
        let context = `\n\n--- Background Subject Context (Syllabus/Manual) ---\n${backgroundContext}\n\n`;
        context += `\n\nHere is the Context Data (Use this to help the student, refer to specific cards or questions if relevant):\n`;

        if (flashcards && flashcards.length > 0) {
            context += `\n--- Flashcards ---\n`;
            flashcards.forEach((card, i) => {
                context += `${i + 1}. Front: "${card.front}" | Back: "${card.back}"\n`;
            });
        } else {
            context += `\n(No flashcards available)\n`;
        }

        if (questions && questions.length > 0) {
            context += `\n--- Past Paper Questions ---\n`;
            questions.forEach((q, i) => {
                context += `${i + 1}. [Year: ${q.year}] Q: "${q.question}"\n   A: "${q.answerMarkdown}"\n`;
            });
        } else {
            context += `\n(No past paper questions available)\n`;
        }

        return voicePrompt + context;
    }, [flashcards, questions, voicePrompt, backgroundContext]);

    const groupedActual = useMemo(() => {
        const groups: Record<number, any[]> = {};
        actualQuestions.forEach((q: any) => {
            if (!groups[q.year]) groups[q.year] = [];
            groups[q.year].push(q);
        });
        return groups;
    }, [actualQuestions]);

    const toggleYear = (year: number) => {
        setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
    };

    const toggleWorksheet = (name: string) => {
        setExpandedWorksheets(prev => ({ ...prev, [name]: !prev[name] }));
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Navigation & Header */}
            <div>
                <Link href={`/dashboard/${level}/subjects/${subject}`} className="text-sm text-gray-500 hover:text-orange-600 mb-2 flex items-center">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to {subject}
                </Link>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900">{topicName}</h1>
                        <p className="text-gray-600">
                            {isAllTopics
                                ? "Comprehensive review of all topics in this subject."
                                : "Master the building blocks of life."}
                        </p>
                    </div>
                    {canEdit && !isAllTopics && (
                        <div className="flex gap-2">
                            <KnowledgeUploader topicId={topicId} topicName={topicName} />
                            <TopicSettingsDialog
                                topicId={topicId}
                                topicName={topicName}
                                initialLessonPlan={lessonPlan}
                            />
                        </div>
                    )}
                    {/* Generator & Test Component */}
                    {activeTab === 'flashcards' && (
                        <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
                            {flashcards.length > 0 && (
                                <div className="flex flex-col items-start sm:items-end flex-1 sm:flex-none">
                                    {bestScore && (
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 shadow-sm mb-2">
                                            <Trophy className="h-3.5 w-3.5" /> Best: {bestScore.score}/{bestScore.totalQuestions}
                                        </div>
                                    )}
                                    <Button
                                        onClick={() => setIsTestOpen(true)}
                                        className="bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all px-6 font-bold w-full sm:w-auto"
                                    >
                                        Test Yourself
                                    </Button>
                                </div>
                            )}
                            {!isAllTopics && (
                                <div className="flex-1 sm:flex-none">
                                    <FlashcardGenerator
                                        subject={subject}
                                        topicId={topicId}
                                        topicName={topicName}
                                        onSaved={() => router.refresh()}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    {!isAllTopics && activeTab === 'pastpapers' && (
                        <div className="w-full sm:w-auto">
                            <PastPaperGenerator
                                subject={subject}
                                topicId={topicId}
                                topicName={topicName}
                                onSaved={() => router.refresh()}
                            />
                        </div>
                    )}
                </div>
            </div>

            <Tabs defaultValue="voice" className="w-full" onValueChange={(newTab) => {
                if (activeTab === 'text' && newTab !== 'text') {
                    textTutorSaveRef.current?.();
                }
                setActiveTab(newTab);
            }}>
                <div className="overflow-x-auto pb-2 -mx-2 px-2 custom-scrollbar">
                    <TabsList className="flex w-max min-w-full lg:grid lg:w-[500px] lg:grid-cols-4">
                        <TabsTrigger value="voice" className="flex-1">Voice Tutor</TabsTrigger>
                        <TabsTrigger value="text" className="flex-1">Text Tutor</TabsTrigger>
                        <TabsTrigger value="flashcards" className="flex-1">Flashcards</TabsTrigger>
                        <TabsTrigger value="pastpapers" className="flex-1">Past Papers</TabsTrigger>
                    </TabsList>
                </div>

                {/* Voice Tutor Tab */}
                <TabsContent value="voice" className="mt-6">
                    <Card className="border-orange-200 shadow-md">
                        <CardHeader className="bg-gradient-to-r from-orange-50 to-white border-b border-orange-100">
                            <CardTitle className="flex items-center text-orange-700">
                                <Mic className="h-5 w-5 mr-2" />
                                Voice Tutor Session {isAllTopics ? "(General)" : ""}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 min-h-[500px] relative">
                            <div className="h-[500px]">
                                <LiveAudioComponent
                                    prompt={contextPrompt}
                                    topicId={topicId === 'all' ? -1 : parseInt(topicId)}
                                    topicIds={topicId === 'all' ? undefined : [parseInt(topicId)]} 
                                    subject={subject}
                                    level={level}
                                    onConversationEnd={(blob) => {
                                        voiceSessionStartRef.current = Date.now();
                                        handleVoiceConversationEnd(blob, lessonProgressRef.current);
                                    }}
                                    onSessionStart={() => {
                                        isVoiceActiveRef.current = true;
                                        voiceSessionStartRef.current = Date.now();
                                    }}
                                    isEnding={false}
                                    onLessonProgressUpdate={handleLessonProgressUpdate}   
                                    initialLessonProgress={initialLessonProgress} 
                                    preloadedContext={preloadedVoiceContext}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Text Tutor Tab */}
                <TabsContent value="text" className="mt-6">
                    <TextTutorChat
                        level={level}
                        contextPrompt={contextPrompt}
                        topicName={topicName}
                        subject={subject}
                        topicId={topicId}
                        saveRef={textTutorSaveRef}
                    />
                </TabsContent>

                {/* Flashcards Tab */}
                <TabsContent value="flashcards" className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {flashcards.map((card, idx) => (
                            <FlashcardItem key={card.id || idx} card={card} isAllTopics={isAllTopics} />
                        ))}

                        {/* Generator Placeholder */}
                        {!isAllTopics && flashcards.length === 0 && (
                            <div className="col-span-full flex justify-center py-10">
                                <div className="text-center">
                                    <p className="text-gray-500 mb-4">No flashcards yet.</p>
                                    <FlashcardGenerator
                                        subject={subject}
                                        topicId={topicId}
                                        topicName={topicName}
                                        onSaved={() => router.refresh()}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Past Papers Tab */}
                <TabsContent value="pastpapers" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
                            <div className="flex items-center gap-4">
                                <CardTitle>Questions</CardTitle>
                                <Button 
                                    size="sm" 
                                    onClick={handleSubmitAll}
                                    className="bg-orange-600 hover:bg-orange-700 text-white hidden sm:flex"
                                >
                                    <CheckSquare className="h-4 w-4 mr-1.5" /> Submit All Visible
                                </Button>
                            </div>
                            
                            {/* Toggle Switch - Only show if actual questions exist */}
                            {(actualQuestions && actualQuestions.length > 0) && (
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button 
                                        onClick={() => setPaperType('actual')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${paperType === 'actual' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                                    >
                                        Official Papers
                                    </button>
                                    <button 
                                        onClick={() => setPaperType('generated')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${paperType === 'generated' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                                    >
                                        AI Generated
                                    </button>
                                </div>
                            )}

                            {/* Mobile submit all */}
                            <Button 
                                size="sm" 
                                onClick={handleSubmitAll}
                                className="bg-orange-600 hover:bg-orange-700 text-white flex w-full sm:hidden"
                            >
                                <CheckSquare className="h-4 w-4 mr-1.5" /> Submit All Visible
                            </Button>
                        </CardHeader>
                        
                        <CardContent>
                            {paperType === 'generated' ? (
                                <div className="space-y-4">
                                    {questions.length === 0 ? (
                                        <div className="text-center py-10 text-gray-400">
                                            No AI Generated questions found for this topic.
                                        </div>
                                    ) : (
                                        Object.entries(groupedGenerated).map(([worksheetKey, qs]: any) => (
                                            <div key={worksheetKey} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                                <button 
                                                    onClick={() => toggleWorksheet(worksheetKey)}
                                                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-lg font-bold text-gray-900">{worksheetKey}</span>
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                                                            {qs.length} Questions
                                                        </span>
                                                    </div>
                                                    {expandedWorksheets[worksheetKey] ? <ChevronUp /> : <ChevronDown />}
                                                </button>
                                                
                                                {expandedWorksheets[worksheetKey] && (
                                                    <div className="p-6 bg-white space-y-0">
                                                        {qs.map((q: any) => (
                                                            <GeneratedQuestionItem 
                                                                key={`generated-${q.id}`} 
                                                                q={q} 
                                                                userAnswer={userAnswers[`generated-${q.id}`] || ''}
                                                                evalResult={evaluations[`generated-${q.id}`]}
                                                                hasAttempted={!!attemptedQuestions[`generated-${q.id}`]}
                                                                onAnswerChange={(val) => handleAnswerChange(`generated-${q.id}`, val)}
                                                                onSubmitAnswer={() => handleEvaluateSingle(`generated-${q.id}`, q.question, q.answerMarkdown || '')}
                                                                subject={subject}       
                                                                level={level}         
                                                                topicId={topicId === 'all' ? -1 : parseInt(topicId)} 
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {actualQuestions.length === 0 ? (
                                        <div className="text-center py-10 text-gray-400">
                                            No official questions found for this topic.
                                        </div>
                                    ) : (
                                        Object.entries(groupedActual).reverse().map(([year, qs]: any) => (
                                            <div key={year} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                                <button 
                                                    onClick={() => toggleYear(Number(year))}
                                                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-lg font-bold text-gray-900">{year} Examination</span>
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                                                            {qs.length} Questions
                                                        </span>
                                                    </div>
                                                    {expandedYears[Number(year)] ? <ChevronUp /> : <ChevronDown />}
                                                </button>
                                                
                                                {expandedYears[Number(year)] && (
                                                    <div className="p-6 bg-white space-y-0">
                                                        {qs.map((q: any) => (
                                                            <ActualQuestionItem 
                                                                key={`actual-${q.id}`} 
                                                                q={q} 
                                                                userAnswer={userAnswers[`actual-${q.id}`] || ''}
                                                                evalResult={evaluations[`actual-${q.id}`]}
                                                                hasAttempted={!!attemptedQuestions[`actual-${q.id}`]}
                                                                onAnswerChange={(val) => handleAnswerChange(`actual-${q.id}`, val)}
                                                                onSubmitAnswer={() => handleEvaluateSingle(`actual-${q.id}`, q.questionHtml, q.answerHtml || '')}
                                                                subject={subject}     
                                                                level={level}           
                                                                topicId={topicId === 'all' ? -1 : parseInt(topicId)} 
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <FlashcardTestModal
                isOpen={isTestOpen}
                onClose={() => setIsTestOpen(false)}
                topicId={topicId === 'all' ? -1 : parseInt(topicId)}
                topicName={topicName}
                flashcards={flashcards}
                onComplete={(score) => {
                    if (!bestScore || score > bestScore.score) {
                        setBestScore({ score, totalQuestions: flashcards.length });
                    }
                }}
            />
        </div>
    );
}













// 'use client';

// import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
// import Link from 'next/link';
// import { useRouter } from 'next/navigation';
// import { getUser, getUserWithTeam } from '@/lib/db/queries';
// import { 
//     Brain, FileText, MessageCircle, Mic, ArrowLeft, 
//     RefreshCw, Trophy, ChevronDown, ChevronUp, Eye, EyeOff, Send, Loader2, X,
//     CheckCircle, XCircle, CheckSquare 
// } from 'lucide-react';

// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Textarea } from '@/components/ui/textarea';

// import { saveLessonProgress, clearLessonProgress } from '@/app/(dashboard)/lesson-progress-actions';
// import LiveAudioComponent, { type LessonProgress } from '@/components/live-simulation-component';
// import FlashcardGenerator from '@/components/flashcard-generator';
// import PastPaperGenerator from '@/components/past-paper-generator';
// import KnowledgeUploader from '@/components/knowledge-uploader';
// import TopicSettingsDialog from '@/components/topic-settings-dialog';
// import TextTutorChat from '@/components/text-tutor-chat';
// import FlashcardTestModal from '@/components/flashcard-test-modal';
// import { savePastPaperAttemptAction, saveVoiceSessionAction, evaluateAnswerWithAIAction } from '@/app/(dashboard)/actions';
// import type { ActualPastPaperQuestion } from '@/lib/db/schema';

// interface Flashcard {
//     id?: number;
//     front: string;
//     back: string;
//     topic?: string;
// }

// interface Question {
//     id: number;
//     year: string;
//     question: string;
//     answerMarkdown: string;
//     explanationMarkdown?: string;
//     topic?: string;
//     worksheetName?: string;     
//     worksheetNumber?: number;
// }

// interface TopicViewProps {
//     level: string;
//     subject: string;
//     topicId: string;
//     topicName: string;
//     isAllTopics: boolean;
//     flashcards: Flashcard[];
//     questions: Question[];
//     actualQuestions?: ActualPastPaperQuestion[];
//     voicePrompt: string;
//     backgroundContext?: string;
//     lessonPlan?: string;
//     initialBestScore?: { score: number; totalQuestions: number } | null;
//     canEdit: boolean;
//     initialLessonProgress?: LessonProgress | null;
//     preloadedVoiceContext?: string;
//     userRole?: string;
// }

// interface EvaluationResult {
//     score: number;
//     isCorrect: boolean;
//     feedback?: string;     
//     isEvaluating?: boolean;
// }

// // Lightweight similarity algorithm (Sørensen–Dice coefficient)
// function getDiceCoefficient(s1: string, s2: string): number {
//     const clean1 = s1.replace(/<[^>]*>?/gm, '').replace(/[^\w\s]/gi, '').toLowerCase().trim();
//     const clean2 = s2.replace(/<[^>]*>?/gm, '').replace(/[^\w\s]/gi, '').toLowerCase().trim();
    
//     if (clean1 === clean2) return 100;
//     if (clean1.length < 2 || clean2.length < 2) return 0;

//     let bigrams1 = new Map<string, number>();
//     for (let i = 0; i < clean1.length - 1; i++) {
//         const bg = clean1.substring(i, i + 2);
//         bigrams1.set(bg, (bigrams1.get(bg) || 0) + 1);
//     }

//     let intersectionSize = 0;
//     for (let i = 0; i < clean2.length - 1; i++) {
//         const bg = clean2.substring(i, i + 2);
//         const count = bigrams1.get(bg);
//         if (count && count > 0) {
//             bigrams1.set(bg, count - 1);
//             intersectionSize++;
//         }
//     }

//     const score = (2.0 * intersectionSize) / (clean1.length - 1 + clean2.length - 1);
//     return Math.min(Math.round(score * 100), 100);
// }

// function ActualQuestionItem({ 
//     q, 
//     userAnswer, 
//     evalResult, 
//     hasAttempted,
//     onAnswerChange, 
//     onSubmitAnswer,
//     onDiscussVoice
// }: { 
//     q: any; 
//     userAnswer: string; 
//     evalResult?: EvaluationResult; 
//     hasAttempted: boolean;
//     onAnswerChange: (val: string) => void; 
//     onSubmitAnswer: () => void;
//     onDiscussVoice: () => void;
// }) {
//     const [showAnswer, setShowAnswer] = useState(false);
//     const [isChatOpen, setIsChatOpen] = useState(false);
//     const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
//     const [input, setInput] = useState('');
//     const [isTyping, setIsTyping] = useState(false);

//     const handleSend = async () => {
//         if (!input.trim() || isTyping) return;
//         const userMsg = { role: 'user', content: input };
//         setMessages(prev => [...prev, userMsg as any]);
//         setInput('');
//         setIsTyping(true);

//         try {
//             const res = await fetch('/api/ai/past-paper-tutor', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     questionData: q,
//                     history: [...messages, userMsg]
//                 })
//             });
//             const data = await res.json();
//             setMessages(prev => [...prev, { role: 'ai', content: data.text }]);
//         } catch (e) {
//             console.error("Tutor error", e);
//         } finally {
//             setIsTyping(false);
//         }
//     };

//     return (
//         <div className="border-b border-gray-100 last:border-0 py-6">
//             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
//                 <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded whitespace-nowrap">
//                     Question {q.questionNumber} ({q.marks} Marks)
//                 </span>
//                 <div className="flex w-full sm:w-auto gap-2">
//                     <Button 
//                         variant="outline" 
//                         size="sm" 
//                         onClick={onDiscussVoice}
//                         className="h-8 flex-1 sm:flex-none text-orange-600 hover:bg-orange-50/50 border-orange-200"
//                     >
//                         <Mic className="h-4 w-4 mr-1.5 shrink-0" />
//                         <span className="whitespace-nowrap">Voice Tutor</span>
//                     </Button>
//                     {hasAttempted && (
//                         <>
//                             <Button 
//                                 variant="outline" 
//                                 size="sm" 
//                                 onClick={() => setIsChatOpen(!isChatOpen)}
//                                 className={`h-8 flex-1 sm:flex-none transition-colors ${isChatOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'text-gray-500'}`}
//                             >
//                                 <MessageCircle className="h-4 w-4 mr-1.5 shrink-0" />
//                                 <span className="whitespace-nowrap">{isChatOpen ? "Close Tutor" : "Ask Tutor"}</span>
//                             </Button>
//                             <Button 
//                                 variant="ghost" 
//                                 size="sm" 
//                                 onClick={() => setShowAnswer(!showAnswer)} 
//                                 className="text-blue-600 h-8 flex-1 sm:flex-none bg-blue-50/50 sm:bg-transparent ring-1 ring-blue-100 sm:ring-0"
//                             >
//                                 {showAnswer ? <EyeOff className="h-4 w-4 mr-1.5 shrink-0" /> : <Eye className="h-4 w-4 mr-1.5 shrink-0" />}
//                                 <span className="whitespace-nowrap">{showAnswer ? "Hide Answer" : "Show Answer"}</span>
//                             </Button>
//                         </>
//                     )}
//                 </div>
//             </div>

//             <div className="prose prose-slate max-w-none actual-paper-content" dangerouslySetInnerHTML={{ __html: q.questionHtml }} />

//             {/* AI Tutor Chat Interface */}
//             {isChatOpen && hasAttempted && (
//                 <div className="mt-4 border border-blue-100 rounded-xl bg-blue-50/30 overflow-hidden shadow-inner">
//                     <div className="p-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
//                         <span className="text-xs font-bold text-blue-700 flex items-center">
//                             <Brain className="h-3 w-3 mr-1.5" /> PERSONAL TUTOR: QUESTION {q.questionNumber}
//                         </span>
//                         <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)} className="h-6 w-6 text-blue-400">
//                             <X className="h-3 w-3" />
//                         </Button>
//                     </div>
                    
//                     <div className="p-4 max-h-60 overflow-y-auto space-y-3">
//                         {messages.length === 0 && (
//                             <p className="text-sm text-blue-600 italic">"Hi! I can help you understand the logic behind this question or explain the topic. What's on your mind?"</p>
//                         )}
//                         {messages.map((m, i) => (
//                             <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
//                                 <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
//                                     m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-blue-100'
//                                 }`}>
//                                     <div dangerouslySetInnerHTML={{ __html: m.content }} />
//                                 </div>
//                             </div>
//                         ))}
//                         {isTyping && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
//                     </div>

//                     <div className="p-3 bg-white border-t border-blue-100 flex gap-2">
//                         <input 
//                             type="text" 
//                             value={input}
//                             onChange={(e) => setInput(e.target.value)}
//                             onKeyDown={(e) => e.key === 'Enter' && handleSend()}
//                             placeholder="Ask about this question..."
//                             className="flex-1 text-sm border-none focus:ring-0 outline-none px-2"
//                         />
//                         <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="h-8 w-8 bg-blue-600">
//                             <Send className="h-3 w-3" />
//                         </Button>
//                     </div>
//                 </div>
//             )}

//             {/* Answer Input & Evaluation */}
//             <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
//                 <label className="text-xs font-bold text-slate-600 mb-2 block uppercase tracking-wider">Your Answer:</label>
//                 <Textarea 
//                     placeholder="Type your answer here..." 
//                     value={userAnswer}
//                     onChange={(e) => onAnswerChange(e.target.value)}
//                     disabled={evalResult?.isEvaluating}
//                     className="w-full text-sm resize-y min-h-[100px] mb-3 bg-white"
//                 />
//                 <div className="flex justify-between items-center">
//                     <Button 
//                         onClick={onSubmitAnswer} 
//                         size="sm" 
//                         variant="secondary" 
//                         disabled={!userAnswer.trim() || evalResult?.isEvaluating}
//                         className="bg-blue-600 text-white hover:bg-blue-700"
//                     >
//                         {evalResult?.isEvaluating ? (
//                             <>
//                                 <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Evaluating...
//                             </>
//                         ) : 'Submit Answer'}
//                     </Button>
//                     {evalResult && (
//                         <div className={`text-sm font-bold flex items-center px-3 py-1.5 rounded-lg border ${
//                             evalResult.isEvaluating
//                                 ? 'bg-slate-100 text-slate-500 border-slate-200 animate-pulse'
//                                 : evalResult.isCorrect 
//                                     ? 'bg-green-50 text-green-700 border-green-200' 
//                                     : 'bg-red-50 text-red-700 border-red-200'
//                         }`}>
//                             {evalResult.isEvaluating ? (
//                                 <>
//                                     <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
//                                     AI Analyzing...
//                                 </>
//                             ) : (
//                                 <>
//                                     {evalResult.isCorrect ? <CheckCircle className="h-4 w-4 mr-1.5" /> : <XCircle className="h-4 w-4 mr-1.5" />}
//                                     {evalResult.isCorrect ? 'Correct' : 'Needs Review'} ({evalResult.score}%)
//                                 </>
//                             )}
//                         </div>
//                     )}
//                 </div>
//                 {evalResult && evalResult.feedback && !evalResult.isEvaluating && (
//                     <div className={`mt-3 p-2.5 rounded-lg text-xs leading-relaxed border ${
//                         evalResult.isCorrect 
//                             ? 'bg-green-50/50 text-green-800 border-green-100' 
//                             : 'bg-red-50/50 text-red-800 border-red-100'
//                     }`}>
//                         <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">Feedback:</span>
//                         {evalResult.feedback}
//                     </div>
//                 )}
//             </div>

//             {showAnswer && hasAttempted && (
//                 <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg">
//                     <p className="text-xs font-bold text-green-700 mb-2 uppercase">Model Answer:</p>
//                     <div className="prose prose-green max-w-none" dangerouslySetInnerHTML={{ __html: q.answerHtml }} />
//                     {q.workingHtml && (
//                         <div 
//                              className="mt-3 pt-3 border-t border-green-200 italic text-sm text-green-800"
//                             dangerouslySetInnerHTML={{ __html: q.workingHtml }} 
//                          />
//                     )}
//                 </div>
//             )}
//         </div>
//     );
// }

// function GeneratedQuestionItem({ 
//     q, 
//     userAnswer, 
//     evalResult, 
//     hasAttempted,
//     onAnswerChange, 
//     onSubmitAnswer,
//     onDiscussVoice
// }: { 
//     q: Question; 
//     userAnswer: string; 
//     evalResult?: EvaluationResult; 
//     hasAttempted: boolean;
//     onAnswerChange: (val: string) => void; 
//     onSubmitAnswer: () => void;
//     onDiscussVoice: () => void;
// }) {
//     const [showAnswer, setShowAnswer] = useState(false);
//     const [isChatOpen, setIsChatOpen] = useState(false);
//     const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
//     const [input, setInput] = useState('');
//     const [isTyping, setIsTyping] = useState(false);

//     const handleSend = async () => {
//         if (!input.trim() || isTyping) return;
//         const userMsg = { role: 'user', content: input };
//         setMessages(prev => [...prev, userMsg as any]);
//         setInput('');
//         setIsTyping(true);

//         try {
//             const res = await fetch('/api/ai/past-paper-tutor', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     questionData: q,
//                     history: [...messages, userMsg]
//                 })
//             });
//             const data = await res.json();
//             setMessages(prev => [...prev, { role: 'ai', content: data.text }]);
//         } catch (e) {
//             console.error("Tutor error", e);
//         } finally {
//             setIsTyping(false);
//         }
//     };

//     return (
//         <div className="border-b border-gray-100 last:border-0 py-6">
//             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
//                 <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded whitespace-nowrap">
//                     Year: {q.year}
//                 </span>
//                 <div className="flex w-full sm:w-auto gap-2">
//                     <Button 
//                         variant="outline" 
//                         size="sm" 
//                         onClick={onDiscussVoice}
//                         className="h-8 flex-1 sm:flex-none text-orange-600 hover:bg-orange-50/50 border-orange-200"
//                     >
//                         <Mic className="h-4 w-4 mr-1.5 shrink-0" />
//                         <span className="whitespace-nowrap">Voice Tutor</span>
//                     </Button>
//                     {hasAttempted && (
//                         <>
//                             <Button 
//                                 variant="outline" 
//                                 size="sm" 
//                                 onClick={() => setIsChatOpen(!isChatOpen)}
//                                 className={`h-8 flex-1 sm:flex-none transition-colors ${isChatOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'text-gray-500'}`}
//                             >
//                                 <MessageCircle className="h-4 w-4 mr-1.5 shrink-0" />
//                                 <span className="whitespace-nowrap">{isChatOpen ? "Close Tutor" : "Ask Tutor"}</span>
//                             </Button>
//                             <Button 
//                                 variant="ghost" 
//                                 size="sm" 
//                                 onClick={() => setShowAnswer(!showAnswer)} 
//                                 className="text-blue-600 h-8 flex-1 sm:flex-none bg-blue-50/50 sm:bg-transparent ring-1 ring-blue-100 sm:ring-0"
//                             >
//                                 {showAnswer ? <EyeOff className="h-4 w-4 mr-1.5 shrink-0" /> : <Eye className="h-4 w-4 mr-1.5 shrink-0" />}
//                                 <span className="whitespace-nowrap">{showAnswer ? "Hide Answer" : "Show Answer"}</span>
//                             </Button>
//                         </>
//                     )}
//                 </div>
//             </div>

//             <p className="font-medium mb-4 text-gray-900 leading-relaxed">{q.question}</p>

//             {/* AI Tutor Chat Interface */}
//             {isChatOpen && hasAttempted && (
//                 <div className="mt-4 border border-blue-100 rounded-xl bg-blue-50/30 overflow-hidden shadow-inner">
//                     <div className="p-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
//                         <span className="text-xs font-bold text-blue-700 flex items-center">
//                             <Brain className="h-3 w-3 mr-1.5" /> PERSONAL TUTOR: GENERATED QUESTION
//                         </span>
//                         <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)} className="h-6 w-6 text-blue-400">
//                             <X className="h-3 w-3" />
//                         </Button>
//                     </div>
                    
//                     <div className="p-4 max-h-60 overflow-y-auto space-y-3">
//                         {messages.length === 0 && (
//                             <p className="text-sm text-blue-600 italic">"Hi! I can help you understand the logic behind this question or explain the topic. What's on your mind?"</p>
//                         )}
//                         {messages.map((m, i) => (
//                             <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
//                                 <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
//                                     m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-blue-100'
//                                 }`}>
//                                     <div dangerouslySetInnerHTML={{ __html: m.content }} />
//                                 </div>
//                             </div>
//                         ))}
//                         {isTyping && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
//                     </div>

//                     <div className="p-3 bg-white border-t border-blue-100 flex gap-2">
//                         <input 
//                             type="text" 
//                             value={input}
//                             onChange={(e) => setInput(e.target.value)}
//                             onKeyDown={(e) => e.key === 'Enter' && handleSend()}
//                             placeholder="Ask about this question..."
//                             className="flex-1 text-sm border-none focus:ring-0 outline-none px-2"
//                         />
//                         <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="h-8 w-8 bg-blue-600">
//                             <Send className="h-3 w-3" />
//                         </Button>
//                     </div>
//                 </div>
//             )}

//             {/* Answer Input & Evaluation */}
//             <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
//                 <label className="text-xs font-bold text-slate-600 mb-2 block uppercase tracking-wider">Your Answer:</label>
//                 <Textarea 
//                     placeholder="Type your answer here..." 
//                     value={userAnswer}
//                     onChange={(e) => onAnswerChange(e.target.value)}
//                     disabled={evalResult?.isEvaluating}
//                     className="w-full text-sm resize-y min-h-[100px] mb-3 bg-white"
//                 />
//                 <div className="flex justify-between items-center">
//                     <Button 
//                         onClick={onSubmitAnswer} 
//                         size="sm" 
//                         variant="secondary" 
//                         disabled={!userAnswer.trim() || evalResult?.isEvaluating}
//                         className="bg-blue-600 text-white hover:bg-blue-700"
//                     >
//                         {evalResult?.isEvaluating ? (
//                             <>
//                                 <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Evaluating...
//                             </>
//                         ) : 'Submit Answer'}
//                     </Button>
//                     {evalResult && (
//                         <div className={`text-sm font-bold flex items-center px-3 py-1.5 rounded-lg border ${
//                             evalResult.isEvaluating
//                                 ? 'bg-slate-100 text-slate-500 border-slate-200 animate-pulse'
//                                 : evalResult.isCorrect 
//                                     ? 'bg-green-50 text-green-700 border-green-200' 
//                                     : 'bg-red-50 text-red-700 border-red-200'
//                         }`}>
//                             {evalResult.isEvaluating ? (
//                                 <>
//                                     <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
//                                     AI Analyzing...
//                                 </>
//                             ) : (
//                                 <>
//                                     {evalResult.isCorrect ? <CheckCircle className="h-4 w-4 mr-1.5" /> : <XCircle className="h-4 w-4 mr-1.5" />}
//                                     {evalResult.isCorrect ? 'Correct' : 'Needs Review'} ({evalResult.score}%)
//                                 </>
//                             )}
//                         </div>
//                     )}
//                 </div>
//                 {evalResult && evalResult.feedback && !evalResult.isEvaluating && (
//                     <div className={`mt-3 p-2.5 rounded-lg text-xs leading-relaxed border ${
//                         evalResult.isCorrect 
//                             ? 'bg-green-50/50 text-green-800 border-green-100' 
//                             : 'bg-red-50/50 text-red-800 border-red-100'
//                     }`}>
//                         <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">Feedback:</span>
//                         {evalResult.feedback}
//                     </div>
//                 )}
//             </div>

//             {showAnswer && hasAttempted && (
//                 <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg">
//                     <p className="text-xs font-bold text-green-700 mb-2 uppercase">Model Answer:</p>
//                     <div className="prose prose-sm prose-green max-w-none" dangerouslySetInnerHTML={{ __html: q.answerMarkdown }} />
//                     {q.explanationMarkdown && (
//                         <div className="mt-3 pt-3 border-t border-green-200">
//                             <p className="text-xs font-bold text-green-700 mb-1 uppercase">Explanation:</p>
//                             <div className="prose prose-sm prose-green max-w-none italic" dangerouslySetInnerHTML={{ __html: q.explanationMarkdown }} />
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );
// }

// function FlashcardItem({ card, isAllTopics }: { card: Flashcard; isAllTopics: boolean }) {
//     const [isFlipped, setIsFlipped] = useState(false);

//     return (
//         <div
//             className="group perspective-1000 h-64 cursor-pointer"
//             onClick={() => setIsFlipped(!isFlipped)}
//         >
//             <div className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
//                 {/* Front Face */}
//                 <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
//                     <Card className="h-full flex flex-col justify-center items-center text-center p-6 hover:shadow-lg transition-shadow border-orange-100 relative">
//                         {isAllTopics && card.topic && (
//                             <span className="absolute top-4 right-4 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
//                                 {card.topic}
//                             </span>
//                         )}
//                         <div className="flex-1 flex flex-col justify-center items-center overflow-y-auto w-full">
//                             <p className="font-medium text-lg text-gray-800">{card.front}</p>
//                         </div>
//                         <span className="text-xs text-gray-400 mt-4 md:block hidden">Hover or tap to reveal</span>
//                         <span className="text-xs text-gray-400 mt-4 md:hidden block">Tap to reveal</span>
//                     </Card>
//                 </div>

//                 {/* Back Face */}
//                 <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
//                     <Card className="h-full flex flex-col justify-center items-center text-center p-6 bg-orange-50 border-orange-200 shadow-md relative">
//                         {isAllTopics && card.topic && (
//                             <span className="absolute top-4 right-4 text-xs font-bold text-orange-600 bg-white px-2 py-1 rounded-full">
//                                 {card.topic}
//                             </span>
//                         )}
//                         <div className="flex-1 flex flex-col justify-center items-center overflow-y-auto w-full">
//                             <p className="text-orange-700 font-bold text-lg">{card.back}</p>
//                         </div>
//                     </Card>
//                 </div>
//             </div>
//         </div>
//     );
// }

// export default function TopicView({
//     level,
//     subject,
//     topicId,
//     topicName,
//     isAllTopics,
//     flashcards,
//     questions,
//     actualQuestions = [],
//     voicePrompt,
//     backgroundContext = "",
//     lessonPlan = "",
//     initialBestScore = null,
//     canEdit = false,
//     initialLessonProgress = null,
//     preloadedVoiceContext = '',
//     userRole = '', 
// }: TopicViewProps) {
//     const [activeTab, setActiveTab] = useState('voice');
//     const [isTestOpen, setIsTestOpen] = useState(false);
//     const [bestScore, setBestScore] = useState(initialBestScore); 

//     // Submission and evaluation states
//     const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
//     const [evaluations, setEvaluations] = useState<Record<string, EvaluationResult>>({});
//     const [attemptedQuestions, setAttemptedQuestions] = useState<Record<string, boolean>>({}); 
//     const [expandedWorksheets, setExpandedWorksheets] = useState<Record<string, boolean>>({});

//     // Specific Voice Discuss States
//     const [voiceContextOverride, setVoiceContextOverride] = useState<string>('');
//     const [shouldAutoStartVoice, setShouldAutoStartVoice] = useState<boolean>(false);

//     const isVoiceActiveRef = useRef(false);
//     const voiceSessionStartRef = useRef<number>(Date.now());
//     const textTutorSaveRef = useRef<(() => void) | null>(null);

//     useEffect(() => {
//         return () => {
//             if (!isVoiceActiveRef.current) return;
        
//             const durationSeconds = Math.round((Date.now() - voiceSessionStartRef.current) / 1000);
//             if (durationSeconds < 30) return;
        
//             const progress = lessonProgressRef.current;
        
//             const payload = JSON.stringify({
//                 topicId: topicId === 'all' ? null : parseInt(topicId),
//                 durationSeconds,
//                 topicsIntroduced: progress.topicsIntroduced,
//                 topicsConfirmed: progress.topicsConfirmed,
//                 studentMisconceptions: progress.studentMisconceptions,
//                 lastSummary: progress.lastSummary,
//             });
        
//             navigator.sendBeacon('/api/sessions/save-voice', payload);
//         };
//     }, [topicId]);

//     const lessonProgressRef = useRef<LessonProgress>(initialLessonProgress || {
//         topicsIntroduced: [],
//         topicsConfirmed: [],
//         currentTopic: '',
//         studentMisconceptions: [],
//         lastSummary: '',
//         sessionCount: 0,
//     });

//     const handleVoiceConversationEnd = useCallback(async (
//         blob: Blob,
//         progress: LessonProgress
//     ) => {
//         isVoiceActiveRef.current = false; 
//         const durationSeconds = Math.round((Date.now() - voiceSessionStartRef.current) / 1000);
    
//         if (durationSeconds < 30) return;
    
//         await saveVoiceSessionAction({
//             topicId: topicId === 'all' ? null : parseInt(topicId),
//             durationSeconds,
//             topicsIntroduced: progress.topicsIntroduced,
//             topicsConfirmed: progress.topicsConfirmed,
//             studentMisconceptions: progress.studentMisconceptions,
//             lastSummary: progress.lastSummary,
//         });
//     }, [topicId]);

//     const [paperType, setPaperType] = useState<'actual' | 'generated'>(
//         actualQuestions && actualQuestions.length > 0 ? 'actual' : 'generated'
//     );
    
//     const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});
//     const router = useRouter();

//     const handleLessonProgressUpdate = useCallback(async (progress: LessonProgress) => {
//         lessonProgressRef.current = progress;
//         if (topicId !== 'all') {
//             const numericId = parseInt(topicId);
//             if (!isNaN(numericId)) {
//                 await saveLessonProgress(numericId, progress);
//             }
//         }
//     }, [topicId]);

//     // Handle answer input change
//     const handleAnswerChange = (id: string, text: string) => {
//         setUserAnswers(prev => ({ ...prev, [id]: text }));
//         if (evaluations[id]) {
//             setEvaluations(prev => {
//                 const newEv = { ...prev };
//                 delete newEv[id];
//                 return newEv;
//             });
//         }
//     };

//     // Helper to start specific question discussion on Voice Tutor
//     const handleDiscussWithVoice = (questionText: string, answerText: string) => {
//         const cleanQ = questionText.replace(/<[^>]*>?/gm, '').trim();
//         const cleanA = answerText.replace(/<[^>]*>?/gm, '').trim();
//         const overridePrompt = `\n\n[CONTEXT NOTE: The student has selected a specific past-paper question to discuss with you. Frame the discussion around explaining this question, guiding them to understand the solution, and clarifying any underlying issues or misconceptions they show.]\nQuestion Selected: "${cleanQ}"\nModel Answer: "${cleanA}"`;
        
//         setVoiceContextOverride(overridePrompt);
//         setShouldAutoStartVoice(true);
//         setActiveTab('voice');
//     };

//     // Evaluate single answer with local similarity fast-pass followed by AI fallback
//     const handleEvaluateSingle = async (id: string, questionText: string, modelAnswer: string) => {
//         const ans = userAnswers[id] || '';
//         if (!ans.trim()) return;

//         // 1. Local similarity fast pass (Avoid AI costs for near-perfect lexical matches)
//         const localScore = getDiceCoefficient(ans, modelAnswer);
//         if (localScore >= 85) {
//             setEvaluations(prev => ({ 
//                 ...prev, 
//                 [id]: { 
//                     score: localScore, 
//                     isCorrect: true, 
//                     feedback: "Spot on! Your answer matches our model answer standard." 
//                 } 
//             }));
//             setAttemptedQuestions(prev => ({ ...prev, [id]: true }));
//             return;
//         }

//         // 2. Transition state to active AI Evaluation
//         setEvaluations(prev => ({ 
//             ...prev, 
//             [id]: { score: 0, isCorrect: false, feedback: "", isEvaluating: true } 
//         }));

//         try {
//             const res = await evaluateAnswerWithAIAction({
//                 question: questionText,
//                 userAnswer: ans,
//                 modelAnswer: modelAnswer
//             });

//             if (res && 'success' in res && res.success) {
//                 setEvaluations(prev => ({ 
//                     ...prev, 
//                     [id]: { 
//                         score: res.score ?? 0, 
//                         isCorrect: !!res.isCorrect, 
//                         feedback: res.feedback || "",
//                         isEvaluating: false 
//                     } 
//                 }));
//                 setAttemptedQuestions(prev => ({ ...prev, [id]: true }));
//             } else {
//                 // Fallback locally on processing errors
//                 setEvaluations(prev => ({ 
//                     ...prev, 
//                     [id]: { 
//                         score: localScore, 
//                         isCorrect: localScore >= 65, 
//                         feedback: "Processed via secondary local fallback analysis.",
//                         isEvaluating: false 
//                     } 
//                 }));
//                 setAttemptedQuestions(prev => ({ ...prev, [id]: true }));
//             }
//         } catch (error) {
//             console.error("AI Evaluation error:", error);
//             setEvaluations(prev => ({ 
//                 ...prev, 
//                 [id]: { 
//                     score: localScore, 
//                     isCorrect: localScore >= 65, 
//                     feedback: "Could not connect to evaluator. Performed lexical local match.",
//                     isEvaluating: false 
//                 } 
//             }));
//             setAttemptedQuestions(prev => ({ ...prev, [id]: true }));
//         }
//     };

//     // Submits and evaluates all currently typed, visible, and un-evaluated answers
//     const handleSubmitAll = async () => {
//         const targets: { id: string; question: string; modelAnswer: string; isActual: boolean; yearOrWorksheet: string }[] = [];

//         if (paperType === 'actual') {
//             actualQuestions.forEach(q => {
//                 const id = `actual-${q.id}`;
//                 if (userAnswers[id]?.trim() && !attemptedQuestions[id]) {
//                     targets.push({
//                         id,
//                         question: q.questionHtml || '',
//                         modelAnswer: q.answerHtml || '',
//                         isActual: true,
//                         yearOrWorksheet: String(q.year)
//                     });
//                 }
//             });
//         } else {
//             questions.forEach(q => {
//                 const id = `generated-${q.id}`;
//                 if (userAnswers[id]?.trim() && !attemptedQuestions[id]) {
//                     let wsKey = "Worksheet 1";
//                     if (q.worksheetName) {
//                         wsKey = q.worksheetName;
//                     } else if (q.worksheetNumber) {
//                         wsKey = `Worksheet ${q.worksheetNumber}`;
//                     }
//                     targets.push({
//                         id,
//                         question: q.question || '',
//                         modelAnswer: q.answerMarkdown || '',
//                         isActual: false,
//                         yearOrWorksheet: wsKey
//                     });
//                 }
//             });
//         }

//         if (targets.length === 0) return;

//         // Set all to evaluating state
//         setEvaluations(prev => {
//             const updated = { ...prev };
//             targets.forEach(t => {
//                 updated[t.id] = { score: 0, isCorrect: false, feedback: "", isEvaluating: true };
//             });
//             return updated;
//         });

//         // Parallel processing of batches with hybrid grading logic
//         const evaluationPromises = targets.map(async (t) => {
//             const ans = userAnswers[t.id] || '';
//             const localScore = getDiceCoefficient(ans, t.modelAnswer);

//             if (localScore >= 85) {
//                 const localResult = { 
//                     score: localScore, 
//                     isCorrect: true, 
//                     feedback: "Spot on! Your answer matches our model answer standard." 
//                 };
//                 setEvaluations(prev => ({ ...prev, [t.id]: localResult }));
//                 setAttemptedQuestions(prev => ({ ...prev, [t.id]: true }));
//                 return { ...t, eval: localResult };
//             }

//             try {
//                 const res = await evaluateAnswerWithAIAction({
//                     question: t.question,
//                     userAnswer: ans,
//                     modelAnswer: t.modelAnswer
//                 });

//                 if (res && 'success' in res && res.success) {
//                     const aiResult = {
//                         score: res.score ?? 0,
//                         isCorrect: !!res.isCorrect,
//                         feedback: res.feedback || ""
//                     };
//                     setEvaluations(prev => ({ ...prev, [t.id]: aiResult }));
//                     setAttemptedQuestions(prev => ({ ...prev, [t.id]: true }));
//                     return { ...t, eval: aiResult };
//                 }
//             } catch (err) {
//                 console.error(`Batch AI match failure on question: ${t.id}`, err);
//             }

//             const fallbackResult = {
//                 score: localScore,
//                 isCorrect: localScore >= 65,
//                 feedback: "Processed via secondary local fallback analysis."
//             };
//             setEvaluations(prev => ({ ...prev, [t.id]: fallbackResult }));
//             setAttemptedQuestions(prev => ({ ...prev, [t.id]: true }));
//             return { ...t, eval: fallbackResult };
//         });

//         const results = await Promise.all(evaluationPromises);

//         // Group attempts for backend submission tracking
//         const groupSubmissions: Record<string, { correct: number; total: number; isActual: boolean }> = {};
//         results.forEach(r => {
//             const key = r.yearOrWorksheet;
//             if (!groupSubmissions[key]) {
//                 groupSubmissions[key] = { correct: 0, total: 0, isActual: r.isActual };
//             }
//             groupSubmissions[key].total++;
//             if (r.eval.isCorrect) {
//                 groupSubmissions[key].correct++;
//             }
//         });

//         for (const [key, meta] of Object.entries(groupSubmissions)) {
//             await savePastPaperAttemptAction({
//                 topicId: topicId === 'all' ? -1 : parseInt(topicId),
//                 paperType: meta.isActual ? 'actual' : 'generated',
//                 reference: meta.isActual ? `${key} Examination` : key,
//                 correctQuestions: meta.correct,
//                 totalQuestions: meta.total
//             });
//         }
//     };

//     const groupedGenerated = useMemo(() => {
//         const groups: Record<string, any[]> = {};
//         questions.forEach((q: any) => {
//             let key = "Worksheet 1";
//             if (q.worksheetName) {
//                 key = q.worksheetName;
//             } else if (q.worksheetNumber) {
//                 key = `Worksheet ${q.worksheetNumber}`;
//             }
//             if (!groups[key]) groups[key] = [];
//             groups[key].push(q);
//         });
//         return groups;
//     }, [questions]);

//     const contextPrompt = useMemo(() => {
//         let context = `\n\n--- Background Subject Context (Syllabus/Manual) ---\n${backgroundContext}\n\n`;
//         context += `\n\nHere is the Context Data (Use this to help the student, refer to specific cards or questions if relevant):\n`;

//         if (flashcards && flashcards.length > 0) {
//             context += `\n--- Flashcards ---\n`;
//             flashcards.forEach((card, i) => {
//                 context += `${i + 1}. Front: "${card.front}" | Back: "${card.back}"\n`;
//             });
//         } else {
//             context += `\n(No flashcards available)\n`;
//         }

//         if (questions && questions.length > 0) {
//             context += `\n--- Past Paper Questions ---\n`;
//             questions.forEach((q, i) => {
//                 context += `${i + 1}. [Year: ${q.year}] Q: "${q.question}"\n   A: "${q.answerMarkdown}"\n`;
//             });
//         } else {
//             context += `\n(No past paper questions available)\n`;
//         }

//         return voicePrompt + context;
//     }, [flashcards, questions, voicePrompt, backgroundContext]);

//     const groupedActual = useMemo(() => {
//         const groups: Record<number, any[]> = {};
//         actualQuestions.forEach((q: any) => {
//             if (!groups[q.year]) groups[q.year] = [];
//             groups[q.year].push(q);
//         });
//         return groups;
//     }, [actualQuestions]);

//     const toggleYear = (year: number) => {
//         setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
//     };

//     const toggleWorksheet = (name: string) => {
//         setExpandedWorksheets(prev => ({ ...prev, [name]: !prev[name] }));
//     };

//     return (
//         <div className="max-w-6xl mx-auto space-y-6">
//             {/* Navigation & Header */}
//             <div>
//                 <Link href={`/dashboard/${level}/subjects/${subject}`} className="text-sm text-gray-500 hover:text-orange-600 mb-2 flex items-center">
//                     <ArrowLeft className="h-4 w-4 mr-1" /> Back to {subject}
//                 </Link>
//                 <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
//                     <div>
//                         <h1 className="text-3xl font-extrabold text-gray-900">{topicName}</h1>
//                         <p className="text-gray-600">
//                             {isAllTopics
//                                 ? "Comprehensive review of all topics in this subject."
//                                 : "Master the building blocks of life."}
//                         </p>
//                     </div>
//                     {canEdit && !isAllTopics && (
//                         <div className="flex gap-2">
//                             <KnowledgeUploader topicId={topicId} topicName={topicName} />
//                             <TopicSettingsDialog
//                                 topicId={topicId}
//                                 topicName={topicName}
//                                 initialLessonPlan={lessonPlan}
//                             />
//                         </div>
//                     )}
//                     {/* Generator & Test Component */}
//                     {activeTab === 'flashcards' && (
//                         <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
//                             {flashcards.length > 0 && (
//                                 <div className="flex flex-col items-start sm:items-end flex-1 sm:flex-none">
//                                     {bestScore && (
//                                         <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 shadow-sm mb-2">
//                                             <Trophy className="h-3.5 w-3.5" /> Best: {bestScore.score}/{bestScore.totalQuestions}
//                                         </div>
//                                     )}
//                                     <Button
//                                         onClick={() => setIsTestOpen(true)}
//                                         className="bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all px-6 font-bold w-full sm:w-auto"
//                                     >
//                                         Test Yourself
//                                     </Button>
//                                 </div>
//                             )}
//                             {!isAllTopics && (
//                                 <div className="flex-1 sm:flex-none">
//                                     <FlashcardGenerator
//                                         subject={subject}
//                                         topicId={topicId}
//                                         topicName={topicName}
//                                         onSaved={() => router.refresh()}
//                                     />
//                                 </div>
//                             )}
//                         </div>
//                     )}
//                     {!isAllTopics && activeTab === 'pastpapers' && (
//                         <div className="w-full sm:w-auto">
//                             <PastPaperGenerator
//                                 subject={subject}
//                                 topicId={topicId}
//                                 topicName={topicName}
//                                 onSaved={() => router.refresh()}
//                             />
//                         </div>
//                     )}
//                 </div>
//             </div>

//             <Tabs defaultValue="voice" value={activeTab} className="w-full" onValueChange={(newTab) => {
//                 if (activeTab === 'text' && newTab !== 'text') {
//                     textTutorSaveRef.current?.();
//                 }
//                 if (newTab !== 'voice') {
//                     setShouldAutoStartVoice(false);
//                 }
//                 setActiveTab(newTab);
//             }}>
//                 <div className="overflow-x-auto pb-2 -mx-2 px-2 custom-scrollbar">
//                     <TabsList className="flex w-max min-w-full lg:grid lg:w-[500px] lg:grid-cols-4">
//                         <TabsTrigger value="voice" className="flex-1">Voice Tutor</TabsTrigger>
//                         <TabsTrigger value="text" className="flex-1">Text Tutor</TabsTrigger>
//                         <TabsTrigger value="flashcards" className="flex-1">Flashcards</TabsTrigger>
//                         <TabsTrigger value="pastpapers" className="flex-1">Past Papers</TabsTrigger>
//                     </TabsList>
//                 </div>

//                 {/* Voice Tutor Tab */}
//                 <TabsContent value="voice" className="mt-6">
//                     <Card className="border-orange-200 shadow-md">
//                         <CardHeader className="bg-gradient-to-r from-orange-50 to-white border-b border-orange-100">
//                             <CardTitle className="flex items-center text-orange-700">
//                                 <Mic className="h-5 w-5 mr-2" />
//                                 Voice Tutor Session {isAllTopics ? "(General)" : ""}
//                             </CardTitle>
//                         </CardHeader>
//                         <CardContent className="p-0 min-h-[500px] relative">
//                             <div className="h-[500px]">
//                                 <LiveAudioComponent
//                                     prompt={contextPrompt}
//                                     topicId={topicId === 'all' ? -1 : parseInt(topicId)}
//                                     topicIds={topicId === 'all' ? undefined : [parseInt(topicId)]} 
//                                     subject={subject}
//                                     level={level}
//                                     onConversationEnd={(blob) => {
//                                         voiceSessionStartRef.current = Date.now();
//                                         handleVoiceConversationEnd(blob, lessonProgressRef.current);
//                                     }}
//                                     onSessionStart={() => {
//                                         isVoiceActiveRef.current = true;
//                                         voiceSessionStartRef.current = Date.now();
//                                     }}
//                                     isEnding={false}
//                                     onLessonProgressUpdate={handleLessonProgressUpdate}   
//                                     initialLessonProgress={initialLessonProgress} 
//                                     preloadedContext={voiceContextOverride || preloadedVoiceContext}
//                                     autoStart={shouldAutoStartVoice}
//                                 />
//                             </div>
//                         </CardContent>
//                     </Card>
//                 </TabsContent>

//                 {/* Text Tutor Tab */}
//                 <TabsContent value="text" className="mt-6">
//                     <TextTutorChat
//                         level={level}
//                         contextPrompt={contextPrompt}
//                         topicName={topicName}
//                         subject={subject}
//                         topicId={topicId}
//                         saveRef={textTutorSaveRef}
//                     />
//                 </TabsContent>

//                 {/* Flashcards Tab */}
//                 <TabsContent value="flashcards" className="mt-6 space-y-6">
//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                         {flashcards.map((card, idx) => (
//                             <FlashcardItem key={card.id || idx} card={card} isAllTopics={isAllTopics} />
//                         ))}

//                         {/* Generator Placeholder */}
//                         {!isAllTopics && flashcards.length === 0 && (
//                             <div className="col-span-full flex justify-center py-10">
//                                 <div className="text-center">
//                                     <p className="text-gray-500 mb-4">No flashcards yet.</p>
//                                     <FlashcardGenerator
//                                         subject={subject}
//                                         topicId={topicId}
//                                         topicName={topicName}
//                                         onSaved={() => router.refresh()}
//                                     />
//                                 </div>
//                             </div>
//                         )}
//                     </div>
//                 </TabsContent>

//                 {/* Past Papers Tab */}
//                 <TabsContent value="pastpapers" className="mt-6">
//                     <Card>
//                         <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
//                             <div className="flex items-center gap-4">
//                                 <CardTitle>Questions</CardTitle>
//                                 <Button 
//                                     size="sm" 
//                                     onClick={handleSubmitAll}
//                                     className="bg-orange-600 hover:bg-orange-700 text-white hidden sm:flex"
//                                 >
//                                     <CheckSquare className="h-4 w-4 mr-1.5" /> Submit All Visible
//                                 </Button>
//                             </div>
                            
//                             {/* Toggle Switch - Only show if actual questions exist */}
//                             {(actualQuestions && actualQuestions.length > 0) && (
//                                 <div className="flex bg-gray-100 p-1 rounded-lg">
//                                     <button 
//                                         onClick={() => setPaperType('actual')}
//                                         className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${paperType === 'actual' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
//                                     >
//                                         Official Papers
//                                     </button>
//                                     <button 
//                                         onClick={() => setPaperType('generated')}
//                                         className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${paperType === 'generated' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
//                                     >
//                                         AI Generated
//                                     </button>
//                                 </div>
//                             )}

//                             {/* Mobile submit all */}
//                             <Button 
//                                 size="sm" 
//                                 onClick={handleSubmitAll}
//                                 className="bg-orange-600 hover:bg-orange-700 text-white flex w-full sm:hidden"
//                             >
//                                 <CheckSquare className="h-4 w-4 mr-1.5" /> Submit All Visible
//                             </Button>
//                         </CardHeader>
                        
//                         <CardContent>
//                             {paperType === 'generated' ? (
//                                 <div className="space-y-4">
//                                     {questions.length === 0 ? (
//                                         <div className="text-center py-10 text-gray-400">
//                                             No AI Generated questions found for this topic.
//                                         </div>
//                                     ) : (
//                                         Object.entries(groupedGenerated).map(([worksheetKey, qs]: any) => (
//                                             <div key={worksheetKey} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
//                                                 <button 
//                                                     onClick={() => toggleWorksheet(worksheetKey)}
//                                                     className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
//                                                 >
//                                                     <div className="flex items-center gap-3">
//                                                         <span className="text-lg font-bold text-gray-900">{worksheetKey}</span>
//                                                         <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
//                                                             {qs.length} Questions
//                                                         </span>
//                                                     </div>
//                                                     {expandedWorksheets[worksheetKey] ? <ChevronUp /> : <ChevronDown />}
//                                                 </button>
                                                
//                                                 {expandedWorksheets[worksheetKey] && (
//                                                     <div className="p-6 bg-white space-y-0">
//                                                         {qs.map((q: any) => (
//                                                             <GeneratedQuestionItem 
//                                                                 key={`generated-${q.id}`} 
//                                                                 q={q} 
//                                                                 userAnswer={userAnswers[`generated-${q.id}`] || ''}
//                                                                 evalResult={evaluations[`generated-${q.id}`]}
//                                                                 hasAttempted={!!attemptedQuestions[`generated-${q.id}`]}
//                                                                 onAnswerChange={(val) => handleAnswerChange(`generated-${q.id}`, val)}
//                                                                 onSubmitAnswer={() => handleEvaluateSingle(`generated-${q.id}`, q.question, q.answerMarkdown || '')}
//                                                                 onDiscussVoice={() => handleDiscussWithVoice(q.question, q.answerMarkdown || '')}
//                                                             />
//                                                         ))}
//                                                     </div>
//                                                 )}
//                                             </div>
//                                         ))
//                                     )}
//                                 </div>
//                             ) : (
//                                 <div className="space-y-4">
//                                     {actualQuestions.length === 0 ? (
//                                         <div className="text-center py-10 text-gray-400">
//                                             No official questions found for this topic.
//                                         </div>
//                                     ) : (
//                                         Object.entries(groupedActual).reverse().map(([year, qs]: any) => (
//                                             <div key={year} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
//                                                 <button 
//                                                     onClick={() => toggleYear(Number(year))}
//                                                     className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
//                                                 >
//                                                     <div className="flex items-center gap-3">
//                                                         <span className="text-lg font-bold text-gray-900">{year} Examination</span>
//                                                         <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
//                                                             {qs.length} Questions
//                                                         </span>
//                                                     </div>
//                                                     {expandedYears[Number(year)] ? <ChevronUp /> : <ChevronDown />}
//                                                 </button>
                                                
//                                                 {expandedYears[Number(year)] && (
//                                                     <div className="p-6 bg-white space-y-0">
//                                                         {qs.map((q: any) => (
//                                                             <ActualQuestionItem 
//                                                                 key={`actual-${q.id}`} 
//                                                                 q={q} 
//                                                                 userAnswer={userAnswers[`actual-${q.id}`] || ''}
//                                                                 evalResult={evaluations[`actual-${q.id}`]}
//                                                                 hasAttempted={!!attemptedQuestions[`actual-${q.id}`]}
//                                                                 onAnswerChange={(val) => handleAnswerChange(`actual-${q.id}`, val)}
//                                                                 onSubmitAnswer={() => handleEvaluateSingle(`actual-${q.id}`, q.questionHtml, q.answerHtml || '')}
//                                                                 onDiscussVoice={() => handleDiscussWithVoice(q.questionHtml, q.answerHtml || '')}
//                                                             />
//                                                         ))}
//                                                     </div>
//                                                 )}
//                                             </div>
//                                         ))
//                                     )}
//                                 </div>
//                             )}
//                         </CardContent>
//                     </Card>
//                 </TabsContent>
//             </Tabs>

//             <FlashcardTestModal
//                 isOpen={isTestOpen}
//                 onClose={() => setIsTestOpen(false)}
//                 topicId={topicId === 'all' ? -1 : parseInt(topicId)}
//                 topicName={topicName}
//                 flashcards={flashcards}
//                 onComplete={(score) => {
//                     if (!bestScore || score > bestScore.score) {
//                         setBestScore({ score, totalQuestions: flashcards.length });
//                     }
//                 }}
//             />
//         </div>
//     );
// }