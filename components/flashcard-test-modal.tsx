'use client';

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, XCircle, RefreshCw, Trophy, ArrowRight, Brain } from 'lucide-react';
import { saveFlashcardTestResult } from '@/app/(dashboard)/actions';

interface Flashcard {
    id?: number;
    front: string;
    back: string;
}

interface FlashcardTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    topicId: number;
    topicName: string;
    flashcards: Flashcard[];
    onComplete: (score: number) => void;
}

export default function FlashcardTestModal({
    isOpen,
    onClose,
    topicId,
    topicName,
    flashcards,
    onComplete
}: FlashcardTestModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([]);

    // Initialize shuffled cards
    useEffect(() => {
        if (isOpen) {
            setShuffledCards([...flashcards].sort(() => Math.random() - 0.5));
            setCurrentIndex(0);
            setIsFlipped(false);
            setScore(0);
            setIsFinished(false);
        }
    }, [isOpen, flashcards]);

    const handleNext = (correct: boolean) => {
        if (correct) setScore(prev => prev + 1);

        if (currentIndex < shuffledCards.length - 1) {
            setIsFlipped(false);
            // Small delay to allow flip animation to finish if needed, 
            // but for simplicity we'll just switch
            setCurrentIndex(prev => prev + 1);
        } else {
            const finalScore = correct ? score + 1 : score;
            finishTest(finalScore);
        }
    };

    const finishTest = async (finalScore: number) => {
        setIsFinished(true);
        try {
            await saveFlashcardTestResult({
                topicId,
                score: finalScore,
                totalQuestions: shuffledCards.length
            });
            onComplete(finalScore);
        } catch (err) {
            console.error("Error saving score:", err);
        }
    };

    const currentCard = shuffledCards[currentIndex];
    const progress = shuffledCards.length > 0 ? ((currentIndex) / shuffledCards.length) * 100 : 0;

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl bg-gray-50">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="bg-white p-6 border-b">
                        <DialogHeader>
                            <div className="flex justify-between items-center mb-1">
                                <DialogTitle className="text-xl font-bold text-gray-900">
                                    {isFinished ? 'Test Complete!' : topicName}
                                </DialogTitle>
                                {!isFinished && (
                                    <span className="text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                                        {currentIndex + 1} / {shuffledCards.length}
                                    </span>
                                )}
                            </div>
                            {!isFinished && (
                                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
                                    <div
                                        className="bg-orange-500 h-full transition-all duration-300 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            )}
                        </DialogHeader>
                    </div>

                    {/* Content */}
                    <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
                        {!isFinished ? (
                            <div className="w-full relative perspective-1000 h-64">
                                <div
                                    className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] cursor-pointer ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
                                    onClick={() => setIsFlipped(!isFlipped)}
                                >
                                    {/* Front */}
                                    <Card className="absolute inset-0 w-full h-full flex flex-col justify-center items-center text-center p-8 [backface-visibility:hidden] shadow-lg border-2 border-orange-100 hover:border-orange-200 transition-colors">
                                        <p className="text-2xl font-semibold text-gray-800 leading-tight">
                                            {currentCard?.front}
                                        </p>
                                        <span className="text-xs text-gray-400 mt-6 flex items-center gap-1">
                                            <RefreshCw className="h-3 w-3" /> Click to flip
                                        </span>
                                    </Card>

                                    {/* Back */}
                                    <Card className="absolute inset-0 w-full h-full flex flex-col justify-center items-center text-center p-8 [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-lg bg-orange-50 border-2 border-orange-200">
                                        <p className="text-2xl font-bold text-orange-700 leading-tight">
                                            {currentCard?.back}
                                        </p>
                                        <div className="mt-8 flex gap-4 w-full px-4">
                                            <Button
                                                variant="outline"
                                                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleNext(false);
                                                }}
                                            >
                                                <XCircle className="w-4 h-4 mr-2" /> Review
                                            </Button>
                                            <Button
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleNext(true);
                                                }}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" /> Got it
                                            </Button>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center animate-in fade-in zoom-in duration-300">
                                <div className="mb-6 flex justify-center">
                                    <div className="bg-orange-100 p-6 rounded-full">
                                        <Trophy className="h-16 w-16 text-orange-600" />
                                    </div>
                                </div>
                                <h3 className="text-3xl font-extrabold text-gray-900 mb-2">Great Job!</h3>
                                <p className="text-gray-600 mb-8">
                                    You mastered <span className="font-bold text-orange-600">{score}</span> out of <span className="font-bold text-gray-900">{shuffledCards.length}</span> cards.
                                </p>
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-8">
                                    <div className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Success Rate</div>
                                    <div className="text-5xl font-black text-gray-900">
                                        {Math.round((score / shuffledCards.length) * 100)}%
                                    </div>
                                </div>
                                <Button
                                    className="w-full h-12 text-lg font-bold bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                                    onClick={onClose}
                                >
                                    Finish Review
                                </Button>
                            </div>
                        )}
                    </div>

                    {!isFinished && (
                        <div className="bg-white p-4 border-t text-center">
                            <p className="text-xs text-gray-400">
                                Tip: Be honest with yourself! Mark as "Review" if you weren't fully sure.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
