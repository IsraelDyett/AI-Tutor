'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, FileText, MessageCircle, Mic, ArrowLeft, RefreshCw, Trophy } from 'lucide-react';
import LiveAudioComponent from '@/components/live-simulation-component';
import FlashcardGenerator from '@/components/flashcard-generator';
import PastPaperGenerator from '@/components/past-paper-generator';
import TextTutorChat from '@/components/text-tutor-chat';
import FlashcardTestModal from '@/components/flashcard-test-modal';
import { useRouter } from 'next/navigation';

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
    answer: string;
    topic?: string;
}

interface TopicViewProps {
    subject: string;
    topicId: string;
    topicName: string;
    isAllTopics: boolean;
    flashcards: Flashcard[];
    questions: Question[];
    voicePrompt: string;
    backgroundContext?: string;
    initialBestScore?: { score: number; totalQuestions: number } | null;
}

export default function TopicView({
    subject,
    topicId,
    topicName,
    isAllTopics,
    flashcards,
    questions,
    voicePrompt,
    backgroundContext = "",
    initialBestScore = null
}: TopicViewProps) {
    const [activeTab, setActiveTab] = useState('flashcards');
    const [isTestOpen, setIsTestOpen] = useState(false);
    const [bestScore, setBestScore] = useState(initialBestScore);
    const router = useRouter();

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
                context += `${i + 1}. [Year: ${q.year}] Q: "${q.question}"\n   A: "${q.answer}"\n`;
            });
        } else {
            context += `\n(No past paper questions available)\n`;
        }

        return voicePrompt + context;
    }, [flashcards, questions, voicePrompt, backgroundContext]);

    return (
        <div className="max-w-6xl mx-auto space-y-6">

            {/* Navigation & Header */}
            <div>
                <Link href={`/dashboard/subjects/${subject}`} className="text-sm text-gray-500 hover:text-orange-600 mb-2 flex items-center">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to {subject}
                </Link>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900">{topicName}</h1>
                        <p className="text-gray-600">
                            {isAllTopics
                                ? "Comprehensive review of all topics in this subject."
                                : "Master the building blocks of life."}
                        </p>
                    </div>
                    {/* Generator & Test Component */}
                    {activeTab === 'flashcards' && (
                        <div className="flex gap-3 items-center">
                            {flashcards.length > 0 && (
                                <div className="flex flex-col items-end mr-2">
                                    {bestScore && (
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 shadow-sm mb-2">
                                            <Trophy className="h-3.5 w-3.5" /> Best: {bestScore.score}/{bestScore.totalQuestions}
                                        </div>
                                    )}
                                    <Button
                                        onClick={() => setIsTestOpen(true)}
                                        className="bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all px-6 font-bold"
                                    >
                                        Test Yourself
                                    </Button>
                                </div>
                            )}
                            {!isAllTopics && (
                                <FlashcardGenerator
                                    subject={subject}
                                    topicId={topicId}
                                    topicName={topicName}
                                    onSaved={() => router.refresh()}
                                />
                            )}
                        </div>
                    )}
                    {!isAllTopics && activeTab === 'pastpapers' && (
                        <PastPaperGenerator
                            subject={subject}
                            topicId={topicId}
                            topicName={topicName}
                            onSaved={() => router.refresh()}
                        />
                    )}
                </div>
            </div>

            <Tabs defaultValue="flashcards" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
                    <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
                    <TabsTrigger value="pastpapers">Past Papers</TabsTrigger>
                    <TabsTrigger value="voice">Voice Tutor</TabsTrigger>
                    <TabsTrigger value="text">Text Tutor</TabsTrigger>
                </TabsList>

                {/* Flashcards Tab */}
                <TabsContent value="flashcards" className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {flashcards.map((card, idx) => (
                            <div key={card.id || idx} className="group perspective-1000 h-64 cursor-pointer">
                                <div className="relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
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
                                            <span className="text-xs text-gray-400 mt-4">Hover to reveal</span>
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
                        <CardHeader>
                            <CardTitle>Recent Past Paper Questions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {questions.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <p className="mb-4">No past paper questions yet.</p>
                                    {!isAllTopics && (
                                        <PastPaperGenerator
                                            subject={subject}
                                            topicId={topicId}
                                            topicName={topicName}
                                            onSaved={() => router.refresh()}
                                        />
                                    )}
                                </div>
                            ) : (
                                questions.map((q) => (
                                    <div key={q.id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex gap-2">
                                                <span className="text-xs font-bold text-white bg-blue-500 px-2 py-0.5 rounded shadow-sm">{q.year}</span>
                                                {isAllTopics && q.topic && <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded border border-orange-200">{q.topic}</span>}
                                            </div>
                                        </div>
                                        <p className="font-semibold text-gray-900 mb-3 text-lg leading-snug">{q.question}</p>
                                        <div className="bg-green-50 p-4 rounded-md text-sm text-green-900 border border-green-200 shadow-sm">
                                            <div className="flex gap-2 items-start">
                                                <div className="min-w-[4px] h-full bg-green-400 rounded-full mr-2 self-stretch"></div>
                                                <div className="w-full">
                                                    <strong className="block text-green-700 mb-1">Answer:</strong>
                                                    <div className="whitespace-pre-line leading-relaxed text-gray-800">
                                                        {q.answer}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

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
                                    onConversationEnd={(blob) => console.log('Session ended', blob)}
                                    isEnding={false}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Text Tutor Tab */}
                <TabsContent value="text" className="mt-6">
                    <TextTutorChat
                        contextPrompt={contextPrompt}
                        topicName={topicName}
                        subject={subject}
                    />
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
