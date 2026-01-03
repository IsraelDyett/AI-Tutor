// 'use client';

// import React from 'react';
// import Link from 'next/link';
// import { Button } from '@/components/ui/button'; // Adjust the import path if necessary
// import { CreditCard } from 'lucide-react'; // Example icon

// // The URL you copied from your Stripe Dashboard
// const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/9B6cN60GUeFg97u9658EM01';

// const StripePaymentLinkButton = () => {
//   return (
//     <Button size="lg" asChild>
//       <Link href={STRIPE_PAYMENT_LINK} target="_blank">
//         <CreditCard className="mr-2 h-5 w-5" /> Pay with Stripe
//       </Link>
//     </Button>
//   );
// };

// export default StripePaymentLinkButton;

// components/ui/StripePaymentLinkButton.tsx

import * as React from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 1. Define an interface for the component's props
interface StripePaymentLinkButtonProps {
  className?: string; // Make className an optional string prop
}

// The link to your Stripe payment page
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/9B6cN60GUeFg97u9658EM01";

export default function StripePaymentLinkButton({ className }: StripePaymentLinkButtonProps) {
  return (
    <a
      href={STRIPE_PAYMENT_LINK}
      target="_blank"
      rel="noopener noreferrer"
      // Apply base button styles, our new color styles, and any override classes
      className={cn(
        buttonVariants({ variant: "default" }),
        // --- STYLING CLASSES ---
        "bg-orange-500 text-white hover:bg-orange-600 font-bold", // Color
        "py-3 px-8 text-lg", // Sizing: Added padding and larger text
        // The className prop is last, so it can override anything if needed
        className
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mr-2 h-5 w-5"
      >
        <path d="M13.4 16.3a2 2 0 0 1-1.4.7 2 2 0 0 1-1.4-.7L8.4 14a2 2 0 0 1 0-2.8l2.2-2.3a2 2 0 0 1 2.8 0l2.2 2.3a2 2 0 0 1 0 2.8Z" />
        <path d="M12 18H7.5a4.5 4.5 0 0 1 0-9H12" />
        <path d="M12 6h4.5a4.5 4.5 0 0 1 0 9H12" />
      </svg>
      Pay with Stripe
    </a>
  );
}