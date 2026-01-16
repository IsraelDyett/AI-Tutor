import {
    getFlashcards,
    getTopic,
    getPastPaperQuestions,
    getBestFlashcardScore,
    getSubjectContextText,
    getAllSubjectResources
} from '@/app/(dashboard)/actions';
import TopicView from '@/components/topic-view';
import { notFound } from 'next/navigation';

export default async function TopicPage({ params }: { params: Promise<{ level: string; subject: string; topicId: string }> }) {
    const { level, subject, topicId } = await params;
    const decodedSubject = decodeURIComponent(subject);
    const upperLevel = level.toUpperCase() as 'SEA' | 'CSEC' | 'CAPE';

    let topicName = "";
    let flashcards: any[] = [];
    let questions: any[] = [];
    let initialBestScore = null;
    let isAllTopics = false;

    if (topicId === 'all') {
        const resources = await getAllSubjectResources(decodedSubject, upperLevel);
        flashcards = resources.flashcards;
        questions = resources.questions;
        topicName = `All ${decodedSubject} Topics`;
        isAllTopics = true;
    } else {
        const id = parseInt(topicId);
        if (isNaN(id)) return notFound();

        const topic = await getTopic(id);
        if (!topic) return notFound();

        topicName = topic.name;
        flashcards = await getFlashcards(id);
        questions = await getPastPaperQuestions(id);
        initialBestScore = await getBestFlashcardScore(id);
    }

    const backgroundContext = await getSubjectContextText(decodedSubject, level);

    const voicePrompt = `You are an expert AI Tutor for the ${upperLevel} ${decodedSubject} exam. 
    Your goal is to help the student master the topic: ${topicName}.
    Use the provided flashcards and past paper questions as your knowledge base.
    Be encouraging, clear, and focused on helping them pass their ${upperLevel} exams.`;

    return (
        <main className="p-4 lg:p-8 min-h-screen bg-gray-50">
            <TopicView
                level={level}
                subject={decodedSubject}
                topicId={topicId}
                topicName={topicName}
                isAllTopics={isAllTopics}
                flashcards={flashcards}
                questions={questions}
                voicePrompt={voicePrompt}
                backgroundContext={backgroundContext}
                initialBestScore={initialBestScore}
            />
        </main>
    );
}
