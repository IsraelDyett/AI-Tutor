// app/(dashboard)/dashboard/team/page.tsx
import { redirect } from 'next/navigation';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import TeamPageClient from '@/app/(dashboard)/dashboard/team/team-page-client';
import {
  getTeamMembersAction,
  getPendingInvitationsAction,
  getTeamOverviewAction,
} from './actions';

export default async function TeamPage() {
  const user = await getUser();
  if (!user) redirect('/sign-in');

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) redirect('/dashboard');

  const [{ members, currentUserId, isAdmin }, { invites }, overview] = await Promise.all([
    getTeamMembersAction(),
    getPendingInvitationsAction(),
    getTeamOverviewAction(),
  ]);

  return (
    <TeamPageClient
      members={members}
      pendingInvites={invites ?? []}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      overview={overview}
    />
  );
}