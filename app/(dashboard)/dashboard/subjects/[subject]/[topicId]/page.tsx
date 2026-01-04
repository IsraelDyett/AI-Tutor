import { getFlashcards, getTopic, getPastPaperQuestions, getAllSubjectResources, getSubjectContextText, getBestFlashcardScore } from '@/app/(dashboard)/actions';
import TopicView from '@/components/topic-view';

// Mock Data
const ALL_FLASHCARDS = [
    { id: 101, topic: 'Cell Structure', front: 'What is the "powerhouse" of the cell?', back: 'Mitochondria' },
    { id: 102, topic: 'Cell Structure', front: 'What establishes the cell membrane structure?', back: 'Phospholipid Bilayer' },
    { id: 103, topic: 'Photosynthesis', front: 'What is the primary pigment in photosynthesis?', back: 'Chlorophyll' },
    { id: 104, topic: 'Genetics', front: 'What molecule carries genetic information?', back: 'DNA' },
];

const ALL_QUESTIONS = [
    { id: 1, topic: 'Cell Structure', year: '2023', question: 'Explain the function of the ribosome.', answer: 'Ribosomes are the site of protein synthesis.' },
    { id: 2, topic: 'Genetics', year: '2022', question: 'Define the term "allele".', answer: 'An allele is a variant form of a gene.' },
];

export default async function TopicPage({ params }: { params: Promise<{ subject: string; topicId: string }> }) {
    const { subject, topicId } = await params;

    const isAllTopics = topicId === 'all';

    // Fetch Content
    let dbFlashcards: any[] = [];
    let dbQuestions: any[] = [];
    let dbTopicName = "Topic";
    let bestScore: any = null;

    // Variables for 'all' mode
    let allFlashcards: any[] = [];
    let allQuestions: any[] = [];

    if (isAllTopics) {
        const resources = await getAllSubjectResources(subject);
        allFlashcards = resources.flashcards;
        allQuestions = resources.questions;
    } else {
        const id = parseInt(topicId);
        if (!isNaN(id)) {
            dbFlashcards = await getFlashcards(id);
            dbQuestions = await getPastPaperQuestions(id);
            bestScore = await getBestFlashcardScore(id);
            const topic = await getTopic(id);
            if (topic) {
                dbTopicName = topic.name;
            }
        }
    }

    // Determine Display Name
    const topicName = isAllTopics ? "All Topics" : dbTopicName;

    // Merge Mock Data with Real DB Data
    const displayFlashcards = isAllTopics
        ? allFlashcards
        : [...dbFlashcards, ...ALL_FLASHCARDS.filter(c => c.topic === 'Cell Structure')];

    const displayQuestions = isAllTopics
        ? allQuestions.map(q => ({
            id: q.id,
            topic: q.topic, // topic is already added in getAllSubjectResources
            year: q.year,
            question: q.question,
            answer: q.answerMarkdown
        }))
        : [...dbQuestions.map(q => ({
            id: q.id,
            topic: topicName,
            year: q.year,
            question: q.question,
            answer: q.answerMarkdown // Map database field to component prop
        })), ...ALL_QUESTIONS.filter(q => q.topic === 'Cell Structure')];

    const voicePrompt = isAllTopics
        ? `You are a helpful and knowledgeable tutor for the CXC subject: ${subject}. The student wants to review various topics. Be ready to answer questions about any part of the syllabus. Quiz them on random topics if asked. Do not be overly formal. Be encouraging.`
        : `You are a helpful and knowledgeable tutor for the CXC subject: ${subject}, specifically focusing on the topic of "${topicName}". Help the student understand concepts, answer their questions, and quiz them playfully. Do not be overly formal. Be encouraging.`;

    const backgroundContext = await getSubjectContextText(subject);

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <TopicView
                subject={subject}
                topicId={topicId}
                topicName={topicName}
                isAllTopics={isAllTopics}
                flashcards={displayFlashcards}
                questions={displayQuestions}
                voicePrompt={voicePrompt}
                backgroundContext={backgroundContext}
                initialBestScore={bestScore}
            />
        </main>
    );
}
