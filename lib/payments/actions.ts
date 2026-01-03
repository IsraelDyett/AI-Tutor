// @/lib/payments/actions.ts

'use server';

import { redirect } from 'next/navigation';
import { 
  createCheckoutSession, 
  createCustomerPortalSession,
  stripe // Make sure you export your initialized stripe instance
} from './stripe';
import { withTeam } from '@/lib/auth/middleware';
import { db } from '@/lib/db'; // Import your database instance
import { teams } from '@/lib/db/schema'; // Import your teams table schema
import { eq } from 'drizzle-orm'; // Or your ORM's equivalent `where` clause

export const checkoutAction = withTeam(async (formData, team) => {
  const priceId = formData.get('priceId') as string;
  await createCheckoutSession({ team: team, priceId });
});

export const customerPortalAction = withTeam(async (_, team) => {
  // 1. First, handle the simple case where there's no ID at all.
  if (!team.stripeCustomerId) {
    console.log('No Stripe Customer ID found for team. Redirecting to pricing.');
    return redirect('/pricing');
  }

  try {
    // 2. Try to create the portal session with the existing ID.
    const portalSession = await createCustomerPortalSession(team);
    redirect(portalSession.url);
  } catch (error) {
    // 3. If it fails, check if it's the specific "resource_missing" error.
    if (error instanceof stripe.errors.StripeInvalidRequestError && error.code === 'resource_missing') {
      console.error(`Invalid Stripe Customer ID: ${team.stripeCustomerId}. It likely exists only in test mode.`);
      
      // SELF-HEALING STEP: The ID is bad, so remove it from your database.
      // This prevents the user from getting stuck in this error loop.
      await db.update(teams).set({ stripeCustomerId: null }).where(eq(teams.id, team.id));
      console.log(`Removed invalid customer ID for team ${team.id}.`);

      // Redirect the user to the pricing page so they can create a new, valid subscription.
      // Optionally, add a query param to show a message.
      return redirect('/pricing?error=invalid_session');
    }

    // 4. For any other unexpected errors, re-throw them so you don't hide bugs.
    console.error("An unexpected error occurred while creating the customer portal session:", error);
    throw error;
  }
});



// 'use server';

// import { redirect } from 'next/navigation';
// import { createCheckoutSession, createCustomerPortalSession, stripe } from './stripe';
// import { withTeam } from '@/lib/auth/middleware';
// import { db } from '@/lib/db'; // Import your database instance
// import { teams } from '@/lib/db/schema'; // Import your teams table schema
// import { eq } from 'drizzle-orm';

// export const checkoutAction = withTeam(async (formData, team) => {
//   const priceId = formData.get('priceId') as string;
//   await createCheckoutSession({ team: team, priceId });
// });

// export const customerPortalAction = withTeam(async (_, team) => {
//   const portalSession = await createCustomerPortalSession(team);
//   redirect(portalSession.url);
// });


// 'use server';

// import { createCheckoutSession } from '@/lib/payments/stripe';
// import { getTeam } from '@/lib/db/queries'; // You'll need a way to get the current team

// export async function checkout(priceId: string) {
//   const team = await getTeam(); // Implement this to get the current user's team
//   await createCheckoutSession({ team, priceId });
// }