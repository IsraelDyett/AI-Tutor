'use server';

import { db } from '@/lib/db/drizzle';
import { topics, flashcards, passedPaperQuestions } from '@/lib/db/schema';
import { eq, and, or, isNull } from 'drizzle-orm';
import { getUserWithTeam } from '@/lib/db/queries';
import { getUser } from '@/lib/db/queries';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSubjectContext } from '@/lib/ai/context-manager';
import mammoth from 'mammoth';

// --- Actions for Topics ---

export async function getSubjectContextText(subject: string) {
    try {
        const files = await getSubjectContext(subject);
        let extractedText = "";

        for (const file of files) {
            if (file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                const buffer = Buffer.from(file.data, "base64");
                const result = await mammoth.extractRawText({ buffer });
                extractedText += `\n\n--- Content from ${file.name} ---\n${result.value}`;
            } else if (file.mimeType === "text/plain") {
                const text = Buffer.from(file.data, "base64").toString('utf-8');
                extractedText += `\n\n--- Content from ${file.name} ---\n${text}`;
            } else if (file.mimeType === "application/pdf") {
                try {
                    const buffer = Buffer.from(file.data, "base64");
                    // Using pdfjs-dist 5.x path for legacy builds (ESM)
                    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
                    const data = new Uint8Array(buffer);
                    const loadingTask = pdfjs.getDocument({
                        data,
                        useSystemFonts: true,
                        disableFontFace: true,
                    });
                    const pdf = await loadingTask.promise;
                    let pdfText = "";
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        pdfText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
                    }
                    if (pdfText.trim()) {
                        extractedText += `\n\n--- Content from PDF: ${file.name} ---\n${pdfText}`;
                    } else {
                        extractedText += `\n\n[File Found: ${file.name} (PDF - Extraction empty)]`;
                    }
                } catch (pdfErr) {
                    console.error(`Error parsing PDF ${file.name}:`, pdfErr);
                    extractedText += `\n\n[File Found: ${file.name} (PDF - Extraction Error)]`;
                }
            }
        }
        return extractedText;
    } catch (err) {
        console.error("Error getting context text:", err);
        return "";
    }
}

export async function createTopic(subject: string, name: string) {
    const user = await getUser();
    if (!user) return { error: 'Unauthorized' };

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) return { error: 'No team found' };

    try {
        const [newTopic] = await db.insert(topics).values({
            teamId: userWithTeam.teamId,
            name: name,
            subject: subject as any, // Cast to any to match enum
            description: 'Created via Dashboard',
        }).returning();

        revalidatePath('/dashboard/subjects/[subject]');
        return { success: true, topic: newTopic };
    } catch (error) {
        console.error('Create Topic Error:', error);
        return { error: 'Failed to create topic' };
    }
}

// Re-export getTopics properly
export async function getTopics(subject: string) {
    const user = await getUser();
    if (!user) return [];

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) return [];

    try {
        const teamTopics = await db
            .select()
            .from(topics)
            .where(
                and(
                    or(
                        eq(topics.teamId, userWithTeam.teamId),
                        isNull(topics.teamId)
                    ),
                    eq(topics.subject, subject as any)
                )
            );
        return teamTopics;
    } catch (error) {
        console.error("Failed to fetch topics:", error);
        return [];
    }
}

export async function getTopic(id: number) {
    try {
        const result = await db.select().from(topics).where(eq(topics.id, id));
        return result[0];
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

        revalidatePath(`/dashboard/subjects`); // Revalidate liberally for now
        return { success: true };
    } catch (error) {
        console.error('Save Flashcard Error:', error);
        return { error: 'Failed to save flashcard' };
    }
}

export async function getFlashcards(topicId: number) {
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

        revalidatePath(`/dashboard/subjects`);
        return { success: true };
    } catch (error) {
        console.error('Save Past Paper Error:', error);
        return { error: 'Failed to save question' };
    }
}

export async function getPastPaperQuestions(topicId: number) {
    try {
        const questions = await db.select().from(passedPaperQuestions).where(eq(passedPaperQuestions.topicId, topicId));
        return questions;
    } catch (error) {
        console.error("Failed to fetch past paper questions:", error);
        return [];
    }
}

export async function getAllSubjectResources(subject: string) {
    const user = await getUser();
    if (!user) return { flashcards: [], questions: [] };

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) return { flashcards: [], questions: [] };

    try {
        // 1. Get all topics for this subject and team
        const teamTopics = await db
            .select()
            .from(topics)
            .where(
                and(
                    or(
                        eq(topics.teamId, userWithTeam.teamId),
                        isNull(topics.teamId)
                    ),
                    eq(topics.subject, subject as any)
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
