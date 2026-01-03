// import Stripe from 'stripe';
// import { handleSubscriptionChange, stripe } from '@/lib/payments/stripe';
// import { NextRequest, NextResponse } from 'next/server';

// const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// export async function POST(request: NextRequest) {
//   const payload = await request.text();
//   const signature = request.headers.get('stripe-signature') as string;

//   let event: Stripe.Event;

//   try {
//     event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
//   } catch (err) {
//     console.error('Webhook signature verification failed.', err);
//     return NextResponse.json(
//       { error: 'Webhook signature verification failed.' },
//       { status: 400 }
//     );
//   }

//   switch (event.type) {
//     case 'customer.subscription.updated':
//     case 'customer.subscription.deleted':
//       const subscription = event.data.object as Stripe.Subscription;
//       await handleSubscriptionChange(subscription);
//       break;
//     default:
//       console.log(`Unhandled event type ${event.type}`);
//   }

//   return NextResponse.json({ received: true });
// }





import Stripe from 'stripe';
import { stripe } from '@/lib/payments/stripe';
import { headers } from 'next/headers';
import { handleSubscriptionChange } from '@/lib/payments/stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature') as string;
  
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === 'checkout.session.completed') {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );
    await handleSubscriptionChange(subscription);
  }

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    await handleSubscriptionChange(subscription);
  }

  return new Response(null, { status: 200 });
}
