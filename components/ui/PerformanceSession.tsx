// 'use client';

// import { useState } from 'react';
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogFooter,
// } from '@/components/ui/dialog'; // Make sure paths are correct
// import { Button } from '@/components/ui/button'; // Make sure paths are correct
// import LiveAudioComponent from '../live-transcription-audio-component'; // Path to your existing component
// import { summarizeConversation } from '@/lib/summarize'; // We will create this next
// import { Loader2 } from 'lucide-react'; // For the loading spinner

// // Define the structure for a single utterance in the transcript
// type TranscriptEntry = {
//   speaker: 'user' | 'ai';
//   text: string;
// };

// // Define a type for the initial analytics data
// // This should match the data you'll eventually pass in
// type SalesSprintDetails = {

//   sprintName?: string | null;
//   startDate?: Date | null;
//   endDate?: Date | null;
//   goals?: { [key: string]: number } | null;
//   outcome?: { [key: string]: number } | null;
  
// };

// // Define the props for our component
// interface CoachingSessionProps {
//   isOpen: boolean;
//   onClose: () => void;
//   SalesSprintData: SalesSprintDetails;
// }

// /**
//  * Constructs a detailed prompt for the AI sales coach.
//  * This function prepares the initial instructions for the LiveAudioComponent.
//  */
// function buildCoachingPrompt(data: SalesSprintDetails): string {
//   const format = (value: any) => (value !== null && value !== undefined ? value : 'N/A');

//   const formatArray = (arr: string[] | null | undefined): string => {
//     if (!arr || arr.length === 0) return 'None identified.';
//     return arr.map((item) => `- ${item}`).join('\n');
//   };
//   const formatObject = (obj: { [key: string]: number } | null | undefined): string => {
//     if (!obj || Object.keys(obj).length === 0) return 'None recorded.';
//     return Object.entries(obj)
//       .map(([key, value]) => `- ${key}: ${value}`)
//       .join('\n');
//   };

//   return `
//     ### AI Persona and Mission ###
//     You are "Orus," an expert, encouraging, and insightful sales coach. Your mission is to analyze sales perfromance data and provide actionable coaching to a sales representative. Your tone is supportive and Socratic; you guide them to their own conclusions by asking thoughtful questions.

//     ### Core Task ###
//     You have been provided with the initial goals and perfromance analytics from the most recent sales sprint. Your first task is to synthesize this information. When the user starts the conversation, you will:
//     1.  Provide a brief, one-sentence summary of your overall assessment of the call.
//     2.  Ask one specific, open-ended question related to a key metric or a moment in the transcript to kick off the coaching conversation.
//     3.  From that point on, engage in a live, spoken dialogue, responding to the user's answers and coaching them based on the data below.

//     ### Sales Sprint Data ###
//     - **Sales Sprint Name:** ${format(data.sprintName)}/10
//     - **Start Date of Sales Sprint:** ${format(data.startDate)}
//     - **End Date of Sales Sprint:** ${format(data.endDate)}
//     - **Initial Goals of the Sales Sprint:**
//     ${formatObject(data.goals)}
//     - **Actural Outcome of the Sales Sprint:**
//     ${formatObject(data.outcome)}

//     Now, prepare your opening statement and first question. Wait for the user to speak.
//   `;
// }

// export default function CoachingSession({ isOpen, onClose, SalesSprintData }: CoachingSessionProps) {
//   // State to hold the growing transcript of the conversation
//   const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
//   // State to track if the live session has ended to switch the view
//   const [sessionEnded, setSessionEnded] = useState(false);
//   // State to show a loading indicator while the summary is being generated
//   const [isSummarizing, setIsSummarizing] = useState(false);
//   // State to hold the final summary text
//   const [summary, setSummary] = useState('');
//   // State for any potential errors during summarization
//   const [error, setError] = useState('');

//   // Generate the initial prompt for the AI coach
//   const coachingPrompt = buildCoachingPrompt(SalesSprintData);

//   // This is the callback function passed to LiveAudioComponent.
//   // It receives each piece of transcript and adds it to our state.
//   const handleTranscriptUpdate = (newEntry: TranscriptEntry) => {
//     setTranscript((prevTranscript) => [...prevTranscript, newEntry]);
//   };

//   // This function is called when the user clicks "End Session"
//   const handleEndSession = async () => {
//     setSessionEnded(true);
//     setIsSummarizing(true);
//     setError('');

//     try {
//       // Pass the complete, collected transcript to the summarization utility
//       const summaryText = await summarizeConversation(transcript);
//       setSummary(summaryText);
//     } catch (err) {
//       console.error('Summarization failed:', err);
//       setError('Could not generate the session summary. Please try again.');
//     } finally {
//       setIsSummarizing(false);
//     }
//   };
  
//   // This function resets all state when the dialog is fully closed
//   const handleDialogClose = () => {
//     setTranscript([]);
//     setSessionEnded(false);
//     setIsSummarizing(false);
//     setSummary('');
//     setError('');
//     onClose(); // Call the parent's onClose function
//   }

//   if (!isOpen) {
//     return null;
//   }

//   return (
//     <Dialog open={isOpen} onOpenChange={handleDialogClose}>
//       <DialogContent className="sm:max-w-3xl min-h-[70vh] flex flex-col">
//         <DialogHeader>
//           <DialogTitle>
//             {sessionEnded ? 'Coaching Session Summary' : 'Live Sales Coaching Session'}
//           </DialogTitle>
//           {!sessionEnded && (
//             <DialogDescription>
//               Your AI coach 'Orus' is ready. Press the record button to start the conversation.
//             </DialogDescription>
//           )}
//         </DialogHeader>

//         <div className="flex-1 flex flex-col">
//           {!sessionEnded ? (
//             // VIEW 1: Live Session is Active
//             <div className="w-full h-[500px] relative mt-4 rounded-lg overflow-hidden border">
//               <LiveAudioComponent 
//                 prompt={coachingPrompt}
//                 onTranscriptUpdate={handleTranscriptUpdate} 
//               />
//             </div>
//           ) : (
//             // VIEW 2: Session Ended, show Summary/Loading state
//             <div className="w-full flex-1 mt-4 rounded-lg p-4 border bg-gray-50/50 overflow-y-auto">
//               {isSummarizing ? (
//                 <div className="flex flex-col items-center justify-center h-full text-gray-500">
//                   <Loader2 className="h-8 w-8 animate-spin" />
//                   <p className="mt-4">Analyzing conversation and generating your notes...</p>
//                 </div>
//               ) : error ? (
//                   <div className="text-red-600 p-4 bg-red-100 rounded-md">{error}</div>
//               ) : (
//                   <div 
//                     className="prose prose-sm max-w-none" 
//                     dangerouslySetInnerHTML={{ __html: summary }} 
//                   />
//               )}
//             </div>
//           )}
//         </div>

//         <DialogFooter className="mt-4">
//           {!sessionEnded ? (
//             <Button variant="destructive" onClick={handleEndSession} disabled={transcript.length === 0}>
//               End Session & Generate Notes
//             </Button>
//           ) : (
//             <Button onClick={handleDialogClose}>
//               Close
//             </Button>
//           )}
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }



















// // components/ui/PerformanceSession.tsx
// 'use client';

// import { useState, useCallback, useMemo, useEffect } from 'react';
// import { format } from 'date-fns';
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogFooter,
// } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';
// import LiveAudioComponent from '@/components/live-transcription-audio-component';
// import { summarizeAndAnalyzeConversation, CoachingAnalysis } from '@/lib/summarize';
// import { Loader2 } from 'lucide-react';

// type TranscriptEntry = {
//   speaker: 'user' | 'ai';
//   text: string;
// };

// type SalesSprintDetails = {
//   sprintName?: string | null;
//   startDate?: Date | null;
//   endDate?: Date | null;
//   goals?: { [key: string]: any } | null;
//   outcome?: { [key: string]: any } | null;
// };

// interface CoachingSessionProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onSaveComplete: () => void;
//   sprintId: string;
//   salesSprintData: SalesSprintDetails;
// }

// function buildCoachingPrompt(data: SalesSprintDetails): string {
//   const formatValue = (value: any) => (value !== null && value !== undefined ? value : 'N/A');
//   const formatObject = (obj: { [key: string]: any } | null | undefined): string => {
//     if (!obj || Object.keys(obj).length === 0) return 'None recorded.';
//     return Object.entries(obj)
//       .map(([key, value]) => `- ${key}: ${value}`)
//       .join('\n');
//   };
  
//   const formattedStartDate = data.startDate ? format(data.startDate, 'PPP') : 'N/A';
//   const formattedEndDate = data.endDate ? format(data.endDate, 'PPP') : 'N/A';

//   return `
// ### AI Persona and Mission ###
// You are "Orus," an expert, encouraging, and insightful sales coach. Your mission is to hold a conversation with a sales representative about their latest sales sprint, understand what went well and what didn't, and provide actionable feedback. Your tone is supportive and Socratic; you guide them to their own conclusions by asking thoughtful questions.

// ### Core Task ###
// You have been provided with the initial goals and final outcomes from their most recent sales sprint. Your first task is to synthesize this information. When the user starts the conversation, you will:
// 1. Provide a brief, one-sentence summary of your overall assessment of their performance based on the data.
// 2. Ask one specific, open-ended question related to a key metric (e.g., "I noticed you exceeded the 'Demos Scheduled' goal. What do you think was the key to that success?") to kick off the coaching conversation.
// 3. From that point on, engage in a live, spoken dialogue, responding to the user's answers and coaching them based on the data below.

// ### Sales Sprint Data ###
// - **Sales Sprint Name:** ${formatValue(data.sprintName)}
// - **Start Date of Sales Sprint:** ${formattedStartDate}
// - **End Date of Sales Sprint:** ${formattedEndDate}
// - **Sprint Goals:**
// ${formatObject(data.goals)}
// - **Sprint Outcomes:**
// ${formatObject(data.outcome)}

// Now, prepare your opening statement and first question. Wait for the user to speak.
//   `;
// }

// export default function CoachingSession({ 
//   isOpen, 
//   onClose, 
//   onSaveComplete, 
//   sprintId, 
//   salesSprintData 
// }: CoachingSessionProps) {
//   const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
//   const [sessionEnded, setSessionEnded] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [summary, setSummary] = useState('');
//   const [error, setError] = useState('');

//   // --- STEP 1: ADD A USEEFFECT TO LOG TRANSCRIPT CHANGES ---
//   // This will definitively tell us if the state is updating.
//   useEffect(() => {
//     console.log('[PerformanceSession] Transcript state updated:', transcript);
//   }, [transcript]);

//   const coachingPrompt = useMemo(() => {
//     return buildCoachingPrompt(salesSprintData);
//   }, [salesSprintData]);

//   // --- STEP 2: FIX THE CALLBACK AND ADD LOGGING ---
//   const handleTranscriptUpdate = useCallback((newEntry: TranscriptEntry) => {
//     console.log('[PerformanceSession] handleTranscriptUpdate received:', newEntry);
    
//     if (!newEntry || !newEntry.speaker || !newEntry.text) {
//       console.error('[PerformanceSession] Invalid transcript entry received:', newEntry);
//       return;
//     }

//     setTranscript((prevTranscript) => [...prevTranscript, newEntry]);
//   }, []); // Keep the empty dependency array for now, but the logging will confirm if it's the issue. A better fix might be to remove it.


//   const handleEndSession = async () => {
//     if (transcript.length < 2) {
//       setError('Please have a longer conversation before ending the session. Need at least 2 exchanges.');
//       return;
//     }
//     setSessionEnded(true);
//     setIsProcessing(true);
//     setError('');

//     try {
//       const analysis: CoachingAnalysis = await summarizeAndAnalyzeConversation(transcript);
//       const displaySummary = `
//         <h3>Strengths Discussed</h3>
//         <ul>${analysis.strengths.map((s: string) => `<li>${s}</li>`).join('')}</ul>
//         <h3>Areas for Improvement</h3>
//         <ul>${analysis.areasForImprovement.map((a: string) => `<li>${a}</li>`).join('')}</ul>
//         <p><strong>Overall Assessment:</strong> ${analysis.summary}</p>
//         <p><strong>Performance Score:</strong> ${analysis.performanceScore}/10</p>
//       `;
//       setSummary(displaySummary);
      
//       const response = await fetch(`/api/sprints/${sprintId}/coaching`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(analysis),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.error || 'Failed to save the coaching analysis.');
//       }
//       onSaveComplete();
//     } catch (err: any) {
//       setError(`An error occurred: ${err.message}. You can close this window and try again.`);
//     } finally {
//       setIsProcessing(false);
//     }
//   };
  
//   const handleDialogClose = (open: boolean) => {
//     if (!open) {
//       setTranscript([]);
//       setSessionEnded(false);
//       setIsProcessing(false);
//       setSummary('');
//       setError('');
//       onClose();
//     }
//   };
  
//   useEffect(() => {
//     if (isOpen) {
//       console.log('[PerformanceSession] Dialog opened. Resetting transcript.');
//       setTranscript([]);
//       setError('');
//       setSessionEnded(false);
//       setSummary('');
//       setIsProcessing(false);
//     }
//   }, [isOpen]);

//   const canEndSession = transcript.length >= 2;

//   return (
//     <Dialog open={isOpen} onOpenChange={handleDialogClose}>
//       <DialogContent className="sm:max-w-3xl min-h-[70vh] flex flex-col">
//         <DialogHeader>
//           <DialogTitle>
//             {sessionEnded ? 'Coaching Session Analysis' : 'Live Sales Coaching Session'}
//           </DialogTitle>
//           {!sessionEnded && (
//             <DialogDescription>
//               Your AI coach 'Orus' is ready. Start the conversation to review your sprint performance.
//             </DialogDescription>
//           )}
//         </DialogHeader>

//         <div className="flex-1 flex flex-col">
//           {!sessionEnded ? (
//             <>
//               {/* This debug panel will now be much more useful */}
//               <div className="text-xs bg-blue-50 border border-blue-200 p-3 rounded mb-4 space-y-1">
//                 <div><strong>Debug Info:</strong></div>
//                 <div>Transcript entries: {transcript.length}</div>
//                 <div>Can end session: {canEndSession ? 'Yes' : 'No'}</div>
//                 <div>Dialog open: {isOpen ? 'Yes' : 'No'}</div>
//               </div>
              
//               <div className="w-full h-[500px] relative rounded-lg overflow-hidden border">
//                 {/* We need to ensure LiveAudioComponent gets the updated callback */}
//                 <LiveAudioComponent 
//                   prompt={coachingPrompt}
//                   onTranscriptUpdate={handleTranscriptUpdate}
//                 />
//               </div>
//             </>
//           ) : (
//             <div className="w-full flex-1 mt-4 rounded-lg p-4 border bg-gray-50/50 overflow-y-auto">
//               {isProcessing ? (
//                 <div className="flex flex-col items-center justify-center h-full text-gray-500">
//                   <Loader2 className="h-8 w-8 animate-spin" />
//                   <p className="mt-4">Analyzing conversation and saving your analysis...</p>
//                 </div>
//               ) : error ? (
//                 <div className="text-red-600 p-4 bg-red-100 rounded-md">{error}</div>
//               ) : (
//                 <div 
//                   className="prose prose-sm max-w-none" 
//                   dangerouslySetInnerHTML={{ __html: summary }} 
//                 />
//               )}
//             </div>
//           )}
//         </div>

//         <DialogFooter className="mt-4">
//           {!sessionEnded ? (
//             <div className="flex items-center justify-between w-full">
//               <div className="text-xs text-gray-500">
//                 {transcript.length < 2 ? 
//                   `Need ${2 - transcript.length} more conversation exchanges to enable analysis` : 
//                   'Ready for analysis'
//                 }
//               </div>
//               <Button 
//                 variant="destructive" 
//                 onClick={handleEndSession} 
//                 disabled={!canEndSession}
//                 className={!canEndSession ? 'opacity-50 cursor-not-allowed' : ''}
//               >
//                 End Session & Save Analysis
//                 <span className="ml-2 text-xs">
//                   ({transcript.length}/2)
//                 </span>
//               </Button>
//             </div>
//           ) : (
//             <Button onClick={() => handleDialogClose(false)}>
//               Close
//             </Button>
//           )}
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }





'use client';

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import LiveAudioComponent from '@/components/live-transcription-audio-component';
// --- REMOVED: No longer call summarize directly from the client ---
// import { summarizeAndAnalyzeConversation, CoachingAnalysis } from '@/lib/summarize';
import { Loader2 } from 'lucide-react';

// Define the type here since we're not importing it anymore
export type CoachingAnalysis = {
    summary: string;
    strengths: string[];
    areasForImprovement: string[];
    performanceScore: number;
};


type SalesSprintDetails = {
  sprintName?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  goals?: { [key: string]: any } | null;
  outcome?: { [key: string]: any } | null;
};

interface CoachingSessionProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveComplete: () => void;
  sprintId: string;
  salesSprintData: SalesSprintDetails;
}

// (buildCoachingPrompt function remains the same)
function buildCoachingPrompt(data: SalesSprintDetails, salesManual: string | null): string {
    const formatValue = (value: any) => (value !== null && value !== undefined ? value : 'N/A');
    const formatObject = (obj: { [key:string]: any } | null | undefined): string => {
      if (!obj || Object.keys(obj).length === 0) return 'None recorded.';
      return Object.entries(obj)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n');
    };
    const formattedStartDate = data.startDate ? format(data.startDate, 'PPP') : 'N/A';
    const formattedEndDate = data.endDate ? format(data.endDate, 'PPP') : 'N/A';
//     return `
//   ### AI Persona and Mission ###
//   You are "AurahSell," an expert, encouraging, and insightful sales coach and Manager. Your mission is to review a sales representative latest sales sprint, understand what went well and what didn't, and provide actionable feedback. Your tone is supportive and Socratic.
//   You are to use your knowledge of the sales process, sales techniques, sales psychology, sales communication, sales objections, sales principles, sales strategies and the Company Sales Manual & Principles as well as the sales sprint data to provide constructive coaching to the sales representative.
//   Your goal is to help the sales representative understand their performance and identify what went well and what didn't and provide clear steps for improvement.
//   You are to provide feedback for at least 4 key areas of the sales performance sprint. be very detailed in your feedback and use the knowledge and principles and the Company Sales Manual & Principles to support your feedback. Do not give generic feedback, give specific feedback based on the data and the transcript. be brutally honest in your feedback.
//   You are to ensure that the sales representative is on track to achieve their goals and that they are making progress towards their goals.
//   You are to ensure that the sales representative is using the Company Sales Manual & Principles to improve their performance.
//   You are to ensure that the sales representative is using the sales knowledge and principles to improve their performance.
//   You are to ensure that the sales representative is using the sales techniques and strategies to improve their performance.
//   You are to ensure that the sales representative is using the sales psychology to improve their performance.
//   You are to ensure that the sales representative is using the sales communication to improve their performance.
//   You are to ensure that the sales representative is using the sales objections to improve their performance.
//   You are to ensure that the sales representative is using the sales principles to improve their performance.
//   You are to ensure that the sales representative is using the sales strategies to improve their performance.

//   ### Core Task ###
//   You have been provided with the initial goals and final outcomes from their most recent sales sprint. Your first task is to synthesize this information. When the user starts the conversation, you will:
//   1. Provide a brief, one-sentence summary of your overall assessment of their performance based on the data.
//   2. Ask one specific, open-ended question related to a key metric (e.g., "I noticed you exceeded the 'Demos Scheduled' goal. What do you think was the key to that success?") to kick off the coaching conversation.
//   3. From that point on, engage in a live, spoken dialogue, responding to the user's answers and coaching them based on the data below aswell as the sales knowledge and principles.
//   4.  Give your detailed feedback for at least 4 key areas of the sales performance sprint. be very detailed in your feedback and use the knowledge and principles to support your feedback. Do not give generic feedback, give specific feedback based on the data and the sprint data. be brutally honest in your feedback.
  
//   ### Sales Sprint Data ###
//   - **Sales Sprint Name:** ${formatValue(data.sprintName)}
//   - **Start Date of Sales Sprint:** ${formattedStartDate}
//   - **End Date of Sales Sprint:** ${formattedEndDate}
//   - **Sprint Goals:**
//   ${formatObject(data.goals)}
//   - **Sprint Outcomes:**
//   ${formatObject(data.outcome)}


//   ### Sales Knowledge and Principles ###

// Fundamental Sales Principles:
//   Before diving into specific techniques, it's crucial to grasp the core tenets that underpin all successful sales interactions. These principles are the foundation upon which lasting customer relationships and consistent results are built.
//   Selling is a Mutual Exchange of Value: At its heart, selling is not about convincing someone to buy something they don't need. It's about creating value for the customer by solving a problem or fulfilling a desire, and in return, receiving value for your solution. This customer-centric mindset is the cornerstone of ethical and effective selling.
//   Trust is the Currency of Sales: People buy from those they know, like, and trust. Building rapport and establishing trust from the very first interaction is paramount. This is achieved through honesty, transparency, and a genuine interest in the customer's needs.
//   Integrity Above All: Selling with integrity means prioritizing the customer's best interests, even if it means walking away from a sale that isn't a good fit. This approach not only builds a strong reputation but also fosters long-term customer loyalty.
//   Focus on the Customer, Not the Commission: While sales is a results-driven profession, an unwavering focus on the customer's needs and challenges will ultimately lead to greater success. Understand their pain points and position your product or service as the ideal solution. According to research, 86% of buyers are more inclined to make a purchase when they feel the sales representative has taken the time to understand their goals.

// Understanding the Sales Process:
//     A well-defined sales process provides a repeatable framework that guides a potential customer from initial awareness to a loyal client. While the specifics may vary by industry, the core stages remain consistent.
//     The 7 Key Stages of the Sales Process:
//       Prospecting and Lead Generation: This initial stage involves identifying potential customers who fit your target market. This can be done through various methods, including researching target industries, sourcing contact information, and utilizing networking events.[5]
//       Preparation and Qualification: Before reaching out, research your prospects to understand their business and potential needs.[6][7][8] The goal is to qualify them, ensuring they have a genuine need for your product and the ability to purchase it.[8][9]
//       The Approach: This is your first contact with the prospect. The objective is to build rapport and set the stage for a more in-depth conversation.[8] A common goal is to secure a meeting rather than making an immediate sales pitch.[10]
//       Presentation and Demonstration: Here, you present your product or service as a solution to the prospect's specific problems.[8][9] Tailor your presentation to their unique needs and focus on the value and benefits they will receive.
//       Handling Objections: Objections are a natural part of the sales process and should be viewed as opportunities to learn more about the customer's concerns.[11] Be prepared to address common objections related to price, timing, and competition.[11][12]
//       Closing the Sale: This is the stage where you ask for the business.[8] It's crucial to involve the right decision-makers and address any final concerns.[8]
//       Follow-up and Nurturing: After the sale, follow up to ensure customer satisfaction and build a long-term relationship.[3][8] This can lead to repeat business and valuable referrals.

// Understanding Why People Buy:
//   Top-performing salespeople understand that buying decisions are often driven by emotion and justified by logic. Tapping into the psychological drivers behind purchasing can significantly increase your effectiveness.
//   The Power of Mindset: A salesperson's self-concept and belief in their product are critical to success.[13][14] A positive mindset helps in overcoming the fear of rejection and building unshakeable confidence.[15][16]
//   Fear of Loss vs. Desire for Gain: People are often more motivated by the fear of losing something than the desire to gain something.[17] Highlighting what a prospect stands to lose by not adopting your solution can be a powerful motivator.
//   Meeting Core Human Needs: Every purchase is an attempt to satisfy a fundamental human need, such as the desire for security, status, or recognition.[17] By understanding which of these needs your product fulfills, you can tailor your messaging to resonate on a deeper level.[17]
//   The Principle of Reciprocity: When you provide value upfront, whether through information, a demo, or a small concession, people are more likely to feel obligated to reciprocate.
//   The Importance of Social Proof: People are heavily influenced by the actions of others. Using testimonials, case studies, and highlighting well-known clients can build credibility and trust.[18]

// Mastering Sales Communication:
//   Effective communication is the lifeblood of sales. It's not just about what you say, but how you say it and, more importantly, how well you listen.[19]
//   Key Communication Skills for Sales Reps:
//   Active Listening: This is more than just hearing words; it's about understanding the meaning and emotion behind them. Pay attention to both verbal and non-verbal cues, nod, and summarize what you've heard to show you're engaged.[2][20] Salespeople should aim for the customer to do 70% of the talking.[21]
//   Asking Open-Ended Questions: These are questions that can't be answered with a simple "yes" or "no." They encourage the prospect to share more information about their needs, challenges, and goals.[2]
//   Building Rapport: Find common ground and be authentic in your interactions.[2][3] People are more likely to buy from someone they genuinely like and connect with.
//   Clarity and Conciseness: Avoid jargon and communicate your message in a clear and straightforward manner.
//   Non-Verbal Communication: Your body language, tone of voice, and eye contact play a significant role in how your message is received.[20] Project confidence and enthusiasm.[19]
//   Empathy: The ability to understand and share the feelings of your prospect is a powerful tool for building trust and rapport.[21]

// Overcoming Sales Objections:
//   Objections are not rejections; they are requests for more information. A well-prepared salesperson can effectively address concerns and move the sale forward.
//   A Framework for Handling Objections:
//     Listen and Acknowledge: Hear the prospect out completely without interrupting. Thank them for sharing their concern to build rapport.[23]
//     Understand and Clarify: Ask open-ended questions to fully understand the root of the objection.
//     Validate Their Concern: Show empathy and let them know you understand their perspective.
//     Respond and Reframe: Address the objection with a clear and concise answer. Reframe the issue in a positive light, focusing on the value and benefits of your solution.[10]
//     Confirm Understanding: Ensure your response has satisfied their concern and that you are both on the same page.

//   Common Sales Objections and How to Respond:
//     "It's too expensive." Focus on the value and return on investment, not just the price.
//     "We're already working with someone else." Highlight your unique value proposition and what differentiates you from the competition.[12]
//     "Now's not a good time." Investigate the reason for the timing issue and propose a logical next step for the future.
//     "I need to talk to my team." Offer to provide materials or even a joint presentation to help them communicate the value to their team.[18]

// Effective Sales Techniques and Strategies:
//   Beyond the fundamentals, specific techniques and strategic approaches can give you a competitive edge.
//   Proven Sales Techniques:
//     Be Systematic with Lead Generation: Ensure a consistent flow of new business opportunities.
//     Actively Seek Referrals: Your best source of new business is often satisfied customers.
//     Focus on Securing Appointments: The initial goal of many interactions is to get a meeting, not to close a deal on the first call.[10]
//     Master the Follow-Up: Persistence is key. Stay in touch with prospects to ensure they are happy and to explore future opportunities.[3]
//   Strategic Selling Approaches:
//     Strategic Selling: This methodology focuses on a deep understanding of the customer's needs and building long-term, mutually beneficial relationships. It's particularly effective in complex B2B sales with multiple decision-makers.
//     Conceptual Selling: This approach centers on understanding the buyer's "concept" of a solution rather than just pitching a product's features.
//     The Miller Heiman Framework: This structured approach involves identifying key stakeholders within the customer's organization, such as the Economic Buyer, User Buyer, and Technical Buyer, and tailoring the sales strategy to each.


//      ### Company Sales Manual & Principles ###
//   You MUST use the following sales manual as the primary source of truth for this company's specific sales process, policies, and techniques. Refer to it when identifying where the sales representative deviated from the company's best practices or where they could have applied a specific script or technique from the manual. Your feedback should align with the principles laid out in this document.
//   ---
//   ${formatValue(salesManual)}
//   ---

//   Now, prepare your opening statement and first question. Wait for the user to speak.
//     `;

  return `
    1. Language Specification
        RESPOND IN English. YOU MUST RESPOND UNMISTAKABLY IN English.
    
    2. Persona
        You are "AurahSell," an expert, insightful, and encouraging sales coach and manager. Your tone is supportive and Socratic—you guide by asking thoughtful questions, but you are also direct and candid with feedback. Your ultimate mission is to review a sales representative's recent sprint, help them understand their performance, and co-create an actionable plan for improvement. You are a master of sales psychology, strategy, and communication, and you ground all of your feedback in data and established principles.
        
    3. Conversational Rules
        Follow this conversational workflow in the specified order.
            Step 1: Introduction & Opening Assessment
                  Warmly greet the sales representative by name.
                  Provide a brief, one-sentence summary of your overall assessment of their sprint performance based on the provided data.
                  Immediately ask one specific, open-ended Socratic question related to a key metric from their sprint data to initiate the dialogue. For example, "I noticed a significant gap between your 'Leads Contacted' and 'Demos Scheduled'. Can you walk me through what you think was happening there?"
            Step 2: Guided Discovery & Analysis (Conversational Loop)
                  Engage in a live, spoken dialogue, using active listening. Your primary technique is to ask probing questions that help the representative analyze their own performance.
                  Guide the conversation to explore at least four key performance areas from the sprint.
                  In your responses, seamlessly integrate concepts from the Sales Knowledge and Principles and the Company Sales Manual to frame your questions and insights. Do not simply state facts from the manuals; use them to support your coaching.
                  Let this conversational loop continue as long as necessary for a thorough analysis.
            Step 3: Summarize Findings & Provide Detailed Feedback
                  After the guided discovery, clearly summarize the 4-5 primary challenges or key successes that were identified during the conversation.
                  For each point, explain why it was a challenge or a success, citing specific data from the sprint and principles from the knowledge bases.
                  For each challenge, provide 3-5 concrete, actionable strategies the representative can use to overcome it. For each success, suggest 3-5 ways they can apply that winning strategy to other areas of their sales process.
            Step 4: Co-create an Improvement Plan
                  Collaboratively define three specific areas for improvement based on the feedback.
                  For each area, provide a detailed, step-by-step guide on how the representative can implement the changes. This plan should be practical and clear.
            Step 5: Set Future Goals & Conclude
                  Propose three new, challenging but achievable goals for the next sales sprint that directly address the areas for improvement.
                  Conclude the session with an encouraging and motivational statement, reinforcing your confidence in their ability to succeed.
        
    4. General Guidelines
        Be Socratic: Your main tool is the question. Guide the user to their own conclusions rather than just listing facts.
        Be Data-Driven: Every piece of feedback must be tied directly to the Sales Sprint Data, the Company Sales Manual, or the Sales Knowledge and Principles. Avoid generic or vague advice.
        Be Concise: Keep your spoken responses focused and to the point. Progressively disclose more detailed information as the conversation flows, rather than delivering long monologues.
        No Repetition: Do not simply repeat what the user has said. Each of your responses should add new value, insight, or a guiding question to the conversation.
    
    5. Guardrails
        If the user becomes defensive: Acknowledge their feelings with empathy (e.g., "I understand why that might be frustrating to hear."). Gently refocus the conversation back to the objective data and their stated goals.
        If the user is hard on themselves: Do not encourage negative self-talk. Reframe their perceived failures as learning opportunities and emphasize progress. Your role is to build confidence, not diminish it.
        Stay in Persona: Do not break character. You are AurahSell, the sales coach. Avoid discussing your nature as an AI.
        
    6. Knowledge Base
        Primary Source of Truth: The Company Sales Manual & Principles is the most important document. Your coaching and feedback must align with its contents. Use it to identify specific deviations from company best practices.
        Supporting Knowledge: Use the Sales Knowledge and Principles to provide broader context, psychological insights, and proven strategies that complement the company manual.
        Factual Basis: All analysis must begin with the Sales Sprint Data. Use the goals and outcomes as the foundation for the entire conversation.
        
        Data and Knowledge Inputs
        Sales Sprint Data:
            Sales Sprint Name: ${formatValue(data.sprintName)}
            Start Date: ${formattedStartDate}
            End Date: ${formattedEndDate}
            Sprint Goals: ${formatObject(data.goals)}
            Sprint Outcomes: ${formatObject(data.outcome)}
        
        Company Sales Manual & Principles:
            ${formatValue(salesManual)}
        Sales Knowledge and Principles:
            Fundamental Sales Principles:
                Before diving into specific techniques, it's crucial to grasp the core tenets that underpin all successful sales interactions. These principles are the foundation upon which lasting customer relationships and consistent results are built.
                Selling is a Mutual Exchange of Value: At its heart, selling is not about convincing someone to buy something they don't need. It's about creating value for the customer by solving a problem or fulfilling a desire, and in return, receiving value for your solution. This customer-centric mindset is the cornerstone of ethical and effective selling.
                Trust is the Currency of Sales: People buy from those they know, like, and trust. Building rapport and establishing trust from the very first interaction is paramount. This is achieved through honesty, transparency, and a genuine interest in the customer's needs.
                Integrity Above All: Selling with integrity means prioritizing the customer's best interests, even if it means walking away from a sale that isn't a good fit. This approach not only builds a strong reputation but also fosters long-term customer loyalty.
                Focus on the Customer, Not the Commission: While sales is a results-driven profession, an unwavering focus on the customer's needs and challenges will ultimately lead to greater success. Understand their pain points and position your product or service as the ideal solution. According to research, 86% of buyers are more inclined to make a purchase when they feel the sales representative has taken the time to understand their goals.

            Understanding the Sales Process:
                A well-defined sales process provides a repeatable framework that guides a potential customer from initial awareness to a loyal client. While the specifics may vary by industry, the core stages remain consistent.
                The 7 Key Stages of the Sales Process:
                  Prospecting and Lead Generation: This initial stage involves identifying potential customers who fit your target market. This can be done through various methods, including researching target industries, sourcing contact information, and utilizing networking events.[5]
                  Preparation and Qualification: Before reaching out, research your prospects to understand their business and potential needs.[6][7][8] The goal is to qualify them, ensuring they have a genuine need for your product and the ability to purchase it.[8][9]
                  The Approach: This is your first contact with the prospect. The objective is to build rapport and set the stage for a more in-depth conversation.[8] A common goal is to secure a meeting rather than making an immediate sales pitch.[10]
                  Presentation and Demonstration: Here, you present your product or service as a solution to the prospect's specific problems.[8][9] Tailor your presentation to their unique needs and focus on the value and benefits they will receive.
                  Handling Objections: Objections are a natural part of the sales process and should be viewed as opportunities to learn more about the customer's concerns.[11] Be prepared to address common objections related to price, timing, and competition.[11][12]
                  Closing the Sale: This is the stage where you ask for the business.[8] It's crucial to involve the right decision-makers and address any final concerns.[8]
                  Follow-up and Nurturing: After the sale, follow up to ensure customer satisfaction and build a long-term relationship.[3][8] This can lead to repeat business and valuable referrals.

            Understanding Why People Buy:
              Top-performing salespeople understand that buying decisions are often driven by emotion and justified by logic. Tapping into the psychological drivers behind purchasing can significantly increase your effectiveness.
              The Power of Mindset: A salesperson's self-concept and belief in their product are critical to success.[13][14] A positive mindset helps in overcoming the fear of rejection and building unshakeable confidence.[15][16]
              Fear of Loss vs. Desire for Gain: People are often more motivated by the fear of losing something than the desire to gain something.[17] Highlighting what a prospect stands to lose by not adopting your solution can be a powerful motivator.
              Meeting Core Human Needs: Every purchase is an attempt to satisfy a fundamental human need, such as the desire for security, status, or recognition.[17] By understanding which of these needs your product fulfills, you can tailor your messaging to resonate on a deeper level.[17]
              The Principle of Reciprocity: When you provide value upfront, whether through information, a demo, or a small concession, people are more likely to feel obligated to reciprocate.
              The Importance of Social Proof: People are heavily influenced by the actions of others. Using testimonials, case studies, and highlighting well-known clients can build credibility and trust.[18]

            Mastering Sales Communication:
              Effective communication is the lifeblood of sales. It's not just about what you say, but how you say it and, more importantly, how well you listen.[19]
              Key Communication Skills for Sales Reps:
              Active Listening: This is more than just hearing words; it's about understanding the meaning and emotion behind them. Pay attention to both verbal and non-verbal cues, nod, and summarize what you've heard to show you're engaged.[2][20] Salespeople should aim for the customer to do 70% of the talking.[21]
              Asking Open-Ended Questions: These are questions that can't be answered with a simple "yes" or "no." They encourage the prospect to share more information about their needs, challenges, and goals.[2]
              Building Rapport: Find common ground and be authentic in your interactions.[2][3] People are more likely to buy from someone they genuinely like and connect with.
              Clarity and Conciseness: Avoid jargon and communicate your message in a clear and straightforward manner.
              Non-Verbal Communication: Your body language, tone of voice, and eye contact play a significant role in how your message is received.[20] Project confidence and enthusiasm.[19]
              Empathy: The ability to understand and share the feelings of your prospect is a powerful tool for building trust and rapport.[21]

            Overcoming Sales Objections:
              Objections are not rejections; they are requests for more information. A well-prepared salesperson can effectively address concerns and move the sale forward.
              A Framework for Handling Objections:
                Listen and Acknowledge: Hear the prospect out completely without interrupting. Thank them for sharing their concern to build rapport.[23]
                Understand and Clarify: Ask open-ended questions to fully understand the root of the objection.
                Validate Their Concern: Show empathy and let them know you understand their perspective.
                Respond and Reframe: Address the objection with a clear and concise answer. Reframe the issue in a positive light, focusing on the value and benefits of your solution.[10]
                Confirm Understanding: Ensure your response has satisfied their concern and that you are both on the same page.

              Common Sales Objections and How to Respond:
                "It's too expensive." Focus on the value and return on investment, not just the price.
                "We're already working with someone else." Highlight your unique value proposition and what differentiates you from the competition.[12]
                "Now's not a good time." Investigate the reason for the timing issue and propose a logical next step for the future.
                "I need to talk to my team." Offer to provide materials or even a joint presentation to help them communicate the value to their team.[18]

            Effective Sales Techniques and Strategies:
              Beyond the fundamentals, specific techniques and strategic approaches can give you a competitive edge.
              Proven Sales Techniques:
                Be Systematic with Lead Generation: Ensure a consistent flow of new business opportunities.
                Actively Seek Referrals: Your best source of new business is often satisfied customers.
                Focus on Securing Appointments: The initial goal of many interactions is to get a meeting, not to close a deal on the first call.[10]
                Master the Follow-Up: Persistence is key. Stay in touch with prospects to ensure they are happy and to explore future opportunities.[3]
              Strategic Selling Approaches:
                Strategic Selling: This methodology focuses on a deep understanding of the customer's needs and building long-term, mutually beneficial relationships. It's particularly effective in complex B2B sales with multiple decision-makers.
                Conceptual Selling: This approach centers on understanding the buyer's "concept" of a solution rather than just pitching a product's features.
                The Miller Heiman Framework: This structured approach involves identifying key stakeholders within the customer's organization, such as the Economic Buyer, User Buyer, and Technical Buyer, and tailoring the sales strategy to each.

  `;
}

export default function CoachingSession({
  isOpen,
  onClose,
  onSaveComplete,
  sprintId,
  salesSprintData
}: CoachingSessionProps) {
  const [manualText, setManualText] = useState<string | null>(null);
  const [isLoadingManual, setIsLoadingManual] = useState(true);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isEndingSession, setIsEndingSession] = useState(false);


  useEffect(() => {
    if (isOpen) {
      // Reset all states when dialog opens
      setError('');
      setSessionEnded(false);
      setSummary('');
      setIsProcessing(false);
      setIsEndingSession(false);
      
      const fetchManual = async () => {
        setIsLoadingManual(true);
        try {
          const response = await fetch('/api/manual/get-manual');
          if (!response.ok) {
            throw new Error('Failed to fetch sales manual.');
          }
          const data = await response.json();
          setManualText(data.manualText);
        } catch (error) {
          console.error('Error fetching sales manual:', error);
          setManualText('The company sales manual could not be loaded.');
        } finally {
          setIsLoadingManual(false);
        }
      };

      fetchManual();
    }
  }, [isOpen]);

  // --- MODIFIED: Generate the prompt only when the manual has been loaded ---
  const coachingPrompt = !isLoadingManual 
    ? buildCoachingPrompt(salesSprintData, manualText) 
    : '';

  // const coachingPrompt = useMemo(() => {
  //   return buildCoachingPrompt(salesSprintData);
  // }, [salesSprintData]);

  const transcribeWithWhisper = async (audioBlob: Blob): Promise<string | null> => {
    if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
        setError('OpenAI API key not found.');
        return null;
    }
    setProcessingMessage('Transcribing conversation with Whisper AI...');
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Whisper API error');
      console.log("Whisper Transcription:", data.text);
      return data.text;
    } catch (err: any) {
      setError(`Transcription failed: ${err.message}`);
      return null;
    }
  };

  const handleConversationEnd = async (audioBlob: Blob) => {
    if (audioBlob.size === 0) {
        setError('No audio was recorded. Please try again.');
        setIsProcessing(false);
        setSessionEnded(false);
        setIsEndingSession(false);
        return;
    }

    const rawTranscript = await transcribeWithWhisper(audioBlob);

    if (rawTranscript) {
        setProcessingMessage('Analyzing transcript...');
        try {
            // --- FIX: Call our new internal API route ---
            const analysisResponse = await fetch('/api/sprints/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transcript: rawTranscript }),
            });

            if (!analysisResponse.ok) {
              const errorData = await analysisResponse.json();
              throw new Error(errorData.error || 'Analysis API failed');
            }

            const analysis: CoachingAnalysis = await analysisResponse.json();

            // The rest of the logic remains the same
            const displaySummary = `
              <h3>Strengths Discussed</h3>
              <ul>${analysis.strengths.map((s: string) => `<li>${s}</li>`).join('')}</ul>
              <h3>Areas for Improvement</h3>
              <ul>${analysis.areasForImprovement.map((a: string) => `<li>${a}</li>`).join('')}</ul>
              <p><strong>Overall Assessment:</strong> ${analysis.summary}</p>
              <p><strong>Performance Score:</strong> ${analysis.performanceScore}/10</p>
            `;
            setSummary(displaySummary);

            const saveResponse = await fetch(`/api/sprints/${sprintId}/coaching`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(analysis),
            });

            if (!saveResponse.ok) {
              const errorData = await saveResponse.json();
              throw new Error(errorData.error || 'Failed to save analysis.');
            }
            onSaveComplete();
        } catch (err: any) {
            setError(`Analysis failed: ${err.message}`);
        }
    }
    setIsProcessing(false);
  };

  const handleEndSessionClick = () => {
    setSessionEnded(true);
    setIsProcessing(true);
    setError('');
    setIsEndingSession(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setSessionEnded(false);
      setIsProcessing(false);
      setSummary('');
      setError('');
      setIsEndingSession(false);
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      console.log('[PerformanceSession] Dialog opened. Resetting state.');
      setError('');
      setSessionEnded(false);
      setSummary('');
      setIsProcessing(false);
      setIsEndingSession(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-3xl min-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {sessionEnded ? 'Coaching Session Analysis' : 'Live Sales Coaching Session'}
          </DialogTitle>
          {!sessionEnded && (
            <DialogDescription>
              Your conversation with Orus is being recorded for analysis.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 flex flex-col">
          {!sessionEnded ? (
            <div className="w-full h-[500px] relative rounded-lg overflow-hidden border">
              <LiveAudioComponent
                prompt={coachingPrompt}
                onConversationEnd={handleConversationEnd}
                isEnding={isEndingSession}
              />
            </div>
          ) : (
            <div className="w-full flex-1 mt-4 rounded-lg p-4 border bg-gray-50/50 overflow-y-auto">
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="mt-4">{processingMessage}</p>
                </div>
              ) : error ? (
                <div className="text-red-600 p-4 bg-red-100 rounded-md">{error}</div>
              ) : (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: summary }}
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          {!sessionEnded ? (
            <Button
              variant="destructive"
              onClick={handleEndSessionClick}
            >
              End Session & Analyze
            </Button>
          ) : (
            <Button onClick={() => handleDialogClose(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}