'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentInstructionsModalProps {
    className?: string; // Additional classes for the button
    text?: string;      // Custom text for the button
}

export default function PaymentInstructionsModal({ className, text }: PaymentInstructionsModalProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <button
                type="button"
                onClick={() => {
                    setIsOpen(true);
                }}
                className={cn(
                    "mt-8 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white font-semibold rounded-full px-8 h-10 text-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center cursor-pointer relative z-50",
                    className // Merge custom classes
                )}
            >
                {text || "Don't have a Credit Card?"}
            </button>

            {/* 
         Fixed: Increased width significantly using sm:max-w-[1100px] and w-[95vw] 
         to prevent jumbled text on smaller PC screens.
      */}
            <DialogContent className="sm:max-w-[1100px] w-[95vw] bg-[#f5f5f5] p-0 overflow-hidden max-h-[95vh] overflow-y-auto">
                <div className="p-8 grid lg:grid-cols-12 gap-8 lg:gap-12">

                    {/* LEFT COLUMN: Pricing Plans & Features (Spans 7 columns) */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="text-center pb-4 border-b border-gray-200">
                            <h2 className="text-3xl font-extrabold text-black uppercase tracking-wide mb-1">
                                Monthly Pricing Plan
                            </h2>
                            <p className="text-gray-600 text-sm italic font-medium">
                                Same benefits. Choose your pace
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-6">
                            {/* Plan Features List */}
                            <div className="flex-1 space-y-4 pt-4">
                                <h3 className="text-[#2d4085] font-bold text-lg mb-4 uppercase tracking-tight">Plan Features</h3>

                                <div className="space-y-6">
                                    <div className="flex items-start bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                                        <Check className="w-6 h-6 text-green-600 shrink-0 mr-3 mt-0.5" strokeWidth={4} />
                                        <span className="text-gray-800 font-bold text-sm leading-snug">60 Live Tutor Sessions</span>
                                    </div>
                                    <div className="flex items-start bg-gray-200 p-3 rounded-xl shadow-sm border border-gray-100">
                                        <Check className="w-6 h-6 text-green-600 shrink-0 mr-3 mt-0.5" strokeWidth={4} />
                                        <span className="text-gray-800 font-bold text-sm leading-snug">100 Ai Chat Sessions</span>
                                    </div>
                                    <div className="flex items-start bg-gray-200 p-3 rounded-xl shadow-sm border border-gray-100">
                                        <Check className="w-6 h-6 text-green-600 shrink-0 mr-3 mt-0.5" strokeWidth={4} />
                                        <span className="text-gray-800 font-bold text-sm leading-snug">80 Ai Generated Past Papers</span>
                                    </div>
                                    <div className="flex items-start bg-gray-200 p-3 rounded-xl shadow-sm border border-gray-100">
                                        <Check className="w-6 h-6 text-green-600 shrink-0 mr-3 mt-0.5" strokeWidth={4} />
                                        <span className="text-gray-800 font-bold text-sm leading-snug">150 Flash Card Generations</span>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Options */}
                            <div className="flex-1 space-y-4">
                                {/* Monthly */}
                                <div className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="bg-[#3e7d40] py-2 px-2">
                                        <h3 className="text-lg font-black text-white text-center uppercase">Monthly Plan</h3>
                                    </div>
                                    <div className="bg-[#e5e5e5] py-3 text-center border-x border-b border-gray-300 rounded-b-xl">
                                        <p className="text-2xl font-black text-gray-900">$200<span className="text-base font-medium text-gray-700">/month</span></p>
                                    </div>
                                </div>

                                {/* 3 Month */}
                                <div className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="bg-[#2d4085] py-2 px-2">
                                        <h3 className="text-lg font-black text-white text-center uppercase">3 Month Plan</h3>
                                    </div>
                                    <div className="bg-[#e5e5e5] py-3 text-center border-x border-b border-gray-300 rounded-b-xl">
                                        <p className="text-2xl font-black text-gray-900">$500<span className="text-base font-medium text-gray-700">/3 months</span></p>
                                    </div>
                                </div>

                                {/* 6 Month */}
                                <div className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="bg-[#c0a653] py-2 px-2">
                                        <h3 className="text-lg font-black text-white text-center uppercase">6 Month Plan</h3>
                                    </div>
                                    <div className="bg-[#e5e5e5] py-3 text-center border-x border-b border-gray-300 rounded-b-xl">
                                        <p className="text-2xl font-black text-gray-900">$900<span className="text-base font-medium text-gray-700">/6 months</span></p>
                                    </div>
                                </div>

                                {/* 1 Year */}
                                <div className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="bg-[#c77341] py-2 px-2">
                                        <h3 className="text-lg font-black text-white text-center uppercase">1 Year Plan</h3>
                                    </div>
                                    <div className="bg-[#e5e5e5] py-3 text-center border-x border-b border-gray-300 rounded-b-xl">
                                        <p className="text-2xl font-black text-gray-900">$1,600<span className="text-base font-medium text-gray-700">/year</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Payment Steps (Spans 5 columns) */}
                    <div className="lg:col-span-5 border-l border-gray-200 lg:pl-8">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-3xl font-extrabold text-center text-black uppercase tracking-wide">
                                Payment Steps
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 relative">
                            {/* Step 1 */}
                            <div className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-black bg-white text-xl font-bold text-black z-10 shrink-0">
                                        1
                                    </div>
                                    <div className="w-0.5 h-full bg-black/20 -my-2"></div>
                                </div>
                                <div className="flex-1 pb-4">
                                    <div className="rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-[#3e7d40] px-4 py-1.5">
                                            <h3 className="text-lg font-bold text-white text-center">Direct Deposit</h3>
                                        </div>
                                        <div className="bg-[#dcdcdc] p-4 text-gray-900 border-l-4 border-[#3e7d40]">
                                            <p className="font-bold mb-1 text-sm">Make Direct Deposit Payment to:</p>
                                            <div className="space-y-0.5 text-sm font-medium">
                                                <p><span className="font-bold">Bank:</span> RBC</p>
                                                <p><span className="font-bold">Branch:</span> Trincity</p>
                                                <p><span className="font-bold">Account Type:</span> Savings</p>
                                                <p><span className="font-bold">Account Number:</span> 110000005549968</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-black bg-white text-xl font-bold text-black z-10 shrink-0">
                                        2
                                    </div>
                                    <div className="w-0.5 h-full bg-black/20 -my-2"></div>
                                </div>
                                <div className="flex-1 pb-4">
                                    <div className="rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-[#3e7d40] px-4 py-1.5">
                                            <h3 className="text-lg font-bold text-white text-center">Take Screenshot</h3>
                                        </div>
                                        <div className="bg-[#dcdcdc] p-4 text-gray-900 border-l-4 border-[#3e7d40] flex items-center justify-center">
                                            <p className="text-center font-medium text-sm">
                                                Screenshot your payment confirmation/ receipt
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-black bg-white text-xl font-bold text-black z-10 shrink-0">
                                        3
                                    </div>
                                    <div className="w-0.5 h-full bg-black/20 -my-2"></div>
                                </div>
                                <div className="flex-1 pb-4">
                                    <div className="rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-[#3e7d40] px-4 py-1.5">
                                            <h3 className="text-lg font-bold text-white text-center">Send Your Details</h3>
                                        </div>
                                        <div className="bg-[#dcdcdc] p-4 text-gray-900 border-l-4 border-[#3e7d40]">
                                            <p className="font-bold mb-1 text-center sm:text-left text-sm">Include the following:</p>
                                            <ul className="list-disc list-inside space-y-0.5 font-medium ml-2 text-sm">
                                                <li>Screenshot of payment</li>
                                                <li>Payment plan selected</li>
                                                <li>Full Name</li>
                                                <li>Email Address</li>
                                                <li>Phone number</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-black bg-white text-xl font-bold text-black z-10 shrink-0">
                                        4
                                    </div>
                                    {/* No line after last item */}
                                </div>
                                <div className="flex-1">
                                    <div className="rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-[#3e7d40] px-4 py-1.5">
                                            <h3 className="text-lg font-bold text-white text-center">Submit Payment</h3>
                                        </div>
                                        <div className="bg-[#dcdcdc] p-4 text-gray-900 border-l-4 border-[#3e7d40]">
                                            <p className="font-bold mb-1 text-center sm:text-left text-sm">Send All details via DM to ONE of the following:</p>
                                            <ul className="list-disc list-inside space-y-0.5 font-medium ml-2 text-sm">
                                                <li>Instagram: <span className="font-bold">@EduCaribbean</span></li>
                                                <li>WhatsApp: <span className="font-bold">(868) 472-1403</span></li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Banner */}
                        <div className="mt-8">
                            <div className="bg-[#3e7d40] rounded-2xl p-3 text-center shadow-md">
                                <p className="text-white font-bold text-base">
                                    Once verified, your enrollment will be confirmed
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
