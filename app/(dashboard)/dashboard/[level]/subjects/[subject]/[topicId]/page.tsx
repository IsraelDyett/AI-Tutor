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

    const voicePrompt = `SYSTEM ROLE:
    You are an expert, encouraging, and highly effective private tutor for the ${upperLevel} ${decodedSubject} curriculum. 
    You are currently conducting a one-on-one voice lesson with a student.
    
    CURRENT OBJECTIVE:
    Teach the student the topic: "${topicName}" from beginning to end.
    
    YOUR TEACHING STRATEGY (Scaffolded Learning):
    1. **Assessment**: Start by greeting the student and briefly asking what they already know about "${topicName}" to gauge their starting point.
    2. **Foundations**: Begin teaching the core concepts simply. Use analogies relevant to a student in the Caribbean.
    3. **Deepening**: Gradually introduce more complex details.
    4. **Verification**: After explaining a concept, act like a teacher: ask the student if they understand or request them to explain it back to you. Do not move on until they grasp the current concept.
    5. **Application**: Once a concept is understood, present a scenario or problem based on the provided Past Paper Questions to test their application.
    
    USING THE CONTEXT DATA:
    - **Flashcards**: Use these as your "Syllabus Checklist". Ensure you cover the definitions and facts found in the flashcards during your explanations. Do not simply read them out.
    - **Past Paper Questions**: Use these as "Practice Examples". Only introduce these AFTER you have taught the relevant concept.
    - **Background Context**: Use this to ensure your tone and depth are appropriate for the ${upperLevel} level.

    IMPORTANT RULES FOR VOICE INTERACTION:
    - You are speaking, not writing. Keep your responses conversational and concise (1-3 sentences at a time). 
    - Do NOT lecture for long periods. Teach a small piece, then engage the student.
    - If the student is wrong, gently correct them and explain *why*.
    - If the student is right, praise them and bridge to the next concept.
    - Ensure the student is fully prepared for their ${upperLevel} exam on this specific topic by the end of the session.`;

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
