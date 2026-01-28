// File: app/api/user/details/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';
import { getUserWithTeam, hasUserSignedIn } from '@/lib/db/queries';

export async function GET() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie?.value) return NextResponse.json(null);
  const sessionData = await verifyToken(sessionCookie.value);
  if (!sessionData?.user?.id) return NextResponse.json(null);

  const [userDetails, hasSignedIn] = await Promise.all([
    getUserWithTeam(sessionData.user.id),
    hasUserSignedIn(sessionData.user.id)
  ]);

  return NextResponse.json({ ...userDetails, hasSignedIn });
}