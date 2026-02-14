'use server';

import { db } from '@/lib/db/drizzle';
import { topics, flashcards, passedPaperQuestions, flashcardTests, subjects, topicResources } from '@/lib/db/schema';
import { eq, and, or, isNull, desc, sql } from 'drizzle-orm';
import { getUserWithTeam } from '@/lib/db/queries';
import { getUser } from '@/lib/db/queries';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSubjectContext } from '@/lib/ai/context-manager';
import mammoth from 'mammoth';
import { embedText } from '@/lib/ai/embedding';
import { chunkText } from '@/lib/ai/chunking';

// --- Score Tracking Actions ---

export async function saveFlashcardTestResult(data: { topicId: number; score: number; totalQuestions: number }) {
    const user = await getUser();
    if (!user) return { error: 'Unauthorized' };

    try {
        await db.insert(flashcardTests).values({
            userId: user.id,
            topicId: data.topicId,
            score: data.score,
            totalQuestions: data.totalQuestions,
        });

        revalidatePath(`/dashboard`, 'layout');
        return { success: true };
    } catch (error) {
        console.error('Save Flashcard Test Result Error:', error);
        return { error: 'Failed to save test result' };
    }
}

export async function getBestFlashcardScore(topicId: number) {
    const user = await getUser();
    if (!user) return null;

    try {
        const results = await db
            .select()
            .from(flashcardTests)
            .where(
                and(
                    eq(flashcardTests.userId, user.id),
                    eq(flashcardTests.topicId, topicId)
                )
            )
            .orderBy(desc(flashcardTests.score))
            .limit(1);

        return results[0] || null;
    } catch (error) {
        console.error("Failed to fetch best score:", error);
        return null;
    }
}

// --- Actions for Topics ---

export async function getSubjectContextText(subject: string, level: string = 'csec') {
    try {
        console.log(`[getSubjectContextText] Fetching context for ${subject} (${level})...`);
        const files = await getSubjectContext(subject, level);
        let extractedText = "";

        for (const file of files) {
            // Limit total text to around 50k characters to prevent timeouts/OOM
            if (extractedText.length > 50000) {
                console.warn(`[getSubjectContextText] Context limit reached for ${subject}, truncating...`);
                break;
            }

            if (file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                const buffer = Buffer.from(file.data, "base64");
                const result = await mammoth.extractRawText({ buffer });
                extractedText += `\n\n--- Content from ${file.name} ---\n${result.value}`;
            } else if (file.mimeType === "text/plain") {
                const text = Buffer.from(file.data, "base64").toString('utf-8');
                extractedText += `\n\n--- Content from ${file.name} ---\n${text}`;
            } else if (file.mimeType === "application/pdf") {
                try {
                    console.log(`[getSubjectContextText] Extracting PDF: ${file.name}`);
                    const buffer = Buffer.from(file.data, "base64");
                    const { extractTextFromPDF } = await import('@/lib/ai/pdf-util');
                    const pdfText = await extractTextFromPDF(buffer);
                    if (pdfText && pdfText.trim()) {
                        extractedText += `\n\n--- Content from PDF: ${file.name} ---\n${pdfText}`;
                    }
                } catch (pdfErr) {
                    console.error(`Error parsing PDF ${file.name}:`, pdfErr);
                    extractedText += `\n\n[File Found: ${file.name} (PDF - Extraction Error)]`;
                }
            }
        }

        const finalResult = extractedText.length > 60000 ? extractedText.substring(0, 60000) + "..." : extractedText;
        console.log(`[getSubjectContextText] Completed for ${subject}. Total length: ${finalResult.length}`);
        return finalResult;
    } catch (err) {
        console.error("Error getting context text:", err);
        return "";
    }
}

const DEFAULT_SYSTEM_INSTRUCTIONS = `You are an expert, encouraging, and highly effective private tutor. Your goal is to help the student master the topic through clear explanations, analogies, and practice questions. Refer to the provided lesson plan and context materials to guide your teaching.`;

export async function createTopic(subject: string, name: string, educationLevel: 'SEA' | 'CSEC' | 'CAPE' = 'CSEC', lessonPlan?: string) {
    const user = await getUser();
    if (!user) return { error: 'Unauthorized' };

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) return { error: 'No team found' };

    try {
        const [newTopic] = await db.insert(topics).values({
            teamId: userWithTeam.teamId,
            name: name,
            subject: subject,
            educationLevel: educationLevel,
            description: 'Created via Dashboard',
            lessonPlan: lessonPlan || '',
            systemInstructions: DEFAULT_SYSTEM_INSTRUCTIONS,
        }).returning();

        revalidatePath('/dashboard/subjects/[subject]');
        return { success: true, topic: newTopic };
    } catch (error) {
        console.error('Create Topic Error:', error);
        return { error: 'Failed to create topic' };
    }
}

// Re-export getTopics properly
export async function getTopics(subject: string, educationLevel?: 'SEA' | 'CSEC' | 'CAPE' | string) {
    const user = await getUser();
    let teamId: number | null = null;

    if (user) {
        const userWithTeam = await getUserWithTeam(user.id);
        teamId = userWithTeam?.teamId || null;
    }

    try {
        const allTopics = await db.select().from(topics);

        const filtered = allTopics.filter(t => {
            const subjectMatch = t.subject?.toLowerCase() === subject?.toLowerCase();
            const levelMatch = !educationLevel ||
                !t.educationLevel ||
                t.educationLevel.toLowerCase() === (educationLevel as string).toLowerCase();

            // Privacy Logic:
            // 1. If it's a system topic (teamId is null), everyone can see it.
            // 2. If it's a user topic, only members of that team can see it.
            const isSystemTopic = t.teamId === null;
            const isUserTopicMatch = teamId !== null && t.teamId === teamId;

            return subjectMatch && levelMatch && (isSystemTopic || isUserTopicMatch);
        });

        console.log(`[getTopics] Subject: ${subject}, Level: ${educationLevel}. User: ${user?.id || 'Public'}. Processed ${allTopics.length} topics, found ${filtered.length} matches.`);
        return filtered;
    } catch (error) {
        console.error("[getTopics] Error:", error);
        return [];
    }
}

export async function getSubjectsForLevel(level: 'SEA' | 'CSEC' | 'CAPE' | string) {
    try {
        const results = await db
            .select()
            .from(subjects)
            .where(eq(subjects.educationLevel, level))
            .orderBy(subjects.name);
        return results;
    } catch (error) {
        console.error("Failed to fetch subjects:", error);
        return [];
    }
}

export async function getTopic(id: number) {
    const user = await getUser();
    let teamId: number | null = null;

    if (user) {
        const userWithTeam = await getUserWithTeam(user.id);
        teamId = userWithTeam?.teamId || null;
    }

    try {
        const [topic] = await db.select().from(topics).where(eq(topics.id, id));

        if (!topic) return null;

        // Privacy Logic:
        const isSystemTopic = topic.teamId === null;
        const isUserTopicMatch = teamId !== null && topic.teamId === teamId;

        if (isSystemTopic || isUserTopicMatch) {
            return topic;
        }

        return null; // Unauthorized access
    } catch (error) {
        console.error("Failed to fetch topic:", error);
        return null;
    }
}


// --- Actions for Flashcards ---

const flashcardSchema = z.object({
    topicId: z.number(),
    front: z.string().min(1),
    back: z.string().min(1),
});

export async function saveFlashcard(data: { topicId: number; front: string; back: string }) {
    const user = await getUser();
    if (!user) return { error: 'Unauthorized' };

    const validation = flashcardSchema.safeParse(data);
    if (!validation.success) return { error: 'Invalid data' };

    try {
        await db.insert(flashcards).values({
            topicId: data.topicId,
            front: data.front,
            back: data.back,
        });

        // RAG Ingestion
        const content = `Flashcard: Front: ${data.front} | Back: ${data.back}`;
        try {
            const embedding = await embedText(content);
            await db.insert(topicResources).values({
                topicId: data.topicId,
                content: content,
                embedding: embedding,
                type: 'flashcard'
            });
        } catch (ragError) {
            console.error('RAG Ingestion Error (Flashcard):', ragError);
        }

        revalidatePath(`/dashboard/subjects`); // Revalidate liberally for now
        return { success: true };
    } catch (error) {
        console.error('Save Flashcard Error:', error);
        return { error: 'Failed to save flashcard' };
    }
}

export async function getFlashcards(topicId: number) {
    const topic = await getTopic(topicId);
    if (!topic) return []; // getTopic already handles verification

    try {
        const cards = await db.select().from(flashcards).where(eq(flashcards.topicId, topicId));
        return cards;
    } catch (error) {
        return [];
    }
}

// --- Actions for Past Papers ---

const pastPaperSchema = z.object({
    topicId: z.number(),
    year: z.string().min(1),
    question: z.string().min(1),
    answer: z.string().min(1),
});

export async function savePastPaperQuestion(data: { topicId: number; year: string; question: string; answer: string }) {
    const user = await getUser();
    if (!user) return { error: 'Unauthorized' };

    const validation = pastPaperSchema.safeParse(data);
    if (!validation.success) return { error: 'Invalid data' };

    try {
        await db.insert(passedPaperQuestions).values({
            topicId: data.topicId,
            year: data.year,
            question: data.question,
            answerMarkdown: data.answer, // Mapping 'answer' to 'answerMarkdown' based on schema
        });

        // RAG Ingestion
        const content = `Past Paper Question [Year: ${data.year}]: Question: ${data.question} | Answer: ${data.answer}`;
        try {
            const embedding = await embedText(content);
            await db.insert(topicResources).values({
                topicId: data.topicId,
                content: content,
                embedding: embedding,
                type: 'past_paper'
            });
        } catch (ragError) {
            console.error('RAG Ingestion Error (Past Paper):', ragError);
        }

        revalidatePath(`/dashboard`, 'layout');
        return { success: true };
    } catch (error) {
        console.error('Save Past Paper Error:', error);
        return { error: 'Failed to save question' };
    }
}

export async function getPastPaperQuestions(topicId: number) {
    const topic = await getTopic(topicId);
    if (!topic) return []; // getTopic already handles verification

    try {
        const questions = await db.select().from(passedPaperQuestions).where(eq(passedPaperQuestions.topicId, topicId));
        return questions;
    } catch (error) {
        console.error("Failed to fetch past paper questions:", error);
        return [];
    }
}

export async function getAllSubjectResources(subject: string, educationLevel?: 'SEA' | 'CSEC' | 'CAPE') {
    const user = await getUser();
    let teamId: number | null = null;

    if (user) {
        const userWithTeam = await getUserWithTeam(user.id);
        teamId = userWithTeam?.teamId || null;
    }

    try {
        // 1. Get all topics for this subject that the user has access to
        const teamTopics = await db
            .select()
            .from(topics)
            .where(
                and(
                    or(
                        teamId ? eq(topics.teamId, teamId) : sql`false`, // User's team (if logged in)
                        isNull(topics.teamId)                          // System content (always accessible)
                    ),
                    eq(topics.subject, subject as any),
                    educationLevel ? eq(topics.educationLevel, educationLevel) : undefined
                )
            );

        if (teamTopics.length === 0) {
            return { flashcards: [], questions: [] };
        }

        const topicIds = teamTopics.map(t => t.id);

        // 2. Fetch all flashcards for these topics
        // db.inArray requires at least one element, which we checked above
        // We need to import inArray from drizzle-orm

        // Let's assume we can fetch all and filter or do separate queries.
        // Doing separate queries is fine.

        // Wait, I need to add 'inArray' to imports or use a workaround if not available 
        // usually it is available in drizzle-orm. I will check imports.

        // fetching flashcards
        const allFlashcards = [];
        for (const topic of teamTopics) {
            const cards = await db.select().from(flashcards).where(eq(flashcards.topicId, topic.id));
            // Add topic name to card for display purposes if needed, 
            // although the current UI might expect just flashcard fields + topic name maybe?
            // The mock data had 'topic' field string. The DB flashcard doesn't.
            // So I should attach the topic name.
            const cardsWithTopic = cards.map(c => ({ ...c, topic: topic.name }));
            allFlashcards.push(...cardsWithTopic);
        }

        // fetching questions
        const allQuestions = [];
        for (const topic of teamTopics) {
            const questions = await db.select().from(passedPaperQuestions).where(eq(passedPaperQuestions.topicId, topic.id));
            const questionsWithTopic = questions.map(q => ({ ...q, topic: topic.name }));
            allQuestions.push(...questionsWithTopic);
        }

        return {
            flashcards: allFlashcards,
            questions: allQuestions
        };

    } catch (error) {
        console.error("Failed to fetch all subject resources:", error);
        return { flashcards: [], questions: [] };
    }
}

// --- RAG Specific Actions ---

export async function searchResources(query: string, topicId: number | number[]) {
    const user = await getUser();
    if (!user) return { error: 'Unauthorized' };

    try {
        const queryEmbedding = await embedText(query);
        const queryVector = `[${queryEmbedding.join(',')}]`;

        // Cosine similarity search using pgvector
        // <=> is cosine distance, so smaller is better. ORDER BY it.
        const results = await db.execute(sql`
            SELECT content, (embedding <=> ${queryVector}::vector) as distance
            FROM topic_resources
            WHERE topic_id ${Array.isArray(topicId)
                ? sql`IN (${sql.join(topicId.map(id => sql`${id}`), sql`, `)})`
                : sql`= ${topicId}`}
            ORDER BY distance ASC
            LIMIT 5
        `);

        return results.map((r: any) => r.content);
    } catch (error) {
        console.error('Search Resources Error:', error);
        return [];
    }
}

export async function uploadTopicDocument(topicId: number, name: string, mimeType: string, base64Data: string) {
    const user = await getUser();
    if (!user) return { error: 'Unauthorized' };

    try {
        let extractedText = "";
        const buffer = Buffer.from(base64Data, 'base64');

        if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const result = await mammoth.extractRawText({ buffer });
            extractedText = result.value;
        } else if (mimeType === "text/plain") {
            extractedText = buffer.toString('utf-8');
        } else if (mimeType === "application/pdf") {
            const { extractTextFromPDF } = await import('@/lib/ai/pdf-util');
            extractedText = await extractTextFromPDF(buffer);
        }

        if (!extractedText) return { error: 'Could not extract text from file' };

        const chunks = chunkText(extractedText);

        for (const chunk of chunks) {
            const embedding = await embedText(chunk);
            await db.insert(topicResources).values({
                topicId: topicId,
                content: `Document: ${name} | Content: ${chunk}`,
                embedding: embedding,
                type: 'document'
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Upload Topic Document Error:', error);
    }
}

export async function updateTopicContext(topicId: number, data: { systemInstructions?: string; lessonPlan?: string }) {
    const user = await getUser();
    if (!user) return { error: 'Unauthorized' };

    try {
        await db.update(topics)
            .set({
                systemInstructions: data.systemInstructions,
                lessonPlan: data.lessonPlan,
                updatedAt: new Date()
            })
            .where(eq(topics.id, topicId));

        revalidatePath(`/dashboard/subjects`); // Revalidate liberally for now
        return { success: true };
    } catch (error) {
        console.error('Update Topic Context Error:', error);
        return { error: 'Failed to update topic context' };
    }
}
