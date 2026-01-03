import { db } from './drizzle';
import { teamUsage, teams, plans, teamMembers } from './schema';
import { eq, sql, and } from 'drizzle-orm';
import { getUser } from './queries';

export type FeatureType = 'flashcards' | 'pastPapers' | 'voiceTutor' | 'textTutor';

const FEATURE_TO_USAGE_COL = {
    flashcards: 'flashcardsGenerated',
    pastPapers: 'pastPapersGenerated',
    voiceTutor: 'voiceTutorSessionsCount',
    textTutor: 'textTutorSessionsCount',
} as const;

const FEATURE_TO_LIMIT_COL = {
    flashcards: 'flashcards_limit',
    pastPapers: 'past_papers_limit',
    voiceTutor: 'voice_tutor_sessions_limit',
    textTutor: 'text_tutor_sessions_limit',
} as const;

const FEATURE_TO_FLAG_COL = {
    flashcards: 'isFlashcardLimitReached',
    pastPapers: 'isPastPaperLimitReached',
    voiceTutor: 'isVoiceTutorLimitReached',
    textTutor: 'isTextTutorLimitReached',
} as const;

export async function getTeamUsageAndLimit(teamId: number) {
    const result = await db
        .select({
            usage: teamUsage,
            plan: plans,
        })
        .from(teams)
        .leftJoin(teamUsage, eq(teams.id, teamUsage.teamId))
        .leftJoin(plans, eq(teams.planName, plans.name))
        .where(eq(teams.id, teamId))
        .limit(1);

    if (result.length === 0) return null;

    // If usage doesn't exist, create it
    if (!result[0].usage) {
        const [newUsage] = await db.insert(teamUsage).values({ teamId }).returning();
        result[0].usage = newUsage;
    }

    return result[0];
}

export async function isFeatureAllowed(teamId: number, feature: FeatureType) {
    const data = await getTeamUsageAndLimit(teamId);
    if (!data || !data.plan || !data.usage) return { allowed: false, error: 'Team or Plan not found' };

    const currentUsage = data.usage[FEATURE_TO_USAGE_COL[feature]] as number;
    const limit = data.plan[FEATURE_TO_LIMIT_COL[feature]] as number;

    return {
        allowed: currentUsage < limit,
        currentUsage,
        limit,
        error: currentUsage >= limit ? `Limit for ${feature} reached for your current plan.` : null
    };
}

export async function incrementFeatureUsage(teamId: number, feature: FeatureType) {
    const data = await getTeamUsageAndLimit(teamId);
    if (!data || !data.plan) return { success: false, error: 'Plan not found' };

    const limit = data.plan[FEATURE_TO_LIMIT_COL[feature]] as number;
    const usageCol = FEATURE_TO_USAGE_COL[feature];
    const flagCol = FEATURE_TO_FLAG_COL[feature];

    await db.update(teamUsage)
        .set({
            [usageCol]: sql`${teamUsage[usageCol]} + 1`,
            [flagCol]: sql`CASE WHEN ${teamUsage[usageCol]} + 1 >= ${limit} THEN true ELSE false END`,
            updatedAt: new Date(),
        })
        .where(eq(teamUsage.teamId, teamId));

    return { success: true };
}

export async function getTeamIdForUser(userId: number) {
    const result = await db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId))
        .limit(1);

    return result[0]?.teamId || null;
}
