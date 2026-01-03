'use server';

import { getUser } from "@/lib/db/queries";
import { getTeamIdForUser, isFeatureAllowed, incrementFeatureUsage, FeatureType } from "@/lib/db/usage";

export async function checkFeatureAllowedAction(feature: FeatureType) {
    const user = await getUser();
    if (!user) return { allowed: false, error: 'Unauthorized' };

    const teamId = await getTeamIdForUser(user.id);
    if (!teamId) return { allowed: false, error: 'No team found' };

    return await isFeatureAllowed(teamId, feature);
}

export async function trackFeatureUsageAction(feature: FeatureType) {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const teamId = await getTeamIdForUser(user.id);
    if (!teamId) return { success: false, error: 'No team found' };

    const check = await isFeatureAllowed(teamId, feature);
    if (!check.allowed) return { success: false, error: check.error };

    return await incrementFeatureUsage(teamId, feature);
}
