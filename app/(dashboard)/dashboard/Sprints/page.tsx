// app/(dashboard)/dashboard/Sprint/page.tsx

'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { PlusCircle, Loader2, X, ArrowRight } from 'lucide-react';
import { SalesSprint } from '@/lib/db/schema';

type Goal = {
  metric: string;
  target: string;
};

type SprintListItem = Pick<SalesSprint, 'id' | 'sprintName' | 'performanceScore' | 'summary' | 'endDate'>;

const fetcher = (url: string) => fetch(url).then(res => res.json());

// --- Create Sprint Form Component ---
function CreateSprintForm({ onSprintCreated }: { onSprintCreated: () => void }) {
  const [sprintName, setSprintName] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [goals, setGoals] = useState<Goal[]>([{ metric: '', target: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoalChange = (index: number, field: keyof Goal, value: string) => {
    const newGoals = [...goals];
    newGoals[index][field] = value;
    setGoals(newGoals);
  };

  const addGoal = () => setGoals([...goals, { metric: '', target: '' }]);
  const removeGoal = (index: number) => {
    const newGoals = goals.filter((_, i) => i !== index);
    setGoals(newGoals);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!sprintName || !dateRange?.from || !dateRange?.to || goals.some(g => !g.metric || !g.target)) {
      setError('Please fill in all fields, including at least one complete goal.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sprintName,
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
          goals,
        }),
      });
      if (!response.ok) throw new Error('Failed to create sprint.');
      
      // Reset form
      setSprintName('');
      setDateRange(undefined);
      setGoals([{ metric: '', target: '' }]);
      onSprintCreated(); // Re-fetch sprint list

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Sales Sprint</CardTitle>
        <CardDescription>Set the goals and timeframe for your next sprint.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="sprintName">Sprint Name</Label>
            <Input id="sprintName" value={sprintName} onChange={e => setSprintName(e.target.value)} placeholder="e.g., Q4 Final Push" />
          </div>
          <div className="space-y-2">
            <Label>Sprint Dates</Label>
            <DateRangePicker date={dateRange} setDate={setDateRange} />
          </div>
          <div className="space-y-4">
            <Label>Goals</Label>
            {goals.map((goal, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input placeholder="Metric (e.g., Demos Booked)" value={goal.metric} onChange={e => handleGoalChange(index, 'metric', e.target.value)} />
                <Input placeholder="Target (e.g., 25)" type="number" value={goal.target} onChange={e => handleGoalChange(index, 'target', e.target.value)} />
                <Button variant="ghost" size="icon" onClick={() => removeGoal(index)} disabled={goals.length === 1}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addGoal}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Goal
            </Button>
          </div>
           {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Sprint
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


// --- Main Page Component ---
export default function PerformancePage() {
    const { mutate } = useSWRConfig();
    const [endDate, setEndDate] = useState(new Date());
    const [sprintCount, setSprintCount] = useState(5);

    const { data: sprints, error, isLoading } = useSWR<SprintListItem[]>(
        `/api/sprints?endDate=${endDate.toISOString()}&limit=${sprintCount}`,
        fetcher
    );
    
    return (
        <section className="flex-1 p-4 lg:p-8 space-y-8">
            <h1 className="text-3xl font-bold">Performance Tracking</h1>

            <CreateSprintForm onSprintCreated={() => mutate(`/api/sprints?endDate=${endDate.toISOString()}&limit=${sprintCount}`)} />

            <Card>
                <CardHeader>
                    <CardTitle>Recent Sprints</CardTitle>
                    <CardDescription>Review your past performance and update sprints with outcomes.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading && <p>Loading sprints...</p>}
                    {error && <p className="text-red-500">Failed to load sprints.</p>}
                    {sprints && sprints.length === 0 && <p className="text-muted-foreground">No sprints found. Create one to get started!</p>}
                    
                    <ul className="space-y-4">
                        {sprints?.map(sprint => (
                            <li key={sprint.id}>
                                <Link href={`/dashboard/Sprints/${sprint.id}`} className="block p-4 border rounded-lg hover:bg-muted transition-colors">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">{sprint.sprintName}</p>
                                            <p className="text-sm text-muted-foreground">Ended on {format(new Date(sprint.endDate), 'PPP')}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {sprint.performanceScore && (
                                                <div className="text-right">
                                                    <p className="text-sm text-muted-foreground">Score</p>
                                                    <p className="font-bold text-lg">{sprint.performanceScore}</p>
                                                </div>
                                            )}
                                            <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    </div>
                                    {sprint.summary && <p className="mt-2 text-sm text-muted-foreground truncate">{sprint.summary}</p>}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </CardContent>
                {sprints && sprints.length >= sprintCount && (
                    <CardFooter>
                         <Button variant="outline" onClick={() => setSprintCount(prev => prev + 5)}>Load More Sprints</Button>
                    </CardFooter>
                )}
            </Card>
        </section>
    );
}