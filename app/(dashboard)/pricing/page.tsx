// import { checkoutAction } from '@/lib/payments/actions';
// import { Check } from 'lucide-react';
// import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
// import { SubmitButton } from './submit-button';

// // Prices are fresh for one hour max
// export const revalidate = 3600;

// export default async function PricingPage() {
//   const [prices, products] = await Promise.all([
//     getStripePrices(),
//     getStripeProducts(),
//   ]);

//   const basePlan = products.find((product) => product.name === 'Base');
//   const plusPlan = products.find((product) => product.name === 'Plus');

//   const basePrice = prices.find((price) => price.productId === basePlan?.id);
//   const plusPrice = prices.find((price) => price.productId === plusPlan?.id);

//   return (
//     <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
//       <div className="grid md:grid-cols-2 gap-8 max-w-xl mx-auto">
//         <PricingCard
//           name={basePlan?.name || 'Base'}
//           price={basePrice?.unitAmount || 800}
//           interval={basePrice?.interval || 'month'}
//           trialDays={basePrice?.trialPeriodDays || 7}
//           features={[
//             'Unlimited Usage',
//             'Unlimited Workspace Members',
//             'Email Support',
//           ]}
//           priceId={basePrice?.id}
//         />
//         <PricingCard
//           name={plusPlan?.name || 'Plus'}
//           price={plusPrice?.unitAmount || 1200}
//           interval={plusPrice?.interval || 'month'}
//           trialDays={plusPrice?.trialPeriodDays || 7}
//           features={[
//             'Everything in Base, and:',
//             'Early Access to New Features',
//             '24/7 Support + Slack Access',
//           ]}
//           priceId={plusPrice?.id}
//         />
//       </div>
//     </main>
//   );
// }

// function PricingCard({
//   name,
//   price,
//   interval,
//   trialDays,
//   features,
//   priceId,
// }: {
//   name: string;
//   price: number;
//   interval: string;
//   trialDays: number;
//   features: string[];
//   priceId?: string;
// }) {
//   return (
//     <div className="pt-6">
//       <h2 className="text-2xl font-medium text-gray-900 mb-2">{name}</h2>
//       <p className="text-sm text-gray-600 mb-4">
//         with {trialDays} day free trial
//       </p>
//       <p className="text-4xl font-medium text-gray-900 mb-6">
//         ${price / 100}{' '}
//         <span className="text-xl font-normal text-gray-600">
//           per user / {interval}
//         </span>
//       </p>
//       <ul className="space-y-4 mb-8">
//         {features.map((feature, index) => (
//           <li key={index} className="flex items-start">
//             <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
//             <span className="text-gray-700">{feature}</span>
//           </li>
//         ))}
//       </ul>
//       <form action={checkoutAction}>
//         <input type="hidden" name="priceId" value={priceId} />
//         <SubmitButton />
//       </form>
//     </div>
//   );
// }


















// // app/pricing/page.tsx

// 'use client';

// import useSWR from 'swr';
// import { Button } from '@/components/ui/button';
// import { ArrowRight, CheckCircle2 } from 'lucide-react';
// import Link from 'next/link';
// import PayPalSubscribeButton from '@/components/ui/PayPalSubscribeButton';
// import StripePaymentLinkButton from '@/components/ui/StripePaymentLinkButton';
// import Image from 'next/image'; // Import the Next.js Image component
// import { checkoutAction } from '@/lib/payments/actions';


// // Define the type for a single plan to ensure type safety
// type Plan = {
//   id: number;
//   displayName: string;
//   name: string;
//   description: string;
//   monthlyPrice: number;
//   annuallyPrice: number;
//   features: string[];
// };

// function Footer() {
//   return (
//     <footer className="bg-gray-800 border-t border-gray-700">
//       <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
//         <div className="flex flex-col md:flex-row justify-between items-center space-y-8 md:space-y-0">
//           {/* Left Side: Builder Info & Logo */}
//           <div className="flex items-center space-x-3">
//             <p className="text-sm text-gray-400">Web Product Powered by</p>
//             <a 
//               href="https://bmbez.com" 
//               target="_blank" 
//               rel="noopener noreferrer" 
//               title="Visit bmbez.com"
//               className="hover:opacity-80 transition-opacity"
//             >
//               <Image 
//                 src="https://bmbez.com/wp-content/uploads/2024/04/BMBEZ__1_-removebg-preview-2.png" 
//                 alt="BMBEZ (BuidMore Build EZ) Logo"
//                 width={120}
//                 height={30}
//                 className="h-auto" // Ensures the image maintains its aspect ratio
//               />
//             </a>
//           </div>

//           {/* Right Side: Copyright */}
//           <div className="text-center md:text-right">
//             <p className="text-sm text-gray-500">
//               © {new Date().getFullYear()} AurahSell. All Rights Reserved.
//             </p>
//             <p className="text-xs text-gray-600 mt-1">
//               BuidMore Build EZ
//             </p>
//           </div>
//         </div>
//       </div>
//     </footer>
//   );
// }

// // A simple fetcher function for useSWR
// const fetcher = (url: string) => fetch(url).then((res) => res.json());

// export default function PricingPage() {
//   // Fetch the plans data from your API endpoint
//   const { data: plans, error, isLoading } = useSWR<Plan[]>('/api/plans', fetcher);

//   const formatPrice = (price: number) => {
//    return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD',
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2
//     }).format(price);

//   };
//   return (
//     <main className="bg-gray-900 text-gray-100">
//       <section className="relative overflow-hidden pt-32 pb-4 sm:pt-40 sm:pb-18">
//         {/* Background grid effect from your homepage */}
//         <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

//         <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
//           <h1 className="text-4xl font-bold tracking-tighter text-white sm:text-6xl">
//             Choose Your <span className="text-orange-500">Advantage</span>
//           </h1>
//           <p className="mt-6 max-w-3xl mx-auto text-lg text-gray-400 sm:text-xl">
//             Simple, transparent pricing. Select the plan that fits your team's ambition and scale.
//           </p>
//         </div>

//         {/* This container will now center the pricing plans */}
//         <div className="mt-20 flex justify-center px-4">
//           {isLoading && <p className="text-center text-gray-400">Loading plans...</p>}
//           {error && <p className="text-center text-red-500">Failed to load pricing plans. Please try again later.</p>}

//           {plans && (
//             // Using flex and justify-center to center the plan cards
//             <div className="flex flex-wrap justify-center gap-8">
//               {plans.map((plan) => (
//                 <div
//                   key={plan.id}
//                   // Adjusted width and structure for better alignment within a flex container
//                   className="relative flex w-full max-w-md flex-col p-8 bg-[#111827] border border-gray-800 rounded-2xl"
//                 >
//                   <h3 className="text-2xl font-semibold text-white">{plan.displayName}</h3>
//                   <p className="mt-2 text-gray-400">{plan.description}</p>

//                   <div className="mt-6">
//                     <span className="text-5xl font-bold tracking-tight text-white">
//                       {formatPrice(plan.monthlyPrice)}
//                     </span>
//                     <span className="ml-1 text-xl font-medium text-gray-400">/month</span>
//                   </div>

//                   <p className="mt-2 text-sm text-gray-400">
//                     or {formatPrice(plan.annuallyPrice)} billed annually
//                   </p>

//                   <ul role="list" className="mt-8 space-y-4 flex-1">
//                     {plan.features.map((feature, index) => (
//                       <li key={index} className="flex items-center space-x-3">
//                         <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-orange-500" aria-hidden="true" />
//                         <span className="text-base text-gray-300">{feature}</span>
//                       </li>
//                     ))}
//                   </ul>

//                   {/* Kept this section commented out as in the original code */}
//                   {/* <div className="mt-10">
//                     <Button
//                       size="lg"
//                       className="w-full text-lg rounded-full bg-orange-500 hover:bg-orange-600"
//                       asChild
//                     >
//                       <Link href={`/sign-up?plan=${plan.name}`} className="flex items-center">
//                         Choose Plan <ArrowRight className="ml-2 h-5 w-5" />
//                       </Link>
//                     </Button>
//                   </div> */}
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </section>


//       <div className="flex justify-center pb-20">
//         <StripePaymentLinkButton />
//       </div>


//       <Footer />

//     </main>
//   );
// }














import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { checkoutAction } from '@/lib/payments/actions';

// Revalidate the data every hour to keep prices fresh
export const revalidate = 3600;

// Helper function to format the price from cents to a currency string
const formatPrice = (priceInCents: number | null | undefined) => {
  if (typeof priceInCents !== 'number') {
    return '$0.00'; // Return a default or loading state
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceInCents / 100);
};

function Footer() {
  return (
    <footer className="bg-gray-800 border-t border-gray-700">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-8 md:space-y-0">
          {/* Left Side: Builder Info & Logo */}
          <div className="flex items-center space-x-3">
            <p className="text-sm text-gray-400">Web Product Powered by</p>
            <a
              href="https://bmbez.com"
              target="_blank"
              rel="noopener noreferrer"
              title="Visit bmbez.com"
              className="hover:opacity-80 transition-opacity"
            >
              <Image
                src="https://bmbez.com/wp-content/uploads/2024/04/BMBEZ__1_-removebg-preview-2.png"
                alt="BMBEZ (BuidMore Build EZ) Logo"
                width={120}
                height={30}
                className="h-auto"
              />
            </a>
          </div>

          {/* Right Side: Copyright */}
          <div className="text-center md:text-right">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} AurahSell. All Rights Reserved.
            </p>
            <p className="text-xs text-gray-600 mt-1">
              BuidMore Build EZ
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default async function PricingPage() {
  // Fetch products and their prices directly on the server
  const [products, prices] = await Promise.all([
    getStripeProducts(),
    getStripePrices(),
  ]);

  // Manually define features for your plans here, matching by product name
  const planFeatures: { [key: string]: string[] } = {
    // Replace 'Your Product Name' with the actual name from your Stripe Dashboard
    'Caribbean AI Tutor Pass Ready': [
      '35 Audio file uploads per month',
      'Basic analytics',
      'Solo active team member',
      '60 Coaching calls per month',
      'Community support',
      'Unlimited Sales Sprints',
    ],
    'Caribbean AI Tutor Credit Ready': [
      '200 Audio file uploads per month',
      'Advanced analytics',
      '6 active team members',
      '400 Coaching calls per month',
      'Community support',
      'Unlimited Sales Sprints',
    ],
    'Caribbean AI Tutor Distinction Ready': [
      '400 Audio file uploads per month',
      'Advanced analytics',
      '10 active teammembers',
      '800 Coaching calls per month',
      'Community support',
      'Unlimited Sales Sprints',
    ],
    // Add other plans as needed
  };

  const allowedPlanNames = ['AurahSell Prospect', 'AurahSell Lead', 'AurahSell Closer'];


  // Combine product data with price data
  const plans = products
    .map((product) => {
      const productPrice = prices.find((price) => price.productId === product.id);
      return {
        ...product,
        priceId: productPrice?.id,
        unitAmount: productPrice?.unitAmount,
        interval: productPrice?.interval,
        features: planFeatures[product.name || ''] || [], // Get features based on product name
      };
    })
    .filter((plan) => plan.priceId && plan.name && allowedPlanNames.includes(plan.name))
    .sort((a, b) => (a.unitAmount || 0) - (b.unitAmount || 0));

  return (
    <main className="bg-gray-900 text-gray-100">
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40">
        {/* Background grid effect */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold tracking-tighter text-white sm:text-6xl">
            Choose Your <span className="text-orange-500">Advantage</span>
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-lg text-gray-400 sm:text-xl">
            Simple, transparent pricing. Select the plan that fits your team's
            ambition and scale.
          </p>
        </div>

        {/* This container will now center the pricing plans */}
        <div className="mt-20 flex justify-center px-4">
          {plans.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-8">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="relative flex w-full max-w-md flex-col p-8 bg-[#111827] border border-gray-800 rounded-2xl"
                >
                  <h3 className="text-2xl font-semibold text-white">
                    {plan.name}
                  </h3>
                  <p className="mt-2 text-gray-400">{plan.description}</p>

                  <div className="mt-6">
                    <span className="text-5xl font-bold tracking-tight text-white">
                      {formatPrice(plan.unitAmount)}
                    </span>
                    <span className="ml-1 text-xl font-medium text-gray-400">
                      /{plan.interval}
                    </span>
                  </div>

                  <ul role="list" className="mt-8 space-y-4 flex-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <CheckCircle2
                          className="h-5 w-5 flex-shrink-0 text-orange-500"
                          aria-hidden="true"
                        />
                        <span className="text-base text-gray-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-10">
                    <form action={checkoutAction}>
                      <input type="hidden" name="priceId" value={plan.priceId} />
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full text-lg rounded-full bg-orange-500 hover:bg-orange-600"
                      >
                        Choose Plan <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400">
              No pricing plans are available at the moment. Please check back later.
            </p>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}