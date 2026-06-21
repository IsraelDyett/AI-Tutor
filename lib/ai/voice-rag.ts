// lib/ai/voice-rag.ts
'use server';

import { db } from '@/lib/db/drizzle';
import { topicResources, actualPastPaperQuestions } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { embedText } from '@/lib/ai/embedding';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VoiceRAGResult {
  source: 'knowledge_base' | 'official_paper';
  topic: string;
  content: string;
  year?: number;
  similarity: number;
}

export interface PreloadedContext {
  contextBlock: string;    // ready to inject into system prompt
  resultCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Hard limit on characters per result before injection into context window.
// At ~4 chars per token, 1200 chars ≈ 300 tokens per result.
// With up to 6 results total, worst case is ~1800 tokens for RAG context.
const MAX_CHARS_PER_RESULT = 1200;

// Similarity threshold — results below this score are noise, not signal.
// cosine similarity of 0.70 means vectors point in roughly the same direction.
const MIN_SIMILARITY_SCORE = 0.70;

// How many results to fetch from each source for pre-loading
const PRELOAD_LIMIT = 3;

// How many results to fetch from each source for live tool calls
const TOOL_CALL_LIMIT = 3;

// ─── HTML stripper ────────────────────────────────────────────────────────────
// Removes HTML tags from official past paper HTML fields.
// Preserves meaningful whitespace and newlines between block elements.
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/th>/gi, ' | ')
    .replace(/<\/td>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Result formatter ─────────────────────────────────────────────────────────
// Converts a raw result into a compact string the model can use.
// Structured labels (SOURCE / TOPIC / CONTENT) help the model understand
// what type of information it is reading.
function formatResult(result: VoiceRAGResult): string {
  const content = result.content.length > MAX_CHARS_PER_RESULT
    ? result.content.slice(0, MAX_CHARS_PER_RESULT) + '…'
    : result.content;

  if (result.source === 'official_paper') {
    return `[OFFICIAL EXAM QUESTION${result.year ? ` — ${result.year}` : ''}]\nTOPIC: ${result.topic}\nCONTENT: ${content}`;
  }
  return `[KNOWLEDGE BASE]\nTOPIC: ${result.topic}\nCONTENT: ${content}`;
}

// ─── Core dual search ─────────────────────────────────────────────────────────
// Runs both searches in parallel via Promise.all — same latency as one search.
// Returns results merged and ranked by similarity score (highest first).
async function dualSearch(
  query: string,
  topicIds: number[],
  subject: string,
  level: string,
  limit: number
): Promise<VoiceRAGResult[]> {
  // Generate query embedding once — reused for both searches
  const queryEmbedding = await embedText(query, true); // true = RETRIEVAL_QUERY task type
  const queryVector = `[${queryEmbedding.join(',')}]`;

  // Run both searches in parallel
  const [topicResults, officialResults] = await Promise.all([

    // Search 1: topicResources (flashcards, documents, manual past papers)
    topicIds.length > 0
      ? db.execute(sql`
          SELECT
            content,
            1 - (embedding <=> ${queryVector}::vector) AS similarity
          FROM topic_resources
          WHERE topic_id IN (${sql.join(topicIds.map(id => sql`${id}`), sql`, `)})
            AND 1 - (embedding <=> ${queryVector}::vector) >= ${MIN_SIMILARITY_SCORE}
          ORDER BY embedding <=> ${queryVector}::vector ASC
          LIMIT ${limit}
        `).catch(() => [])
      : Promise.resolve([]),

    // Search 2: actualPastPaperQuestions (official CXC exam questions)
    db.execute(sql`
      SELECT
        topic_tag,
        topic_description,
        question_html,
        answer_html,
        year,
        1 - (question_embedding <=> ${queryVector}::vector) AS similarity
      FROM actual_past_paper_questions
      WHERE subject = ${subject}
        AND level = ${level}
        AND question_embedding IS NOT NULL
        AND 1 - (question_embedding <=> ${queryVector}::vector) >= ${MIN_SIMILARITY_SCORE}
      ORDER BY question_embedding <=> ${queryVector}::vector ASC
      LIMIT ${limit}
    `).catch(() => []),

  ]);

  // Map topicResources results
  const knowledgeResults: VoiceRAGResult[] = (topicResults as any[]).map(r => ({
    source: 'knowledge_base' as const,
    topic: extractTopicFromContent(r.content),
    content: String(r.content),
    similarity: Number(r.similarity),
  }));

  // Map officialPaperQuestions results — strip HTML before injecting
  const paperResults: VoiceRAGResult[] = (officialResults as any[]).map(r => {
    const questionText = stripHtml(String(r.question_html || ''));
    const answerText   = stripHtml(String(r.answer_html || ''));
    const combined = `Question: ${questionText}\nAnswer: ${answerText}`;
    return {
      source: 'official_paper' as const,
      topic: String(r.topic_tag || r.topic_description || 'General'),
      content: combined,
      year: r.year ? Number(r.year) : undefined,
      similarity: Number(r.similarity),
    };
  });

  // Merge and sort by similarity score (best first)
  return [...knowledgeResults, ...paperResults]
    .sort((a, b) => b.similarity - a.similarity);
}

// Helper: extract a short topic label from the content string format
// "Flashcard: Front: ... | Back: ..." → "Flashcard"
// "Document: notes.pdf | Content: ..." → "notes.pdf"
// "Past Paper Question [Year: 2023]: ..." → "Past Paper"
function extractTopicFromContent(content: string): string {
  if (content.startsWith('Flashcard:')) return 'Flashcard';
  if (content.startsWith('Document:')) {
    const match = content.match(/^Document: ([^|]+)/);
    return match ? match[1].trim() : 'Document';
  }
  if (content.startsWith('Past Paper')) return 'Past Paper Question';
  return 'Knowledge Base';
}

// ─── Pre-loader (called at session init, not during conversation) ─────────────
// Fetches the most relevant context for the topic BEFORE the session opens.
// Injected into the system prompt — zero latency during conversation.
// Uses a broad topic-name query to seed the initial context.
export async function preloadVoiceContext(
  topicName: string,
  topicIds: number[],
  subject: string,
  level: string,
): Promise<PreloadedContext> {
  try {
    const results = await dualSearch(topicName, topicIds, subject, level, PRELOAD_LIMIT);

    if (results.length === 0) {
      return { contextBlock: '', resultCount: 0 };
    }

    const lines = results.map(formatResult);
    const contextBlock = [
      '--- PRE-LOADED CONTEXT (use this to start the lesson) ---',
      ...lines,
      '--- END PRE-LOADED CONTEXT ---',
    ].join('\n\n');

    return { contextBlock, resultCount: results.length };
  } catch (err) {
    console.error('[preloadVoiceContext] Error:', err);
    return { contextBlock: '', resultCount: 0 };
  }
}

// ─── Live search (called from the voice component tool handler) ───────────────
// Runs during conversation when the model calls search_knowledge().
// Returns a compact string ready to send back as the tool response.
export async function searchVoiceKnowledge(
  query: string,
  topicIds: number[],
  subject: string,
  level: string,
): Promise<string> {
  try {
    const results = await dualSearch(query, topicIds, subject, level, TOOL_CALL_LIMIT);

    if (results.length === 0) {
      return 'No relevant information found for that query.';
    }

    return results.map(formatResult).join('\n\n---\n\n');
  } catch (err) {
    console.error('[searchVoiceKnowledge] Error:', err);
    return 'Search failed — please continue using your own knowledge.';
  }
}