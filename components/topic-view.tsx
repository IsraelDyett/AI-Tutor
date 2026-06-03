//components\topic-view.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { 
    Brain, FileText, MessageCircle, Mic, ArrowLeft, 
    RefreshCw, Trophy, ChevronDown, ChevronUp, Eye, EyeOff , Send, Loader2, X 
} from 'lucide-react';

import { saveLessonProgress, clearLessonProgress } from '@/app/(dashboard)/lesson-progress-actions';
import type { LessonProgress } from '@/components/live-simulation-component';


function ActualQuestionItem({ q }: { q: any }) {
    const [showAnswer, setShowAnswer] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
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
            <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    Question {q.questionNumber} ({q.marks} Marks)
                </span>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className={`h-8 transition-colors ${isChatOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'text-gray-500'}`}
                    >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {isChatOpen ? "Close Tutor" : "Ask Tutor"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowAnswer(!showAnswer)} className="text-blue-600 h-8">
                        {showAnswer ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                        {showAnswer ? "Hide Answer" : "Show Answer"}
                    </Button>
                </div>
            </div>

            <div className="prose prose-slate max-w-none actual-paper-content" dangerouslySetInnerHTML={{ __html: q.questionHtml }} />

            {/* AI Tutor Chat Interface */}
            {isChatOpen && (
                <div className="mt-4 border border-blue-100 rounded-xl bg-blue-50/30 overflow-hidden shadow-inner">
                    <div className="p-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-blue-700 flex items-center">
                            <Brain className="h-3 w-3 mr-1.5" /> PERSONAL TUTOR: QUESTION {q.questionNumber}
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

            {showAnswer && (
                <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg">
                    <p className="text-xs font-bold text-green-700 mb-2 uppercase">Model Answer:</p>
                    <div className="prose prose-green max-w-none" dangerouslySetInnerHTML={{ __html: q.answerHtml }} />
                    {q.workingHtml && (
                        <div 
                             className="mt-3 pt-3 border-t border-green-200 italic text-sm text-green-800"
                            dangerouslySetInnerHTML={{ __html: q.workingHtml }} 
                         />
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

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LiveAudioComponent from '@/components/live-simulation-component';
import FlashcardGenerator from '@/components/flashcard-generator';
import PastPaperGenerator from '@/components/past-paper-generator';
import KnowledgeUploader from '@/components/knowledge-uploader';
import TopicSettingsDialog from '@/components/topic-settings-dialog';
import TextTutorChat from '@/components/text-tutor-chat';
import FlashcardTestModal from '@/components/flashcard-test-modal';
import { useRouter } from 'next/navigation';
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
}: TopicViewProps) {
    const [activeTab, setActiveTab] = useState('voice');
    const [isTestOpen, setIsTestOpen] = useState(false);
    const [bestScore, setBestScore] = useState(initialBestScore);
    const [paperType, setPaperType] = useState<'actual' | 'generated'>('actual');
    const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});
    const router = useRouter();

    const handleLessonProgressUpdate = useCallback(async (progress: LessonProgress) => {
        // Save to DB (Fix 3 — persists across page refreshes)
        if (topicId !== 'all') {
          const numericId = parseInt(topicId);
          if (!isNaN(numericId)) {
            await saveLessonProgress(numericId, progress);
          }
        }
      }, [topicId]);

    
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

    // Group actual questions by Year
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

            <Tabs defaultValue="voice" className="w-full" onValueChange={setActiveTab}>
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
                                    subject={subject}
                                    level={level}
                                    onConversationEnd={(blob) => console.log('Session ended', blob)}
                                    isEnding={false}
                                    onLessonProgressUpdate={handleLessonProgressUpdate}   
                                    initialLessonProgress={initialLessonProgress} 
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
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <CardTitle>Past Paper Questions</CardTitle>
                            
                            {/* Toggle Switch */}
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
                        </CardHeader>
                        
                        <CardContent>
                            {paperType === 'generated' ? (
                                <div className="space-y-4">
                                    {/* ... Existing Generated Questions Logic ... */}
                                    {questions.map((q: any) => (
                                        <div key={q.id} className="p-4 border rounded-lg">
                                            {/* ... q.question ... */}
                                        </div>
                                    ))}
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
                                                    <div className="p-6 bg-white space-y-2">
                                                        {qs.map((q: any) => (
                                                            <ActualQuestionItem key={q.id} q={q} />
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
                    // Update local best score if current is better
                    if (!bestScore || score > bestScore.score) {
                        setBestScore({ score, totalQuestions: flashcards.length });
                    }
                }}
            />
        </div>
    );
}
