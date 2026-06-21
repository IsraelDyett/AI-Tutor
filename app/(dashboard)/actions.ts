//app\(dashboard)\actions.ts
'use server';

import { db } from '@/lib/db/drizzle';
import { topics, flashcards, passedPaperQuestions, flashcardTests, subjects, topicResources } from '@/lib/db/schema';
import { eq, and, or, isNull, desc, sql, ilike  } from 'drizzle-orm';
import { getUserWithTeam } from '@/lib/db/queries';
import { getUser } from '@/lib/db/queries';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSubjectContext } from '@/lib/ai/context-manager';
import mammoth from 'mammoth';
import { embedText } from '@/lib/ai/embedding';
import { chunkText } from '@/lib/ai/chunking';
import { actualPastPaperQuestions,  pastPaperAttempts, studySessions } from '@/lib/db/schema';
import { 
    preloadVoiceContext as _preloadVoiceContext, 
    searchVoiceKnowledge as _searchVoiceKnowledge 
} from '@/lib/ai/voice-rag';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function preloadVoiceContext(...args: Parameters<typeof _preloadVoiceContext>) {
    return await _preloadVoiceContext(...args);
}

export async function searchVoiceKnowledge(...args: Parameters<typeof _searchVoiceKnowledge>) {
    return await _searchVoiceKnowledge(...args);
}


export async function savePastPaperAttemptAction(data: {
    topicId: number;
    paperType: 'actual' | 'generated';
    reference: string;
    correctQuestions: number;
    totalQuestions: number;
}) {
    const user = await getUser();
    if (!user) return { error: 'Unauthorized' };

    const scorePercentage = Math.round((data.correctQuestions / data.totalQuestions) * 100);

    try {
        await db.insert(pastPaperAttempts).values({
            userId: user.id,
            topicId: data.topicId === -1 ? null : data.topicId,
            paperType: data.paperType,
            reference: data.reference,
            correctQuestions: data.correctQuestions,
            totalQuestions: data.totalQuestions,
            scorePercentage: scorePercentage
        });
        revalidatePath('/dashboard/team/performance');
        return { success: true };
    } catch (e) {
        console.error(e);
        return { error: 'Failed to save attempt' };
    }
}

// Update study session with insights (Call this at the end of text/voice tutor sessions)
export async function updateStudySessionInsightsAction(sessionId: number, data: { understandingScore: number, feedbackSummary: string }) {
    try {
        await db.update(studySessions)
            .set({ 
                understandingScore: data.understandingScore,
                feedbackSummary: data.feedbackSummary
            })
            .where(eq(studySessions.id, sessionId));
        return { success: true };
    } catch (e) {
        return { error: 'Failed to update insights' };
    }
}

export async function getActualPastPapers(subject: string, level: string, topicName?: string) {
    return await db.select()
        .from(actualPastPaperQuestions)
        .where(
            and(
                eq(actualPastPaperQuestions.subject, subject),
                eq(actualPastPaperQuestions.level, level),
                // Flexible filtering: matches topicTag or name partially
                topicName && topicName !== "" ? or(
                    eq(actualPastPaperQuestions.topicTag, topicName),
                    ilike(actualPastPaperQuestions.topicTag, `%${topicName}%`),
                    sql`${topicName}::text ILIKE '%' || ${actualPastPaperQuestions.topicTag}::text || '%'`
                ) : undefined
            )
        )
        .orderBy(actualPastPaperQuestions.year, actualPastPaperQuestions.questionNumber);
}

// export async function searchOfficialPastPapers(subject: string, level: string, query: string) {
//     // Search by year if the user mentions a number, otherwise search topic tags/descriptions
//     const isYearQuery = /\d{4}/.test(query);
//     const yearMatch = query.match(/\d{4}/);
//     const year = yearMatch ? parseInt(yearMatch[0]) : null;

//     return await db.select()
//         .from(actualPastPaperQuestions)
//         .where(
//             and(
//                 eq(actualPastPaperQuestions.subject, subject),
//                 eq(actualPastPaperQuestions.level, level),
//                 or(
//                     year ? eq(actualPastPaperQuestions.year, year) : undefined,
//                     ilike(actualPastPaperQuestions.topicTag, `%${query}%`),
//                     ilike(actualPastPaperQuestions.topicDescription, `%${query}%`)
//                 )
//             )
//         )
//         .limit(10); // Bring in the top 5 most relevant official questions
// }

export async function searchOfficialPastPapers(subject: string, level: string, query: string) {
    try {
        const queryEmbedding = await embedText(query, true); 
        
        const queryVector = `[${queryEmbedding.join(',')}]`;

        const yearMatch = query.match(/\d{4}/);
        const year = yearMatch ? parseInt(yearMatch[0]) : null;

        const results = await db.select({
            id: actualPastPaperQuestions.id,
            year: actualPastPaperQuestions.year,
            section: actualPastPaperQuestions.section,
            questionNumber: actualPastPaperQuestions.questionNumber,
            marks: actualPastPaperQuestions.marks,
            markingType: actualPastPaperQuestions.markingType,
            topicTag: actualPastPaperQuestions.topicTag,
            topicDescription: actualPastPaperQuestions.topicDescription,
            questionHtml: actualPastPaperQuestions.questionHtml,
            answerHtml: actualPastPaperQuestions.answerHtml,
            workingHtml: actualPastPaperQuestions.workingHtml,
            similarity: sql<number>`1 - (${actualPastPaperQuestions.questionEmbedding} <=> ${queryVector}::vector)`
        })
        .from(actualPastPaperQuestions)
        .where(
            and(
                eq(actualPastPaperQuestions.subject, subject),
                eq(actualPastPaperQuestions.level, level),
                year ? eq(actualPastPaperQuestions.year, year) : undefined
            )
        )
        // 2. SEMANTIC ORDERING
        // We order by distance. Closer distance = higher up in the list.
        .orderBy(sql`${actualPastPaperQuestions.questionEmbedding} <=> ${queryVector}::vector`)
        .limit(15); // Increased slightly to give the AI tutor more context options

        return results;

    } catch (error) {
        console.error("Vector Search Error:", error);
        // Basic fallback
        return await db.select().from(actualPastPaperQuestions)
            .where(and(
                eq(actualPastPaperQuestions.subject, subject), 
                eq(actualPastPaperQuestions.level, level)
            ))
            .limit(5);
    }
}

// app/(dashboard)/actions.ts

export async function getIngestorMetadata() {
    try {
        const allSubjects = await db.select().from(subjects);
        
        // Get unique subject names
        const uniqueSubjects = Array.from(new Set(allSubjects.map(s => s.name))).sort();
        
        // Get unique levels (SEA, CSEC, CAPE, etc)
        const uniqueLevels = Array.from(new Set(allSubjects.map(s => s.educationLevel))).sort();

        return {
            subjects: uniqueSubjects,
            levels: uniqueLevels
        };
    } catch (error) {
        console.error("Failed to fetch ingestor metadata:", error);
        return { subjects: [], levels: [] };
    }
}

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
    explanation: z.string().optional(),
    worksheetName: z.string().optional(),
});

export async function savePastPaperQuestion(data: { topicId: number; year: string; question: string; answer: string; explanation?: string; worksheetName?: string; }) {
    const user = await getUser();
    if (!user) return { error: 'Unauthorized' };

    const validation = pastPaperSchema.safeParse(data);
    if (!validation.success) return { error: 'Invalid data' };

    try {
        await db.insert(passedPaperQuestions).values({
            topicId: data.topicId,
            year: data.year,
            question: data.question,
            answerMarkdown: data.answer,
            explanationMarkdown: data.explanation 
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


export async function evaluateAnswerWithAIAction(data: {
    question: string;
    userAnswer: string;
    modelAnswer: string;
  }) {
    const user = await getUser();
    if (!user) return { error: 'Unauthorized' };
  
    const apiKey = process.env.NEXT_PUBLIC_API_KEY || process.env.GOOGLE_API_KEY || "";
    if (!apiKey) {
      return { error: 'Missing Gemini API Key Configuration' };
    }
  
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
  
    // Strip HTML tags for clean prompt injection
    const cleanQuestion = data.question.replace(/<[^>]*>?/gm, '').trim();
    const cleanModelAnswer = data.modelAnswer.replace(/<[^>]*>?/gm, '').trim();
  
    const prompt = `
    You are an expert curriculum examiner. Grade the student's answer based strictly on the question and the model answer provided.
    The student's answer does not need to be a word-for-word match with the model answer, but must be conceptually correct.
    
    If the student's answer captures the essential core concept/facts of the model answer, mark it as isCorrect: true.
    If it is partially correct or misses the core points completely, mark it as isCorrect: false.
  
    Provide a JSON object containing:
    1. "isCorrect": boolean
    2. "score": number (an integer from 0 to 100, representing the degree of semantic/conceptual matching)
    3. "feedback": string (one short sentence, maximum 12 words, in encouraging standard english, directly validating their logic or gently pointing out the core missing keyword/concept)
  
    Question: "${cleanQuestion}"
    Model Answer: "${cleanModelAnswer}"
    Student's Answer: "${data.userAnswer.trim()}"
    `;
  
    try {
      const result = await model.generateContent(prompt);
      let textResponse = result.response.text();
      
      // Safety check: Clean up potential markdown formatting codeblocks
      textResponse = textResponse.replace(/```json\s*|```/g, '').trim();
      
      const parsed = JSON.parse(textResponse);
  
      return {
        success: true,
        isCorrect: !!parsed.isCorrect,
        score: Math.min(Math.max(Number(parsed.score || 0), 0), 100),
        feedback: parsed.feedback || ""
      };
    } catch (error) {
      console.error("AI Evaluation error:", error);
      return { error: "Failed to semantically evaluate answer" };
    }
  }
// app/(dashboard)/actions.ts — ADD THESE TWO FUNCTIONS AT THE BOTTOM


/**
 * Saves a completed voice tutor session to the database.
 * Called from the client when the voice session ends.
 * 
 * Score derivation:
 *   - If lastSummary exists: quick Gemini call to extract score + feedback
 *   - Otherwise: derive score from topicsConfirmed / topicsIntroduced ratio
 */
export async function saveVoiceSessionAction(data: {
  topicId: number | null;           // null if -1 (all topics mode)
  durationSeconds: number;
  topicsIntroduced: string[];
  topicsConfirmed: string[];
  studentMisconceptions: string[];
  lastSummary: string;
}) {
  const user = await getUser();
  if (!user) return { error: 'Unauthorized' };

  let understandingScore: number | null = null;
  let feedbackSummary: string | null = null;

  try {
    if (data.lastSummary && data.lastSummary.trim().length > 20) {
      // We have a real summary — ask Gemini to extract a score from it
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || process.env.GOOGLE_API_KEY || '';
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const result = await model.generateContent(`
You are an educational assessment engine. Based on the following lesson summary, output ONLY a valid JSON object — no markdown, no explanation.

Lesson Summary: "${data.lastSummary}"
Topics Introduced: ${data.topicsIntroduced.join(', ') || 'None'}
Topics Student Confirmed Understanding: ${data.topicsConfirmed.join(', ') || 'None'}
Student Misconceptions Noted: ${data.studentMisconceptions.join(', ') || 'None'}

Return this exact structure:
{"score": <integer 0-100>, "feedback": "<2-3 sentence plain English feedback summary for the student>"}

Score rubric:
- 90-100: Student confirmed all topics, no misconceptions
- 70-89: Student confirmed most topics, minor misconceptions
- 50-69: Student confirmed some topics, notable misconceptions  
- 30-49: Few topics confirmed, significant misconceptions
- 0-29: Session too short or no confirmed understanding
      `);

      const text = result.response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(text);
      understandingScore = Math.min(100, Math.max(0, Number(parsed.score) || 0));
      feedbackSummary = String(parsed.feedback || '');
    } else {
      // Fallback: derive score from confirmed/introduced ratio
      const introduced = data.topicsIntroduced.length;
      const confirmed = data.topicsConfirmed.length;

      if (introduced === 0) {
        understandingScore = data.durationSeconds > 60 ? 40 : 20;
        feedbackSummary = 'Session completed but no specific topics were tracked. Consider using the voice tutor for a full lesson session.';
      } else {
        const ratio = confirmed / introduced;
        understandingScore = Math.round(ratio * 100);
        // Penalise for misconceptions
        const penalty = Math.min(20, data.studentMisconceptions.length * 5);
        understandingScore = Math.max(0, understandingScore - penalty);

        feedbackSummary = confirmed === introduced
          ? `Great session! You confirmed understanding of all ${confirmed} topic(s) covered.`
          : `You confirmed ${confirmed} of ${introduced} topic(s). Review ${data.topicsIntroduced.filter(t => !data.topicsConfirmed.includes(t)).slice(0, 2).join(', ')} in your next session.`;
      }
    }
  } catch (err) {
    console.error('[saveVoiceSession] Score derivation failed:', err);
    // Non-fatal — save with nulls rather than failing entirely
  }

  try {
    await db.insert(studySessions).values({
      userId: user.id,
      topicId: data.topicId ?? null,
      durationSeconds: data.durationSeconds,
      understandingScore,
      feedbackSummary,
      startedAt: new Date(Date.now() - (data.durationSeconds * 1000)),
      endedAt: new Date(),
    });

    revalidatePath('/dashboard/team/performance');
    return { success: true, score: understandingScore, feedback: feedbackSummary };
  } catch (err) {
    console.error('[saveVoiceSession] DB insert failed:', err);
    return { error: 'Failed to save session' };
  }
}

/**
 * Saves a completed text tutor session to the database.
 * Called from the client when the user ends the session (clicks Download PDF).
 * Sends the conversation to Gemini for analysis before saving.
 */
export async function saveTextSessionAction(data: {
  topicId: string;                    // string because it comes from URL params ('all' or a number)
  topicName: string;
  subject: string;
  messages: { role: string; content: string }[];
}) {
  const user = await getUser();
  if (!user) return { error: 'Unauthorized' };

  // Resolve topicId
  const numericTopicId = data.topicId === 'all' || isNaN(parseInt(data.topicId))
    ? null
    : parseInt(data.topicId);

  // Filter to meaningful messages (skip the initial greeting)
  const meaningfulMessages = data.messages.filter(m => m.content.trim().length > 10);
  const durationEstimateSeconds = Math.max(60, meaningfulMessages.length * 30);

  let understandingScore: number | null = null;
  let feedbackSummary: string | null = null;

  if (meaningfulMessages.length >= 3) {
    try {
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || process.env.GOOGLE_API_KEY || '';
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Build a compact transcript (cap at ~3000 chars to avoid token bloat)
      const transcript = meaningfulMessages
        .map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
        .join('\n')
        .slice(0, 3000);

      const result = await model.generateContent(`
You are an educational assessment engine. Analyse this tutoring conversation and output ONLY a valid JSON object — no markdown, no explanation.

Subject: ${data.subject}
Topic: ${data.topicName}

Conversation Transcript:
${transcript}

Return this exact structure:
{"score": <integer 0-100>, "feedback": "<2-3 sentence plain English feedback for the student>"}

Score rubric:
- 90-100: Student demonstrated clear understanding, asked good questions, engaged well
- 70-89: Student engaged well, mostly understood content with minor gaps
- 50-69: Moderate engagement, some understanding but notable gaps
- 30-49: Limited engagement or significant misunderstandings
- 0-29: Very short session or student showed little understanding
      `);

      const text = result.response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(text);
      understandingScore = Math.min(100, Math.max(0, Number(parsed.score) || 0));
      feedbackSummary = String(parsed.feedback || '');
    } catch (err) {
      console.error('[saveTextSession] Gemini analysis failed:', err);
      // Non-fatal fallback
      understandingScore = Math.min(100, meaningfulMessages.length * 5);
      feedbackSummary = 'Session recorded. Keep up the great work studying!';
    }
  }

  try {
    await db.insert(studySessions).values({
      userId: user.id,
      topicId: numericTopicId,
      durationSeconds: durationEstimateSeconds,
      understandingScore,
      feedbackSummary,
      startedAt: new Date(Date.now() - (durationEstimateSeconds * 1000)),
      endedAt: new Date(),
    });

    revalidatePath('/dashboard/team/performance');
    return { success: true, score: understandingScore, feedback: feedbackSummary };
  } catch (err) {
    console.error('[saveTextSession] DB insert failed:', err);
    return { error: 'Failed to save session' };
  }
}