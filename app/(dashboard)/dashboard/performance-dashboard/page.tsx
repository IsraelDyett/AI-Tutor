// app/(dashboard)/dashboard/performance-dashboard/page.tsx

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { format, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { TeamDataWithMembers } from '@/lib/db/schema';

type DashboardData = {
  performanceOverTime: { date: string; Score: number }[];
  goalVsOutcome: { metric: string; totalGoal: number; totalOutcome: number }[];
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function PerformanceDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  // Fetch team members for the filter dropdown
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);

  // Construct the API URL with query parameters
  const apiUrl = dateRange?.from && dateRange?.to
    ? `/api/sprints/dashboard?startDate=${format(dateRange.from, 'yyyy-MM-dd')}&endDate=${format(dateRange.to, 'yyyy-MM-dd')}&userId=${selectedUserId}`
    : null;

  const { data, error, isLoading } = useSWR<DashboardData>(apiUrl, fetcher);

  const hasData = data && (data.performanceOverTime.length > 0 || data.goalVsOutcome.length > 0);

  return (
    <section className="flex-1 p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Performance Dashboard</h1>
        <div className="flex flex-col sm:flex-row items-center gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {teamData?.teamMembers?.map(member => (
                        <SelectItem key={member.user.id} value={member.user.id.toString()}>
                            {member.user.name || member.user.email}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && <div className="text-red-500 text-center py-20">Failed to load dashboard data.</div>}
      
      {!isLoading && !error && !hasData && (
         <div className="text-center py-20">
            <p className="text-lg text-muted-foreground">No completed sprint data found for the selected filters.</p>
            <p className="text-sm text-muted-foreground">Try adjusting the date range or ensure sprints have outcomes submitted.</p>
         </div>
      )}

      {hasData && (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Performance Score Over Time</CardTitle>
                    <CardDescription>Tracks the AI-generated performance score at the end of each sprint.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.performanceOverTime}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="Score" stroke="#ea580c" strokeWidth={2} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Aggregated Goals vs. Outcomes</CardTitle>
                    <CardDescription>A sum of all common metrics tracked across the selected sprints.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.goalVsOutcome}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="metric" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="totalGoal" fill="#a1a1aa" name="Goal" />
                            <Bar dataKey="totalOutcome" fill="#ea580c" name="Outcome" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
      )}
    </section>
  );
}