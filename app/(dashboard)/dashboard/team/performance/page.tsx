// app/(dashboard)/dashboard/team/performance/page.tsx
import { redirect } from 'next/navigation';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { getTeamPerformanceAction } from '../actions';
import PerformancePageClient from '@/app/(dashboard)/dashboard/team/performance/performance-page-client';

export default async function PerformancePage() {
  const user = await getUser();
  if (!user) redirect('/sign-in');

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) redirect('/dashboard');

  const { performances, isAdmin } = await getTeamPerformanceAction();

  return (
    <PerformancePageClient
      performances={performances}
      isAdmin={isAdmin}
      currentUserId={user.id}
    />
  );
}