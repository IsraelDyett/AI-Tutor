// app/api/plans/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { plans } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    // Fetch all plans from the database, ordering by price is usually a good idea
    const allPlans = await db.select().from(plans).orderBy(desc(plans.monthlyPrice));

    // Return the fetched plans as a JSON response
    return NextResponse.json(allPlans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    // Return a generic error response if something goes wrong
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}