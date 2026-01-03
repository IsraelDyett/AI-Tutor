// // components/ui/SpeechCoachingSession.tsx

// 'use client';

// import { useState, useRef, useEffect, useCallback } from 'react';
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
// import { Textarea } from '@/components/ui/textarea';
// import { summarizeAndAnalyzeConversation, CoachingAnalysis } from '@/lib/summarize';
// import { Loader2, Mic, MicOff, MessageSquare } from 'lucide-react';

// type TranscriptEntry = {
//   speaker: 'user' | 'ai';
//   text: string;
//   timestamp: Date;
// };

// type SalesSprintDetails = {
//   sprintName?: string | null;
//   startDate?: Date | null;
//   endDate?: Date | null;
//   goals?: { [key: string]: any } | null;
//   outcome?: { [key: string]: any } | null;
// };

// interface SpeechCoachingSessionProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onSaveComplete: () => void;
//   sprintId: string;
//   salesSprintData: SalesSprintDetails;
// }

// declare global {
//   interface Window {
//     SpeechRecognition: any;
//     webkitSpeechRecognition: any;
//   }
// }

// export default function SpeechCoachingSession({ 
//   isOpen, 
//   onClose, 
//   onSaveComplete, 
//   sprintId, 
//   salesSprintData 
// }: SpeechCoachingSessionProps) {
//   const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
//   const [isListening, setIsListening] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [summary, setSummary] = useState('');
//   const [error, setError] = useState('');
//   const [sessionEnded, setSessionEnded] = useState(false);
//   const [currentInput, setCurrentInput] = useState('');
//   const [mode, setMode] = useState<'speech' | 'text'>('speech');

//   const recognitionRef = useRef<any>(null);
//   const isRecognitionActive = useRef(false);

//   // Initialize speech recognition
//   useEffect(() => {
//     if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
//       const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
//       recognitionRef.current = new SpeechRecognition();
//       recognitionRef.current.continuous = true;
//       recognitionRef.current.interimResults = true;
//       recognitionRef.current.lang = 'en-US';

//       recognitionRef.current.onresult = (event: any) => {
//         let finalTranscript = '';
//         for (let i = event.resultIndex; i < event.results.length; i++) {
//           if (event.results[i].isFinal) {
//             finalTranscript += event.results[i][0].transcript;
//           }
//         }

//         if (finalTranscript.trim()) {
//           addTranscriptEntry('user', finalTranscript.trim());
//           setCurrentInput('');
//         }
//       };

//       recognitionRef.current.onerror = (event: any) => {
//         console.error('Speech recognition error:', event.error);
//         setError(`Speech recognition error: ${event.error}`);
//         setIsListening(false);
//         isRecognitionActive.current = false;
//       };

//       recognitionRef.current.onend = () => {
//         if (isRecognitionActive.current) {
//           // Restart recognition if it should still be active
//           try {
//             recognitionRef.current.start();
//           } catch (e) {
//             console.error('Failed to restart recognition:', e);
//             setIsListening(false);
//             isRecognitionActive.current = false;
//           }
//         }
//       };
//     } else {
//       setError('Speech recognition not supported in this browser. Use text mode instead.');
//       setMode('text');
//     }

//     return () => {
//       if (recognitionRef.current && isRecognitionActive.current) {
//         isRecognitionActive.current = false;
//         recognitionRef.current.stop();
//       }
//     };
//   }, []);

//   const addTranscriptEntry = (speaker: 'user' | 'ai', text: string) => {
//     const entry: TranscriptEntry = {
//       speaker,
//       text: text.trim(),
//       timestamp: new Date()
//     };
//     setTranscript(prev => [...prev, entry]);
//   };

//   const startListening = useCallback(() => {
//     if (!recognitionRef.current) return;
    
//     try {
//       setError('');
//       isRecognitionActive.current = true;
//       recognitionRef.current.start();
//       setIsListening(true);
//     } catch (e) {
//       console.error('Failed to start recognition:', e);
//       setError('Failed to start speech recognition');
//     }
//   }, []);

//   const stopListening = useCallback(() => {
//     if (recognitionRef.current) {
//       isRecognitionActive.current = false;
//       recognitionRef.current.stop();
//       setIsListening(false);
//     }
//   }, []);

//   const handleTextSubmit = () => {
//     if (currentInput.trim()) {
//       addTranscriptEntry('user', currentInput.trim());
//       setCurrentInput('');
//     }
//   };

//   const addAIResponse = () => {
//     // Simulate AI response or let user add AI responses manually
//     const response = prompt('Enter AI coach response:');
//     if (response && response.trim()) {
//       addTranscriptEntry('ai', response.trim());
//     }
//   };

//   const handleEndSession = async () => {
//     if (transcript.length < 2) {
//       setError('Please have a longer conversation before ending the session.');
//       return;
//     }

//     setSessionEnded(true);
//     setIsProcessing(true);
//     setError('');
//     stopListening();

//     try {
//       // Convert to the format expected by summarizeAndAnalyzeConversation
//       const formattedTranscript = transcript.map(entry => ({
//         speaker: entry.speaker,
//         text: entry.text
//       }));

//       const analysis: CoachingAnalysis = await summarizeAndAnalyzeConversation(formattedTranscript);
      
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
//       console.error('Processing failed:', err);
//       setError(`An error occurred: ${err.message}`);
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   const handleDialogClose = (open: boolean) => {
//     if (!open) {
//       stopListening();
//       setTranscript([]);
//       setSessionEnded(false);
//       setIsProcessing(false);
//       setSummary('');
//       setError('');
//       setCurrentInput('');
//       onClose();
//     }
//   };

//   const formatSprintData = () => {
//     const formatValue = (value: any) => (value !== null && value !== undefined ? value : 'N/A');
//     const formatObject = (obj: { [key: string]: any } | null | undefined): string => {
//       if (!obj || Object.keys(obj).length === 0) return 'None recorded.';
//       return Object.entries(obj)
//         .map(([key, value]) => `- ${key}: ${value}`)
//         .join('\n');
//     };
    
//     return `
// Sprint: ${formatValue(salesSprintData.sprintName)}
// Period: ${salesSprintData.startDate ? format(salesSprintData.startDate, 'PPP') : 'N/A'} - ${salesSprintData.endDate ? format(salesSprintData.endDate, 'PPP') : 'N/A'}
// Goals: ${formatObject(salesSprintData.goals)}
// Results: ${formatObject(salesSprintData.outcome)}
//     `.trim();
//   };

//   return (
//     <Dialog open={isOpen} onOpenChange={handleDialogClose}>
//       <DialogContent className="sm:max-w-4xl min-h-[70vh] flex flex-col">
//         <DialogHeader>
//           <DialogTitle>
//             {sessionEnded ? 'Coaching Session Analysis' : 'Sales Performance Coaching Session'}
//           </DialogTitle>
//           {!sessionEnded && (
//             <DialogDescription>
//               Record your coaching conversation. You can use speech recognition or type manually.
//             </DialogDescription>
//           )}
//         </DialogHeader>

//         <div className="flex-1 flex flex-col gap-4">
//           {!sessionEnded ? (
//             <>
//               {/* Sprint Context */}
//               <div className="bg-blue-50 p-3 rounded-lg text-sm">
//                 <h4 className="font-semibold mb-2">Sprint Context:</h4>
//                 <pre className="whitespace-pre-wrap text-xs">{formatSprintData()}</pre>
//               </div>

//               {/* Mode Toggle */}
//               <div className="flex gap-2">
//                 <Button
//                   variant={mode === 'speech' ? 'default' : 'outline'}
//                   size="sm"
//                   onClick={() => setMode('speech')}
//                 >
//                   <Mic className="w-4 h-4 mr-2" />
//                   Speech
//                 </Button>
//                 <Button
//                   variant={mode === 'text' ? 'default' : 'outline'}
//                   size="sm"
//                   onClick={() => setMode('text')}
//                 >
//                   <MessageSquare className="w-4 h-4 mr-2" />
//                   Text
//                 </Button>
//               </div>

//               {/* Transcript Display */}
//               <div className="flex-1 border rounded-lg p-4 bg-gray-50 overflow-y-auto max-h-60">
//                 {transcript.length === 0 ? (
//                   <p className="text-gray-500 text-center">Start your coaching conversation...</p>
//                 ) : (
//                   <div className="space-y-3">
//                     {transcript.map((entry, index) => (
//                       <div key={index} className={`p-2 rounded ${
//                         entry.speaker === 'user' 
//                           ? 'bg-blue-100 ml-8' 
//                           : 'bg-green-100 mr-8'
//                       }`}>
//                         <div className="font-semibold text-xs text-gray-600 mb-1">
//                           {entry.speaker === 'user' ? 'You' : 'Coach'} - {format(entry.timestamp, 'HH:mm:ss')}
//                         </div>
//                         <div className="text-sm">{entry.text}</div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {/* Input Controls */}
//               {mode === 'speech' ? (
//                 <div className="flex gap-2 items-center justify-center">
//                   <Button
//                     onClick={isListening ? stopListening : startListening}
//                     variant={isListening ? 'destructive' : 'default'}
//                     className="flex items-center gap-2"
//                   >
//                     {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
//                     {isListening ? 'Stop Listening' : 'Start Speaking'}
//                   </Button>
//                   <Button onClick={addAIResponse} variant="outline">
//                     Add Coach Response
//                   </Button>
//                 </div>
//               ) : (
//                 <div className="flex gap-2">
//                   <Textarea
//                     placeholder="Type your message..."
//                     value={currentInput}
//                     onChange={(e) => setCurrentInput(e.target.value)}
//                     onKeyDown={(e) => {
//                       if (e.key === 'Enter' && !e.shiftKey) {
//                         e.preventDefault();
//                         handleTextSubmit();
//                       }
//                     }}
//                     className="flex-1"
//                   />
//                   <div className="flex flex-col gap-2">
//                     <Button onClick={handleTextSubmit} disabled={!currentInput.trim()}>
//                       Add Your Message
//                     </Button>
//                     <Button onClick={addAIResponse} variant="outline">
//                       Add Coach Response
//                     </Button>
//                   </div>
//                 </div>
//               )}

//               {error && (
//                 <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>
//               )}

//               <div className="text-xs text-gray-500 text-center">
//                 Conversation entries: {transcript.length} | Need at least 2 to generate analysis
//               </div>
//             </>
//           ) : (
//             <div className="flex-1 overflow-y-auto">
//               {isProcessing ? (
//                 <div className="flex flex-col items-center justify-center h-full">
//                   <Loader2 className="h-8 w-8 animate-spin" />
//                   <p className="mt-4">Analyzing conversation...</p>
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

//         <DialogFooter>
//           {!sessionEnded ? (
//             <Button 
//               onClick={handleEndSession}
//               disabled={transcript.length < 2}
//               variant="destructive"
//             >
//               End Session & Generate Analysis ({transcript.length}/2)
//             </Button>
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