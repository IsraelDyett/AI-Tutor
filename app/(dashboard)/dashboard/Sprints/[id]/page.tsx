// app/(dashboard)/dashboard/Sprints/[id]/page.tsx

'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Mic } from 'lucide-react';
import { SalesSprint } from '@/lib/db/schema';
import PerformanceSession from '@/components/ui/PerformanceSession';


type Outcome = {
  metric: string;
  actual: string;
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

// --- Component to Enter Outcomes ---
function UpdateOutcomesForm({ sprint, onUpdate }: { sprint: SalesSprint, onUpdate: () => void }) {
    const initialOutcomes = (sprint.goals as any[]).map(goal => ({
        metric: goal.metric,
        actual: '',
    }));
    const [outcomes, setOutcomes] = useState<Outcome[]>(initialOutcomes);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleOutcomeChange = (index: number, value: string) => {
        const newOutcomes = [...outcomes];
        newOutcomes[index].actual = value;
        setOutcomes(newOutcomes);
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (outcomes.some(o => !o.actual)) {
            setError('Please fill in all outcome fields.');
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/sprints/${sprint.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outcomes }),
            });
            if (!response.ok) throw new Error('Failed to submit outcomes.');
            onUpdate();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Enter Sprint Outcomes</CardTitle>
                <CardDescription>Record your actual performance for this sprint to generate an analysis.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        {outcomes.map((outcome, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 items-center">
                                <Label htmlFor={`outcome-${index}`}>{outcome.metric}</Label>
                                <Input
                                    id={`outcome-${index}`}
                                    placeholder="Actual"
                                    type="number"
                                    value={outcome.actual}
                                    onChange={e => handleOutcomeChange(index, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Outcomes for Analysis
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

// --- Start of Fix: Updated props for SprintResults ---
function SprintResults({
    sprint,
    onStartCoaching,
    isStartingCoaching,
    coachingError
}: {
    sprint: SalesSprint;
    onStartCoaching: () => void;
    isStartingCoaching: boolean;
    coachingError: string | null;
}) {
// --- End of Fix ---
    const goals = sprint.goals as any[];
    const outcomes = sprint.outcomes as any[];
    
    const outcomeMap = new Map(outcomes.map(o => [o.metric, o.actual]));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                    <h2 className="text-3xl font-bold">Sprint Analysis</h2>
                    <p className="text-muted-foreground mt-1">Review your performance and start a coaching session.</p>
                </div>
                 {/* --- Start of Fix: Updated Button with loading/error state --- */}
                 <div className="text-left sm:text-right">
                    <Button onClick={onStartCoaching} className="w-full sm:w-auto" disabled={isStartingCoaching}>
                        {isStartingCoaching ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Checking limit...
                            </>
                        ) : (
                            <>
                                <Mic className="mr-2 h-4 w-4" />
                                Start Live Performance Review
                            </>
                        )}
                    </Button>
                    {coachingError && (
                        <p className="text-sm text-red-500 mt-2">{coachingError}</p>
                    )}
                </div>
                {/* --- End of Fix --- */}
            </div>

            <Card>
                <CardHeader><CardTitle>Performance Summary</CardTitle></CardHeader>
                <CardContent>
                    <p className="prose prose-sm sm:prose-base max-w-none dark:prose-invert">{sprint.summary || "Summary analysis is pending."}</p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Performance Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{sprint.performanceScore ?? 'N/A'}</p>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle>Goals vs. Outcomes</CardTitle></CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {goals.map((goal, index) => {
                                const actual = outcomeMap.get(goal.metric) ?? 'N/A';
                                return (
                                    <li key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                                        <span>{goal.metric}</span>
                                        <span className="font-mono text-sm mt-1 sm:mt-0">
                                            {actual} / <span className="text-muted-foreground">{goal.target}</span>
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Strengths</CardTitle></CardHeader>
                    <CardContent>
                        <ul className="list-disc list-inside space-y-2">
                            {sprint.strengths?.map((s, i) => <li key={i}>{s}</li>) ?? <li>Analysis pending...</li>}
                        </ul>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Areas for Improvement</CardTitle></CardHeader>
                    <CardContent>
                        <ul className="list-disc list-inside space-y-2">
                             {sprint.areasForImprovement?.map((a, i) => <li key={i}>{a}</li>) ?? <li>Analysis pending...</li>}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// --- Main Detail Page Component ---
export default function SprintDetailPage() {
  const params = useParams();
  const { mutate } = useSWRConfig();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [isCoachingOpen, setIsCoachingOpen] = useState(false);
  // --- Start of Fix: Added state for coaching limit check ---
  const [isStartingCoaching, setIsStartingCoaching] = useState(false);
  const [coachingError, setCoachingError] = useState<string | null>(null);
  // --- End of Fix ---

  const { data: sprint, error, isLoading } = useSWR<SalesSprint>(
    id ? `/api/sprints/${id}` : null,
    fetcher
  );

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error || !sprint) return <div className="p-8">Failed to load sprint details. It may not exist or you may not have permission to view it.</div>;

  const formatDataForCoaching = (sprintData: SalesSprint) => {
    const goals = ((sprintData.goals as any[]) || []).reduce((acc, goal) => {
        acc[goal.metric] = goal.target;
        return acc;
    }, {});

    const outcome = ((sprintData.outcomes as any[]) || []).reduce((acc, out) => {
        acc[out.metric] = out.actual;
        return acc;
    }, {});
    
    return {
        sprintName: sprintData.sprintName,
        startDate: new Date(sprintData.startDate),
        endDate: new Date(sprintData.endDate),
        goals,
        outcome,
    };
  }

  const handleCoachingSave = () => {
    mutate(`/api/sprints/${id}`);
    setIsCoachingOpen(false);
  };
  
  // --- Start of Fix: Added handler to check coaching limit ---
  const handleStartPerformanceReview = async () => {
    setIsStartingCoaching(true);
    setCoachingError(null);
    try {
        const response = await fetch('/api/coaching/start', {
            method: 'POST',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to start performance review.');
        }

        // On success, open the modal
        setIsCoachingOpen(true);

    } catch (err: any) {
        setCoachingError(err.message);
    } finally {
        setIsStartingCoaching(false);
    }
  };
  // --- End of Fix ---

  return (
    <>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <Link href="/dashboard/Sprints" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Sprints
                </Link>
                
                <header>
                    <h1 className="text-4xl font-bold tracking-tight">{sprint.sprintName}</h1>
                    <p className="mt-2 text-muted-foreground">
                        {format(new Date(sprint.startDate), 'PPP')} – {format(new Date(sprint.endDate), 'PPP')}
                    </p>
                </header>

                {!sprint.outcomes || !Array.isArray(sprint.outcomes) || sprint.outcomes.length === 0 ? (
                    <UpdateOutcomesForm sprint={sprint} onUpdate={() => mutate(`/api/sprints/${id}`)} />
                ) : (
                    // --- Start of Fix: Pass new props to SprintResults ---
                    <SprintResults 
                        sprint={sprint} 
                        onStartCoaching={handleStartPerformanceReview}
                        isStartingCoaching={isStartingCoaching}
                        coachingError={coachingError}
                    />
                    // --- End of Fix ---
                )}
            </div>
        </main>

        {sprint && (
            <PerformanceSession
                isOpen={isCoachingOpen}
                onClose={() => setIsCoachingOpen(false)}
                onSaveComplete={handleCoachingSave}
                sprintId={String(sprint.id)}
                salesSprintData={formatDataForCoaching(sprint)}
          />
        )}
    </>
  );
}