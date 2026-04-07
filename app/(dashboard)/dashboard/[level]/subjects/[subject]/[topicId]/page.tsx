//app\(dashboard)\dashboard\[level]\subjects\[subject]\[topicId]\page.tsx
import {
    getFlashcards,
    getTopic,
    getPastPaperQuestions,
    getBestFlashcardScore,
    getSubjectContextText,
    getAllSubjectResources,
    getActualPastPapers,
} from '@/app/(dashboard)/actions';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
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
    let topic: any = null;
    let canEdit = false;
    let actualQuestions: Awaited<ReturnType<typeof getActualPastPapers>> = [];

    const user = await getUser();
    const userWithTeam = user ? await getUserWithTeam(user.id) : null;
    const userTeamId = userWithTeam?.teamId || null;

    if (topicId === 'all') {
        const resources = await getAllSubjectResources(decodedSubject, upperLevel);
        flashcards = resources.flashcards;
        questions = resources.questions;
        topicName = `All ${decodedSubject} Topics`;
        isAllTopics = true;
        //actualQuestions = [];
        actualQuestions = await getActualPastPapers(decodedSubject, upperLevel); 

    } else {
        const id = parseInt(topicId);
        if (isNaN(id)) return notFound();

        topic = await getTopic(id);
        if (!topic) return notFound();

        topicName = topic.name;
        flashcards = await getFlashcards(id);
        questions = await getPastPaperQuestions(id);
        initialBestScore = await getBestFlashcardScore(id);

        // Ownership check
        if (topic && userTeamId !== null && topic.teamId === userTeamId) {
            canEdit = true;
        }

        actualQuestions = await getActualPastPapers(decodedSubject, upperLevel, topicName);
    }

    const backgroundContext = await getSubjectContextText(decodedSubject, level);

    const systemInstructions = (topic as any)?.systemInstructions || `You are an expert, encouraging, and highly effective private tutor for the ${upperLevel} ${decodedSubject} curriculum. 
    You are currently conducting a one - on - one voice lesson with a student.`;

    const lessonPlanContext = (topic as any)?.lessonPlan ? `\n\nLESSON PLAN: \n${(topic as any).lessonPlan} \n` : "";

    const voicePrompt = `SYSTEM ROLE:
    ${systemInstructions}
    ${lessonPlanContext}
    
    CURRENT OBJECTIVE:
    Teach the student the topic: "${topicName}" from beginning to end. Only Speak in Standard English regardless of if the student speaks another language. Except if the subject is spanish or french in which case you can use spanish or french appropriately
    
    YOUR TEACHING STRATEGY(Scaffolded Learning):
1. ** Assessment **: Start by greeting the student and briefly asking what they already know about "${topicName}" to gauge their starting point.
    2. ** Foundations **: Begin teaching the core concepts simply.Use analogies relevant to a student in the Caribbean.
    3. ** Deepening **: Gradually introduce more complex details.
    4. ** Verification **: After explaining a concept, act like a teacher: ask the student if they understand or request them to explain it back to you.Do not move on until they grasp the current concept.
    5. ** Application **: Once a concept is understood, present a scenario or problem based on the provided Past Paper Questions to test their application.
    
    USING THE CONTEXT DATA:
    - ** Lesson Plan **: Use this as your guide to teach the topic. Ensure you cover all the objectives in the lesson plan.
    - ** RAG **: Use these as your source of information. Ensure you cover the definitions and facts found in the documents during your explanations. Do not simply read them out.
    - ** Flashcards **: You can use the flahshcards as examples and cover the definitions and facts found in the flashcards during your explanations. Do not simply read them out this is just for your reference.
    - ** Past Paper Questions **: Use these as "Practice Examples". Only introduce these AFTER you have taught the relevant concept. Do not simply read them out this is just for your reference.
    - ** Background Context **: Use this to ensure your tone and depth are appropriate for the ${upperLevel} level.

    IMPORTANT RULES FOR VOICE INTERACTION:
- You are speaking, not writing. Keep your responses conversational and concise(1 - 3 sentences at a time). 
    - Do NOT lecture for long periods. Teach a small piece, then engage the student.
    - If the student is wrong, gently correct them and explain * why *.
    - If the student is right, praise them and bridge to the next concept.
    - Ensure the student is fully prepared for their ${upperLevel} exam on this specific topic by the end of the session.
    - Only Speak in Standard English regardless of if the student speaks another language.excelpt if the topic is spanish or french in which case you can use spanish or french appropriately`;

    return (
        // <main className="h-full overflow-y-auto p-4 lg:p-8 bg-gray-50">
        <main className="h-full overflow-y-auto p-4 lg:p-8 bg-gray-50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
    
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
                lessonPlan={(topic as any)?.lessonPlan || ""}
                initialBestScore={initialBestScore}
                canEdit={canEdit}
                actualQuestions={actualQuestions} // Add this
            />
        </main>
    );
}
