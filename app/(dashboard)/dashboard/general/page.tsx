//app\(dashboard)\dashboard\general\page.tsx
'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { updateAccount } from '@/app/(login)/actions';
import { User, TeamDataWithMembers } from '@/lib/db/schema';
import useSWR from 'swr';
import { Suspense } from 'react';
import { customerPortalAction } from '@/lib/payments/actions';
import PaymentInstructionsModal from '@/components/PaymentInstructionsModal';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ActionState = {
  name?: string;
  error?: string;
  success?: string;
};

type AccountFormProps = {
  state: ActionState;
  nameValue?: string;
  emailValue?: string;
  phoneNumberValue?: string;
  countryValue?: string;
};

function AccountForm({
  state,
  nameValue = '',
  emailValue = '',
  phoneNumberValue = '',
  countryValue = ''
}: AccountFormProps) {
  return (
    <>
      <div>
        <Label htmlFor="name" className="mb-2">
          Name
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter your name"
          defaultValue={state.name || nameValue}
          required
        />
      </div>
      <div>
        <Label htmlFor="email" className="mb-2">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          defaultValue={emailValue}
          required
        />
      </div>
      <div>
        <Label htmlFor="phoneNumber" className="mb-2">
          Phone Number
        </Label>
        <Input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          placeholder="Enter your phone number"
          defaultValue={phoneNumberValue}
        />
      </div>
      <div>
        <Label htmlFor="country" className="mb-2">
          Country
        </Label>
        <select
          id="country"
          name="country"
          defaultValue={countryValue}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select your country</option>
          <option value="Anguilla">Anguilla</option>
          <option value="Antigua and Barbuda">Antigua and Barbuda</option>
          <option value="Bahamas">Bahamas</option>
          <option value="Barbados">Barbados</option>
          <option value="Belize">Belize</option>
          <option value="Bermuda">Bermuda</option>
          <option value="British Virgin Islands">British Virgin Islands</option>
          <option value="Cayman Islands">Cayman Islands</option>
          <option value="Dominica">Dominica</option>
          <option value="Grenada">Grenada</option>
          <option value="Guyana">Guyana</option>
          <option value="Jamaica">Jamaica</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Saint Kitts and Nevis">Saint Kitts and Nevis</option>
          <option value="Saint Lucia">Saint Lucia</option>
          <option value="Saint Vincent and the Grenadines">Saint Vincent and the Grenadines</option>
          <option value="Suriname">Suriname</option>
          <option value="Trinidad and Tobago">Trinidad and Tobago</option>
          <option value="Turks and Caicos Islands">Turks and Caicos Islands</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </>
  );
}

function AccountFormWithData({ state }: { state: ActionState }) {
  const { data: user } = useSWR<User & { phoneNumber?: string, country?: string }>('/api/user', fetcher);
  return (
    <AccountForm
      state={state}
      nameValue={user?.name ?? ''}
      emailValue={user?.email ?? ''}
      phoneNumberValue={user?.phoneNumber ?? ''}
      countryValue={user?.country ?? ''}
    />
  );
}

function SubscriptionSkeleton() {
  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>Team Subscription</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ManageSubscription() {
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);

  return (
    <Card className="mb-8 border-orange-100 shadow-sm">
      <CardHeader>
        <CardTitle className="text-orange-800">Team Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="mb-4 sm:mb-0">
              <p className="font-medium text-gray-900">
                Current Plan: {teamData?.planName || 'Free'}
              </p>
              <p className="text-sm text-gray-500">
                {teamData?.subscriptionStatus === 'active'
                  ? 'Billed monthly'
                  : teamData?.subscriptionStatus === 'trialing'
                    ? 'Trial period'
                    : 'No active subscription'}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <form action={customerPortalAction}>
                <Button type="submit" variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50">
                  Manage Subscription
                </Button>
              </form>
              <PaymentInstructionsModal
                className="mt-0 text-sm h-10 px-4 py-2 border-orange-200 hover:bg-orange-50 text-orange-600 scale-100"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GeneralPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    {}
  );

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        General Settings
      </h1>

      <Suspense fallback={<SubscriptionSkeleton />}>
        <ManageSubscription />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={formAction}>
            <Suspense fallback={<AccountForm state={state} />}>
              <AccountFormWithData state={state} />
            </Suspense>
            {state.error && (
              <p className="text-red-500 text-sm">{state.error}</p>
            )}
            {state.success && (
              <p className="text-green-500 text-sm">{state.success}</p>
            )}
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
