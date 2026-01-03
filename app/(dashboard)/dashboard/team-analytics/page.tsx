// app/(dashboard)/dashboard/team-analytics/page.tsx

'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DateRange } from 'react-day-picker';
import { subDays, format } from 'date-fns';
import { DateRangePicker } from '@/components/ui/DateRangePicker'; // Assuming you have this component
import { Loader2 } from 'lucide-react';
// --- Start of The Fix: Import Select components and TeamData type ---
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeamDataWithMembers } from '@/lib/db/schema';
import PerformanceDashboardPage from '@/components/ui/sprintAnalysis';
// --- End of The Fix ---


// Type for the aggregated analytics data from our new API
type TeamAnalyticsData = {
  objectionTypeDistribution: { [key: string]: number };
  fillerWordFrequency: { [key: string]: number };
  strengthsHighlight: string[];
  areasForImprovement: string[];
  averageCallPerformanceScore: string;
  averageObjectionCount: string;
  averageTalkToListenRatio: string;
  transcriptionCount: number;
  startDate: string;
  endDate: string;
  message?: string; // To handle "no data" messages from the API
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Reusable Metric Card Component
function MetricCard({ title, value }: { title: string; value: string | number | undefined }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value ?? 'N/A'}</p>
      </CardContent>
    </Card>
  );
}

export default function TeamAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  
  // --- Start of The Fix: Add state for selected user and fetch team data ---
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  // --- End of The Fix ---

//   // Construct the API URL with query parameters
//   const apiUrl = dateRange?.from && dateRange?.to
//     ? `/api/team/analytics?startDate=${format(dateRange.from, 'yyyy-MM-dd')}&endDate=${format(dateRange.to, 'yyyy-MM-dd')}`
//     : null;


  // --- Start of The Fix: Update API URL to include the userId ---
  const apiUrl = dateRange?.from && dateRange?.to
    ? `/api/team/analytics?startDate=${format(dateRange.from, 'yyyy-MM-dd')}&endDate=${format(dateRange.to, 'yyyy-MM-dd')}&userId=${selectedUserId}`
    : null;
  // --- End of The Fix ---

  const { data, error, isLoading } = useSWR<TeamAnalyticsData>(apiUrl, fetcher);

  const objectionData = data?.objectionTypeDistribution
    ? Object.entries(data.objectionTypeDistribution).map(([name, value]) => ({ name, count: value }))
    : [];

  const fillerWordData = data?.fillerWordFrequency
    ? Object.entries(data.fillerWordFrequency).map(([name, value]) => ({ name, count: value }))
    : [];

  return (
    <section className="flex-1 p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Sales Call Analytics</h1>
         {/* --- Start of The Fix: Add the user filter select component --- */}
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
        {/* --- End of The Fix --- */}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-4 text-lg">Loading Analytics...</p>
        </div>
      )}

      {error && <div className="text-red-500 text-center py-12">Failed to load analytics data. Please try adjusting the date range.</div>}
      
      {!isLoading && !error && !data?.transcriptionCount && (
         <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">No transcription data found for the selected date range.</p>
         </div>
      )}

      {data && data.transcriptionCount > 0 && (
        <>
            <p className="text-muted-foreground">
                Displaying aggregated data for {data.transcriptionCount} transcriptions from {format(new Date(data.startDate), 'PPP')} to {format(new Date(data.endDate), 'PPP')}.
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <MetricCard title="Avg. Call Performance Score" value={data.averageCallPerformanceScore} />
                <MetricCard title="Avg. Talk-to-Listen Ratio" value={data.averageTalkToListenRatio} />
                <MetricCard title="Avg. Objection Count" value={data.averageObjectionCount} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                <CardHeader>
                    <CardTitle>Cumulative Objection Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={objectionData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#ea580c" />
                    </BarChart>
                    </ResponsiveContainer>
                </CardContent>
                </Card>
                <Card>
                <CardHeader>
                    <CardTitle>Cumulative Filler Word Frequency</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={fillerWordData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#ea580c" />
                    </BarChart>
                    </ResponsiveContainer>
                </CardContent>
                </Card>
            </div>
{/* 
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                <CardHeader>
                    <CardTitle>Common Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc list-inside space-y-2">
                    {data.strengthsHighlight?.map((strength, index) => (
                        <li key={index}>{strength}</li>
                    ))}
                    </ul>
                </CardContent>
                </Card>
                <Card>
                <CardHeader>
                    <CardTitle>Common Areas for Improvement</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc list-inside space-y-2">
                    {data.areasForImprovement?.map((area, index) => (
                        <li key={index}>{area}</li>
                    ))}
                    </ul>
                </CardContent>
                </Card>
            </div> */}
        </>
      )}

      {/* --- Start of The Fix: Add Sprint Analysis Component --- */}
      <div className="my-12 border-t" />
      <PerformanceDashboardPage />
      {/* --- End of The Fix --- */}

    </section>
  );
}