// app/(dashboard)/lesson-progress-actions.ts
'use server';

import { db } from '@/lib/db/drizzle';
import { lessonProgress } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, and } from 'drizzle-orm';
import type { LessonProgress } from '@/components/live-simulation-component';

/**
 * Save or update lesson progress for a specific topic.
 * Called automatically as the lesson proceeds.
 */
export async function saveLessonProgress(
  topicId: number,
  progress: LessonProgress
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Check if a record already exists for this user + topic
    const existing = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, user.id),
          eq(lessonProgress.topicId, topicId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing record
      await db
        .update(lessonProgress)
        .set({
          progress,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(lessonProgress.userId, user.id),
            eq(lessonProgress.topicId, topicId)
          )
        );
    } else {
      // Insert new record
      await db.insert(lessonProgress).values({
        userId: user.id,
        topicId,
        progress,
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error('[saveLessonProgress] Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Load lesson progress for a specific topic.
 * Called when the topic page loads to restore previous session state.
 */
export async function getLessonProgress(
  topicId: number
): Promise<LessonProgress | null> {
  try {
    const user = await getUser();
    if (!user) return null;

    const result = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, user.id),
          eq(lessonProgress.topicId, topicId)
        )
      )
      .limit(1);

    if (result.length === 0) return null;
    return result[0].progress;
  } catch (err) {
    console.error('[getLessonProgress] Error:', err);
    return null;
  }
}

/**
 * Clear lesson progress for a topic (e.g. student wants to start fresh).
 */
export async function clearLessonProgress(
  topicId: number
): Promise<{ success: boolean }> {
  try {
    const user = await getUser();
    if (!user) return { success: false };

    await db
      .delete(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, user.id),
          eq(lessonProgress.topicId, topicId)
        )
      );

    return { success: true };
  } catch (err) {
    console.error('[clearLessonProgress] Error:', err);
    return { success: false };
  }
}