//app\(dashboard)\dashboard\team\actions.ts
'use server';

import { db } from '@/lib/db/drizzle';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import {
  users,
  teams,
  teamMembers,
  invitations,
  flashcardTests,
  studySessions,
  teamUsage,
  pastPaperAttempts, 
  studentPerformanceSummaries
} from '@/lib/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { GoogleGenerativeAI } from '@google/generative-ai';


// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamMemberWithUser {
  memberId: number;
  userId: number;
  role: string;
  joinedAt: Date;
  name: string | null;
  email: string;
  country: string | null;
}

export interface MemberPerformance {
  userId: number;
  name: string | null;
  email: string;
  totalTestsTaken: number;
  averageScore: number;
  bestScore: number;
  totalFlashcardsAnswered: number;
  studySessionsCount: number;
  totalStudyMinutes: number;
  lastActiveAt: Date | null;
  recentScores: { score: number; totalQuestions: number; createdAt: Date; topicName?: string }[];
  tutorSessions: { date: Date; type: string | null; duration: number | null; score: number | null; feedback: string | null; }[];
  paperAttempts: { date: Date; type: string; reference: string; score: number; correct: number; total: number; }[];
  latestAiSummary: string | null;
}

export interface TeamOverview {
  teamName: string;
  planName: string | null;
  memberCount: number;
  activeEducationLevels: string[]; 
  allowedEducationLevels: string[]; 
  usage: {
    voiceTutorSessionsCount: number;
    textTutorSessionsCount: number;
    flashcardsGenerated: number;
    pastPapersGenerated: number;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getTeamContext() {
  const user = await getUser();
  if (!user) return null;

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) return null;

  return { user, userWithTeam, teamId: userWithTeam.teamId, isAdmin: userWithTeam.role === 'owner' };
}

// ─── Team Members ─────────────────────────────────────────────────────────────

export async function getTeamMembersAction(): Promise<{
  members: TeamMemberWithUser[];
  currentUserId: number;
  isAdmin: boolean;
  error?: string;
}> {
  const ctx = await getTeamContext();
  if (!ctx) return { members: [], currentUserId: 0, isAdmin: false, error: 'Unauthorized' };

  const rows = await db
    .select({
      memberId: teamMembers.id,
      userId: users.id,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
      name: users.name,
      email: users.email,
      country: users.country,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, ctx.teamId))
    .orderBy(teamMembers.joinedAt);

  return {
    members: rows,
    currentUserId: ctx.user.id,
    isAdmin: ctx.isAdmin,
  };
}

// ─── Pending Invitations ──────────────────────────────────────────────────────

export async function getPendingInvitationsAction() {
  const ctx = await getTeamContext();
  if (!ctx || !ctx.isAdmin) return { invites: [], error: ctx ? 'Not authorized' : 'Unauthorized' };

  const invites = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      invitedAt: invitations.invitedAt,
      status: invitations.status,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.teamId, ctx.teamId),
        eq(invitations.status, 'pending')
      )
    )
    .orderBy(desc(invitations.invitedAt));

  return { invites };
}

// ─── Cancel Invitation ────────────────────────────────────────────────────────

export async function cancelInvitationAction(invitationId: number) {
  const ctx = await getTeamContext();
  if (!ctx || !ctx.isAdmin) return { error: 'Not authorized' };

  await db
    .update(invitations)
    .set({ status: 'cancelled' })
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.teamId, ctx.teamId)
      )
    );

  revalidatePath('/dashboard/team');
  return { success: true };
}

// ─── Remove Member ────────────────────────────────────────────────────────────

export async function removeMemberAction(memberId: number) {
  const ctx = await getTeamContext();
  if (!ctx || !ctx.isAdmin) return { error: 'Not authorized' };

  // Prevent removing yourself if you're the only owner
  const member = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, ctx.teamId)),
  });

  if (!member) return { error: 'Member not found' };
  if (member.userId === ctx.user.id) return { error: 'You cannot remove yourself' };

  await db
    .delete(teamMembers)
    .where(
      and(
        eq(teamMembers.id, memberId),
        eq(teamMembers.teamId, ctx.teamId)
      )
    );

  // Decrement usage count
  await db
    .update(teamUsage)
    .set({
      activeMembers: sql`GREATEST(0, ${teamUsage.activeMembers} - 1)`,
      updatedAt: new Date(),
    })
    .where(eq(teamUsage.teamId, ctx.teamId));

  revalidatePath('/dashboard/team');
  return { success: true };
}

// ─── Team Overview ────────────────────────────────────────────────────────────

export async function getTeamOverviewAction(): Promise<TeamOverview | null> {
  const ctx = await getTeamContext();
  if (!ctx) return null;

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, ctx.teamId),
  });

  if (!team) return null;

  const memberCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, ctx.teamId));

  const usage = await db.query.teamUsage.findFirst({
    where: eq(teamUsage.teamId, ctx.teamId),
  });

  return {
    teamName: team.name,
    planName: team.planName,
    memberCount: Number(memberCountResult[0]?.count ?? 0),
    activeEducationLevels: team.activeEducationLevels || ['SEA'],
    allowedEducationLevels: team.allowedEducationLevels || ['SEA', 'CSEC', 'CAPE'], 
    usage: usage
      ? {
          voiceTutorSessionsCount: usage.voiceTutorSessionsCount,
          textTutorSessionsCount: usage.textTutorSessionsCount,
          flashcardsGenerated: usage.flashcardsGenerated,
          pastPapersGenerated: usage.pastPapersGenerated,
        }
      : null,
  };
}

export async function updateTeamEducationLevelsAction(levels: string[]) {
    const ctx = await getTeamContext();
    if (!ctx || !ctx.isAdmin) return { error: 'Not authorized' };
    
    await db
      .update(teams)
      .set({ activeEducationLevels: levels })
      .where(eq(teams.id, ctx.teamId));
  
    // Revalidate the dashboard layouts to instantly update the sidebar menu for all members
    revalidatePath('/', 'layout');
    return { success: true };
  }

// ─── Performance: Single User ─────────────────────────────────────────────────

export async function getMyPerformanceAction(): Promise<MemberPerformance | null> {
  const ctx = await getTeamContext();
  if (!ctx) return null;

  return getUserPerformance(ctx.user.id, ctx.user.name ?? null, ctx.user.email);
}

// ─── Performance: All Team Members (admin only) ───────────────────────────────

export async function getTeamPerformanceAction(): Promise<{
  performances: MemberPerformance[];
  isAdmin: boolean;
  error?: string;
}> {
  const ctx = await getTeamContext();
  if (!ctx) return { performances: [], isAdmin: false, error: 'Unauthorized' };

  if (!ctx.isAdmin) {
    // Non-admin only sees their own
    const mine = await getUserPerformance(ctx.user.id, ctx.user.name ?? null, ctx.user.email);
    return { performances: mine ? [mine] : [], isAdmin: false };
  }

  // Fetch all team member user ids
  const members = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, ctx.teamId));

  if (members.length === 0) return { performances: [], isAdmin: true };

  const performances = await Promise.all(
    members.map((m) => getUserPerformance(m.userId, m.name, m.email))
  );

  return {
    performances: performances.filter(Boolean) as MemberPerformance[],
    isAdmin: true,
  };
}

// ─── Internal: Build performance for one user ─────────────────────────────────

// async function getUserPerformance(
//   userId: number,
//   name: string | null,
//   email: string
// ): Promise<MemberPerformance> {
//   // Flashcard tests
//   const tests = await db
//     .select({
//       id: flashcardTests.id,
//       score: flashcardTests.score,
//       totalQuestions: flashcardTests.totalQuestions,
//       createdAt: flashcardTests.createdAt,
//       topicId: flashcardTests.topicId,
//     })
//     .from(flashcardTests)
//     .where(eq(flashcardTests.userId, userId))
//     .orderBy(desc(flashcardTests.createdAt))
//     .limit(20);

//   const totalTestsTaken = tests.length;
//   const totalFlashcardsAnswered = tests.reduce((sum, t) => sum + t.totalQuestions, 0);
//   const scores = tests.map((t) => (t.totalQuestions > 0 ? (t.score / t.totalQuestions) * 100 : 0));
//   const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
//   const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

//   // Study sessions
//   const sessions = await db
//     .select({
//       id: studySessions.id,
//       durationSeconds: studySessions.durationSeconds,
//       startedAt: studySessions.startedAt,
//     })
//     .from(studySessions)
//     .where(eq(studySessions.userId, userId))
//     .orderBy(desc(studySessions.startedAt));

//   const studySessionsCount = sessions.length;
//   const totalStudyMinutes = Math.round(
//     sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / 60
//   );

//   const lastActiveAt =
//     tests[0]?.createdAt ?? sessions[0]?.startedAt ?? null;

//   const recentScores = tests.slice(0, 10).map((t) => ({
//     score: t.score,
//     totalQuestions: t.totalQuestions,
//     createdAt: t.createdAt,
//   }));

//   return {
//     userId,
//     name,
//     email,
//     totalTestsTaken,
//     averageScore: Math.round(averageScore),
//     bestScore: Math.round(bestScore),
//     totalFlashcardsAnswered,
//     studySessionsCount,
//     totalStudyMinutes,
//     lastActiveAt,
//     recentScores,
//   };
// }


async function getUserPerformance(userId: number, name: string | null, email: string): Promise<MemberPerformance> {
  const tests = await db.select().from(flashcardTests).where(eq(flashcardTests.userId, userId)).orderBy(desc(flashcardTests.createdAt)).limit(20);
  const sessions = await db.select().from(studySessions).where(eq(studySessions.userId, userId)).orderBy(desc(studySessions.startedAt)).limit(20);
  const attempts = await db.select().from(pastPaperAttempts).where(eq(pastPaperAttempts.userId, userId)).orderBy(desc(pastPaperAttempts.createdAt)).limit(20);
  const summaries = await db.select().from(studentPerformanceSummaries).where(eq(studentPerformanceSummaries.userId, userId)).orderBy(desc(studentPerformanceSummaries.createdAt)).limit(1);

  const totalTestsTaken = tests.length;
  // --- FIX 1: Restore missing calculations ---
  const totalFlashcardsAnswered = tests.reduce((sum, t) => sum + t.totalQuestions, 0);
  const studySessionsCount = sessions.length;
  // ------------------------------------------

  const scores = tests.map(t => t.totalQuestions > 0 ? (t.score / t.totalQuestions) * 100 : 0);
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const totalStudyMinutes = Math.round(sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / 60);

  return {
    userId, name, email, totalTestsTaken,
    averageScore: Math.round(averageScore),
    bestScore: Math.round(bestScore),
    totalFlashcardsAnswered, // <-- Added back
    studySessionsCount,      // <-- Added back
    totalStudyMinutes,
    lastActiveAt: tests[0]?.createdAt ?? sessions[0]?.startedAt ?? null,
    recentScores: tests.slice(0, 10).map(t => ({ score: t.score, totalQuestions: t.totalQuestions, createdAt: t.createdAt })),
    tutorSessions: sessions.map(s => ({
      date: s.startedAt, 
      type: null, // <-- FIX 2: Set to null (or a default string like 'Voice') since sessionType doesn't exist in schema
      duration: s.durationSeconds, 
      score: s.understandingScore, 
      feedback: s.feedbackSummary
    })),
    paperAttempts: attempts.map(a => ({
      date: a.createdAt, type: a.paperType, reference: a.reference, score: a.scorePercentage, correct: a.correctQuestions, total: a.totalQuestions
    })),
    latestAiSummary: summaries[0]?.summaryMarkdown || null
  };
}

export async function generateStudentPerformanceSummaryAction(targetUserId: number) {
  const ctx = await getTeamContext();
  if (!ctx) return { error: 'Unauthorized' };
  
  // Fetch raw data to feed to Gemini
  const perf = await getUserPerformance(targetUserId, "Student", "");
  
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_API_KEY || process.env.GOOGLE_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
  You are an expert educational analyst. Analyze the following student learning data and write a highly constructive, detailed performance summary (in Markdown).
  Focus on:
  1. Overall progress and engagement.
  2. Tutor session understanding scores (strengths/weaknesses).
  3. Past paper attempt success ratios.
  
  Student Data:
  - Flashcard Average Score: ${perf.averageScore}%
  - Tutor Sessions: ${JSON.stringify(perf.tutorSessions.slice(0, 5))}
  - Past Paper Attempts: ${JSON.stringify(perf.paperAttempts.slice(0, 5))}
  
  Provide the feedback clearly with headers, bullet points, and an encouraging tone.
  `;

  try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      await db.insert(studentPerformanceSummaries).values({
          userId: targetUserId,
          teamId: ctx.teamId,
          summaryMarkdown: text
      });

      revalidatePath('/dashboard/team/performance');
      return { success: true };
  } catch (e) {
      console.error(e);
      return { error: 'Failed to generate summary' };
  }
}


