'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useSWR from 'swr';
import { User, Team } from '@/lib/db/schema';
import PaymentInstructionsModal from './PaymentInstructionsModal';

interface UserDetails {
    user: User;
    team: Team | null;
    role: 'owner' | 'member' | null;
    hasSignedIn: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SubscriptionReminderModal() {
    const [isOpen, setIsOpen] = useState(false);
    const { data: userDetails, isLoading } = useSWR<UserDetails>('/api/user/details', fetcher);
    const router = useRouter();

    useEffect(() => {
        if (isLoading || !userDetails) return;

        // If the user has never signed in (meaning they just signed up and are in their first session),
        // do not show the popup.
        if (!userDetails.hasSignedIn) return;

        const checkSubscription = () => {
            // Check if user is logged in (userDetails exists) and has no active plan.
            // We consider "active" and "trialing" as having a plan.
            const status = userDetails.team?.subscriptionStatus;
            const hasPlan = status === 'active' || status === 'trialing';

            if (!hasPlan) {
                setIsOpen(true);
            }
        };

        // Check immediately upon data load
        checkSubscription();

        // Check every 15 minutes
        const interval = setInterval(() => {
            checkSubscription();
        }, 15 * 60 * 1000);

        return () => clearInterval(interval);
    }, [userDetails, isLoading]);

    const handleRedirect = () => {
        setIsOpen(false);
        router.push('/dashboard/general');
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Subscription Required</DialogTitle>
                    <DialogDescription>
                        You do not currently have a payment plan. Please subscribe to a payment plan to continue.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col sm:justify-center gap-2">
                    <Button onClick={handleRedirect} className="w-full sm:w-auto">
                        Manage Payments
                    </Button>
                    <div className="flex justify-center w-full">
                        <PaymentInstructionsModal
                            className="mt-0 text-sm h-9 px-4 py-2 border border-orange-500 scale-100"
                        />
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
