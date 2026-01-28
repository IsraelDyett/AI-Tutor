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
            team: teams,
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
    if (!data) return { allowed: false, error: 'Team not found' };

    // ONE-TIME FREE TRIAL LOGIC FOR VOICE TUTOR
    if (feature === 'voiceTutor') {
        const team = data.team;
        // If they have a plan (and it's active/trialing), we follow normal limits.
        // We assume 'active' or 'trialing' means they have a valid plan.
        const subscriptionStatus = team?.subscriptionStatus;
        const hasActivePlan = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

        if (!hasActivePlan) {
            // If NO plan, check if they used their one-time trial
            if (team.hasUsedOneTimeVoiceTrial) {
                return { allowed: false, error: 'Usage Limit Reached: One-time free trial used. Please upgrade.' };
            } else {
                // Allow it this one time
                return { allowed: true, currentUsage: 0, limit: 1, error: null };
            }
        }
    }

    if (!data.plan || !data.usage) return { allowed: false, error: 'Plan or Usage data not found' };

    // Normal Plan Logic
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
    if (!data) return { success: false, error: 'Team data not found' };

    // ONE-TIME FREE TRIAL INCREMENT FOR VOICE TUTOR
    if (feature === 'voiceTutor') {
        const team = data.team;
        const subscriptionStatus = team?.subscriptionStatus;
        const hasActivePlan = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

        if (!hasActivePlan) {
            // If they are using it without a plan, it MUST be the free trial.
            // We set the flag to true.
            await db.update(teams)
                .set({ hasUsedOneTimeVoiceTrial: true })
                .where(eq(teams.id, teamId));

            // We also want to increment the usage counter just for record keeping? 
            // Or maybe not, since limits are high (0 usually). 
            // Actually, the previous logic was that they couldn't even use it.
            // Let's also increment the usage counter in teamUsage so they see 1 usage.
            return { success: true };
        }
    }

    if (!data.plan) return { success: false, error: 'Plan not found' };

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
