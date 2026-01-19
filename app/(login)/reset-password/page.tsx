'use client';

import Link from 'next/link';
import { useActionState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { resetPassword } from '../actions';
import { ActionState } from '@/lib/auth/middleware';
import Image from 'next/image';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [state, formAction, pending] = useActionState<ActionState, FormData>(
        resetPassword,
        { error: '', success: '' }
    );

    if (!token) {
        return (
            <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-red-800">
                            Invalid or missing password reset token.
                        </p>
                    </div>
                </div>
                <div className="mt-4">
                    <Link
                        href="/forgot-password"
                        className="text-sm font-medium text-orange-600 hover:text-orange-500"
                    >
                        Request a new reset link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
            {state?.success ? (
                <div className="rounded-md bg-green-50 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-green-800">
                                {state.success}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <Link
                            href="/sign-in"
                            className="text-sm font-medium text-orange-600 hover:text-orange-500 flex items-center"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Go to login
                        </Link>
                    </div>
                </div>
            ) : (
                <form className="space-y-6" action={formAction}>
                    <input type="hidden" name="token" value={token} />
                    <div>
                        <Label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700"
                        >
                            New Password
                        </Label>
                        <div className="mt-1">
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={8}
                                className="appearance-none rounded-full relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                                placeholder="Enter new password"
                            />
                        </div>
                    </div>

                    <div>
                        <Label
                            htmlFor="confirmPassword"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Confirm New Password
                        </Label>
                        <div className="mt-1">
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={8}
                                className="appearance-none rounded-full relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                                placeholder="Confirm new password"
                            />
                        </div>
                    </div>

                    {state?.error && (
                        <div className="text-red-500 text-sm">{state.error}</div>
                    )}

                    <div>
                        <Button
                            type="submit"
                            className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                            disabled={pending}
                        >
                            {pending ? (
                                <>
                                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                    Resetting...
                                </>
                            ) : (
                                'Reset Password'
                            )}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <Link href="/" aria-label="Back to homepage">
                        <Image
                            src="/image/edulogo.png"
                            alt="EduCaribbean Logo"
                            width={160}
                            height={40}
                            priority
                        />
                    </Link>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Set new password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Please enter your new password below.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <Suspense fallback={<Loader2 className="animate-spin mx-auto h-8 w-8" />}>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}
