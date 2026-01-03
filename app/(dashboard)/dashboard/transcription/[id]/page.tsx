// 'use client';

// import useSWR from 'swr';
// import { useParams } from 'next/navigation';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// type TranscriptionDetails = {
//   id: string;
//   name: string;
//   url: string;
//   transcription: string;
//   status: 'pending' | 'processing' | 'completed' | 'failed';
//   talkToListenRatio: string;
//   callDuration: string;
//   longestRepMonologue: string;
//   questionRate: number;
//   objectionCount: number;
//   speechRateWPM: number;
//   objectionHandlingEffectivenessScore: number;
//   callPerformanceScore: number;
//   objectionTypeDistribution: { [key: string]: number };
//   fillerWordFrequency: { [key: string]: number };
//   strengthsHighlight: string[];
//   areasForImprovement: string[];
// };

// const fetcher = (url: string) => fetch(url).then((res) => res.json());

// // Helper component for displaying key metrics
// function MetricCard({ title, value }: { title: string; value: string | number | undefined }) {
//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
//       </CardHeader>
//       <CardContent>
//         <p className="text-2xl font-bold">{value || 'N/A'}</p>
//       </CardContent>
//     </Card>
//   );
// }

// export default function TranscriptionDetailPage() {
//   const params = useParams();
//   const { id } = params;

//   const { data: file, error, isLoading } = useSWR<TranscriptionDetails>(
//     id ? `/api/transcriptions/${id}` : null,
//     fetcher
//   );

//   if (isLoading) return <div>Loading...</div>;
//   if (error) return <div>Failed to load transcription details.</div>;
//   if (!file) return <div>Transcription not found.</div>;

//   const objectionData = file.objectionTypeDistribution
//     ? Object.entries(file.objectionTypeDistribution).map(([name, value]) => ({ name, count: value }))
//     : [];

//   const fillerWordData = file.fillerWordFrequency
//     ? Object.entries(file.fillerWordFrequency).map(([name, value]) => ({ name, count: value }))
//     : [];

//   return (
//     <section className="flex-1 p-4 lg:p-8 space-y-6">
//       <h1 className="text-3xl font-bold">{file.name}</h1>

//       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
//         <MetricCard title="Call Performance Score" value={file.callPerformanceScore} />
//         <MetricCard title="Talk-to-Listen Ratio" value={file.talkToListenRatio} />
//         <MetricCard title="Speech Rate (WPM)" value={file.speechRateWPM} />
//         <MetricCard title="Objection Count" value={file.objectionCount} />
//       </div>

//       <div className="grid gap-4 md:grid-cols-2">
//         <Card>
//           <CardHeader>
//             <CardTitle>Objection Type Distribution</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={objectionData}>
//                 <XAxis dataKey="name" />
//                 <YAxis />
//                 <Tooltip />
//                 <Legend />
//                 <Bar dataKey="count" fill="#ea580c" />
//               </BarChart>
//             </ResponsiveContainer>
//           </CardContent>
//         </Card>
//         <Card>
//           <CardHeader>
//             <CardTitle>Filler Word Frequency</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={fillerWordData}>
//                 <XAxis dataKey="name" />
//                 <YAxis />
//                 <Tooltip />
//                 <Legend />
//                 <Bar dataKey="count" fill="#ea580c" />
//               </BarChart>
//             </ResponsiveContainer>
//           </CardContent>
//         </Card>
//       </div>

//       <div className="grid gap-4 md:grid-cols-2">
//         <Card>
//           <CardHeader>
//             <CardTitle>Strengths</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <ul className="list-disc list-inside space-y-2">
//               {file.strengthsHighlight?.map((strength, index) => (
//                 <li key={index}>{strength}</li>
//               ))}
//             </ul>
//           </CardContent>
//         </Card>
//         <Card>
//           <CardHeader>
//             <CardTitle>Areas for Improvement</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <ul className="list-disc list-inside space-y-2">
//               {file.areasForImprovement?.map((area, index) => (
//                 <li key={index}>{area}</li>
//               ))}
//             </ul>
//           </CardContent>
//         </Card>
//       </div>

//       <Card>
//         <CardHeader>
//           <CardTitle>Full Transcription</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className="prose max-w-none">
//             <p>{file.transcription || 'No transcription available.'}</p>
//           </div>
//         </CardContent>
//       </Card>
//     </section>
//   );
// }

// pages/transcriptions/[id]/page.tsx

'use client';

import useSWR, { useSWRConfig } from 'swr';
import { useParams } from 'next/navigation';
import { useState } from 'react'; // Import useState
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Import Button
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CoachingSession from '@/components/ui/CoachingSession'; // Import the new component
import { Loader2, Trash2  } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Import Avatar
import { User } from '@/lib/db/schema'; // Import the User type

type CommentAuthor = {
  id: number;
  name: string | null;
};

type ManagerComment = {
  id: number;
  content: string;
  createdAt: string;
  author: CommentAuthor;
};

// ... (your existing TranscriptionDetails type)

type TranscriptionDetails = {
  //id: string;
  id: number;
  name: string;
  url: string;
  transcription: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  talkToListenRatio: string;
  callDuration: string;
  longestRepMonologue: string;
  questionRate: number;
  objectionCount: number;
  speechRateWPM: number;
  objectionHandlingEffectivenessScore: number;
  callPerformanceScore: number;
  objectionTypeDistribution: { [key: string]: number };
  fillerWordFrequency: { [key: string]: number };
  strengthsHighlight: string[];
  areasForImprovement: string[];
  comments: ManagerComment[]; // Add the comments array
};


const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Helper component for displaying key metrics
function MetricCard({ title, value }: { title: string; value: string | number | undefined }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value || 'N/A'}</p>
      </CardContent>
    </Card>
  );
}


// --- Start of Fix: New component for adding a comment ---
function AddCommentForm({ fileId, onCommentAdded }: { fileId: number; onCommentAdded: () => void }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FIX: Added type for the event parameter
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptionFileId: fileId, content }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to post comment.');
      }
      
      setContent('');
      onCommentAdded(); // Trigger SWR re-fetch in parent

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        value={content}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
        placeholder="Write your feedback here..."
        rows={4}
        disabled={isSubmitting}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={isSubmitting || !content.trim()}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Add Comment
      </Button>
    </form>
  );
}


export default function TranscriptionDetailPage() {
  const params = useParams();
  //const { id } = params;
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { mutate } = useSWRConfig();
  // FIX: Fetch the current user's data to check their role
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const isManager = user?.role === 'owner';

  // State to control the coaching session modal
  const [isCoachingOpen, setIsCoachingOpen] = useState(false);
  const [isStartingCoaching, setIsStartingCoaching] = useState(false);
  const [coachingError, setCoachingError] = useState<string | null>(null);

  const { data: file, error, isLoading } = useSWR<TranscriptionDetails>(
    id ? `/api/transcriptions/${id}` : null,
    fetcher
  );

  // --- Start of The Fix: Create the handler function ---
  const handleStartCoaching = async () => {
    setIsStartingCoaching(true);
    setCoachingError(null);

    try {
      const response = await fetch('/api/coaching/start', {
        method: 'POST',
      });

      // If the API returns an error (like 403 Forbidden), handle it
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start coaching session.');
      }

      // If successful, open the modal
      setIsCoachingOpen(true);

    } catch (err: any) {
      setCoachingError(err.message);
    } finally {
      setIsStartingCoaching(false);
    }
  };
  // --- End of The Fix ---


  const handleDeleteComment = async (commentId: number) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete comment.');
      }
      // On success, re-fetch the transcription data to update the UI
      mutate(`/api/transcriptions/${id}`);
    } catch (err) {
      console.error(err);
      alert(err); // Simple error handling
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Failed to load transcription details.</div>;
  if (!file) return <div>Transcription not found.</div>;

  const objectionData = file.objectionTypeDistribution
    ? Object.entries(file.objectionTypeDistribution).map(([name, value]) => ({ name, count: value }))
    : [];

  const fillerWordData = file.fillerWordFrequency
    ? Object.entries(file.fillerWordFrequency).map(([name, value]) => ({ name, count: value }))
    : [];

  return (
    <>
      <section className="flex-1 p-4 lg:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{file.name}</h1>

          {/* THIS IS THE NEW BUTTON */}
          {/* <Button onClick={() => setIsCoachingOpen(true)} size="lg">
            Start Live Coaching
          </Button> */}

          {/* --- Start of The Fix: Update the button --- */}
          <div className="text-right">
            <Button onClick={handleStartCoaching} size="lg" disabled={isStartingCoaching}>
              {isStartingCoaching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking limit...
                </>
              ) : (
                'Start Live Coaching'
              )}
            </Button>
            {coachingError && (
              <p className="text-sm text-red-500 mt-2">{coachingError}</p>
            )}
          </div>
          {/* --- End of The Fix --- */}





        </div>

        {/* MOVED AUDIO PLAYER CARD HERE */}
        {file.url && file.status === 'completed' && (
          <Card>
            <CardHeader>
              <CardTitle>Media Player</CardTitle>
            </CardHeader>
            <CardContent>
              <audio controls src={file.url} className="w-full">
                Your browser does not support the audio element.
              </audio>
            </CardContent>
          </Card>
        )}

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
         <MetricCard title="Call Performance Score" value={file.callPerformanceScore} />
         <MetricCard title="Talk-to-Listen Ratio" value={file.talkToListenRatio} />
         <MetricCard title="Speech Rate (WPM)" value={file.speechRateWPM} />
         <MetricCard title="Objection Count" value={file.objectionCount} />
      </div>

       <div className="grid gap-4 md:grid-cols-2">
         <Card>
           <CardHeader>
             <CardTitle>Objection Type Distribution</CardTitle>
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
             <CardTitle>Filler Word Frequency</CardTitle>
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

       <div className="grid gap-4 md:grid-cols-2">
         <Card>
           <CardHeader>
             <CardTitle>Strengths</CardTitle>
           </CardHeader>
           <CardContent>
             <ul className="list-disc list-inside space-y-2">
               {file.strengthsHighlight?.map((strength, index) => (
                <li key={index}>{strength}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Areas for Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              {file.areasForImprovement?.map((area, index) => (
                <li key={index}>{area}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* --- Start of Fix: Manager Comments Section --- */}
      <Card>
          <CardHeader>
            <CardTitle>Manager Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {file.comments.length > 0 ? (
              <ul className="space-y-4">
                {file.comments.map((comment) => (
                  <li key={comment.id} className="flex items-start space-x-4">
                    <Avatar>
                      <AvatarFallback>{comment.author.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">{comment.author.name}</p>
                        {isManager && user.id === comment.author.id && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteComment(comment.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</p>
                      <p className="mt-2">{comment.content}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No feedback yet.</p>
            )}

            {isManager && (
              <div className="border-t pt-6">
                <AddCommentForm fileId={file.id} onCommentAdded={() => mutate(`/api/transcriptions/${id}`)} />
              </div>
            )}
          </CardContent>
        </Card>
        {/* --- End of Fix --- */}

      <Card>
        <CardHeader>
          <CardTitle>Full Transcription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p>{file.transcription || 'No transcription available.'}</p>
          </div>
        </CardContent>
      </Card>
    </section>
        {/* --- Coaching Modal --- */}
        <CoachingSession
        isOpen={isCoachingOpen}
        onClose={() => setIsCoachingOpen(false)}
        analyticsData={file}
      />
    </>
  );
}