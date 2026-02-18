// // components/live-transcription-audio-component.tsx

// 'use client';
// /* tslint:disable */
// /**
//  * @license
//  * SPDX-License-Identifier: Apache-2.0
//  */

// import { GoogleGenAI, LiveServerMessage, Modality, Session, Type } from '@google/genai';
// import { useCallback, useEffect, useRef, useState } from 'react';
// import { createBlob, decode, decodeAudioData } from '@/lib/utils';
// import { Analyser } from '@/lib/analyser';
// import * as THREE from 'three';
// import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
// import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
// import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
// import { vs as backdropVS, fs as backdropFS } from '@/lib/shaders/backdrop';
// import { vs as sphereVS } from '@/lib/shaders/sphere';
// import { Settings, Volume2, Check, LayoutGrid, RefreshCw } from 'lucide-react';
// import { ActiveContextPanel, VisualContext } from './active-context-panel';
// import { v4 as uuidv4 } from 'uuid';
// import { searchResources, getTopics } from '@/app/(dashboard)/actions';
// import { trackFeatureUsageAction, checkFeatureAllowedAction } from '@/app/(dashboard)/usage-actions';

// export interface LiveAudioComponentProps {
//   prompt: string;
//   topicId: number;
//   subject?: string;
//   level?: string;
//   onConversationEnd: (audioBlob: Blob) => void;
//   isEnding: boolean;
// }

// export default function LiveAudioComponent({ prompt, topicId, subject, level, onConversationEnd, isEnding }: LiveAudioComponentProps) {
//   const [isRecording, setIsRecording] = useState(false);
//   const [status, setStatus] = useState('Initializing...');
//   const [error, setError] = useState('');
//   const [hasTrackedSession, setHasTrackedSession] = useState(false);
//   const [isAllowed, setIsAllowed] = useState(true);
//   const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
//   const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
//   const [showSettings, setShowSettings] = useState(false);
//   const [volumeLevel, setVolumeLevel] = useState(0);
//   const [visualContexts, setVisualContexts] = useState<VisualContext[]>([]);
//   const [isPanelOpen, setIsPanelOpen] = useState(false);

//   // Check if session is allowed on mount
//   useEffect(() => {
//     async function checkLimit() {
//       const res = await checkFeatureAllowedAction('voiceTutor');
//       if (!res.allowed) {
//         setIsAllowed(false);
//         setError(`⚠️ Usage Limit Reached: ${res.error || "Please upgrade your plan."}`);
//       }
//     }
//     checkLimit();
//   }, []);

//   const enumerateDevices = useCallback(async () => {
//     try {
//       const devices = await navigator.mediaDevices.enumerateDevices();
//       const mics = devices.filter(device => device.kind === 'audioinput');
//       setAudioDevices(mics);

//       // If we have mics but none selected, or the selected one is gone, pick the first one
//       if (mics.length > 0) {
//         const stillExists = mics.find(m => m.deviceId === selectedDeviceId);
//         if (!stillExists) {
//           setSelectedDeviceId(mics[0].deviceId);
//         }
//       }
//     } catch (err) {
//       console.error('Error enumerating devices:', err);
//     }
//   }, [selectedDeviceId]);

//   useEffect(() => {
//     // Initial enumeration
//     enumerateDevices();

//     // Watch for device changes (unplugging/plugging in)
//     navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
//     return () => {
//       navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
//     };
//   }, [enumerateDevices]);

//   const client = useRef<GoogleGenAI | null>(null);
//   // const session = useRef<Session | null>(null);
//   const session = useRef<any>(null);

//   // --- FIX 1: USE A SINGLE, SHARED AUDIO CONTEXT ---
//   const audioContext = useRef<AudioContext | null>(null);
//   const outputNode = useRef<GainNode | null>(null);
//   const nextStartTime = useRef(0);
//   const mediaStream = useRef<MediaStream | null>(null);
//   const scriptProcessorNode = useRef<ScriptProcessorNode | null>(null);
//   const sources = useRef(new Set<AudioBufferSourceNode>());

//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const rotation = useRef(new THREE.Vector3(0, 0, 0));
//   const prevTime = useRef(performance.now());
//   const sphere = useRef<THREE.Mesh | null>(null);
//   const backdrop = useRef<THREE.Mesh | null>(null);
//   const camera = useRef<THREE.PerspectiveCamera | null>(null);
//   const composer = useRef<EffectComposer | null>(null);
//   const inputAnalyser = useRef<Analyser | null>(null);
//   const outputAnalyser = useRef<Analyser | null>(null);
//   const animationFrameId = useRef<number | null>(null);
//   const isUnmounted = useRef(false);
//   const sessionOpen = useRef(false);

//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const audioChunksRef = useRef<Blob[]>([]);
//   const mixedStreamDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

//   const updateStatus = (msg: string) => {
//     console.log(msg);
//     setStatus(msg);
//   };
//   const updateError = (msg: string) => {
//     setError(msg);
//   };

//   const isRecordingRef = useRef(isRecording);
//   isRecordingRef.current = isRecording;

//   // --- FIX 2: STABILIZE USECALLBACKS ---
//   // This function is now stable and won't cause re-renders because it has no dependencies.
//   // It uses a ref to get the current recording state.
//   const stopConversation = useCallback(() => {
//     if (!isRecordingRef.current) return;
//     console.log('[Gemini Debug] stopConversation called.');
//     setIsRecording(false);
//     isRecordingRef.current = false; // Update ref immediately to prevent loops
//     updateStatus('Ending conversation and preparing audio...');

//     if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
//       mediaRecorderRef.current.stop();
//     }

//     scriptProcessorNode.current?.disconnect();
//     // No need to disconnect sourceNode, as it's part of the stream that's stopping
//     mediaStream.current?.getTracks().forEach((track) => track.stop());
//     session.current?.close();

//     scriptProcessorNode.current = null;
//     mediaStream.current = null;
//   }, []); // Empty dependency array makes this function stable

//   const initSession = useCallback(async () => {
//     if (!client.current) return;
//     updateStatus('Connecting to Gemini...');

//     const model = 'gemini-2.5-flash-native-audio-preview-09-2025';
//     const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
//     if (!apiKey) {
//       updateError('API key not found.');
//       return;
//     }

//     const enhancedPrompt = `
// [STRICT INTERACTION RULES - ABSOLUTE PRIORITY]:
// [SYSTEM ROLE]:
// You are a "Visual-First" Private Tutor. Your pedagogy relies entirely on "Dual Coding" (Visuals + Audio).
// You are NOT a standard voice assistant. You are a Blackboard Instructor.

// [THE GOLDEN RULE]:
// If a concept *can* be written down, it *MUST* be written down immediately.
// **DO NOT WAIT for the student to ask.**
// If any question involves a number, a calculation, a formula, definition or a list, you MUST call \`update_blackboard\` BEFORE you begin speaking and ensure its displayed on the board.
// If you receive a "[SYSTEM COMMAND]", you must immediately review the conversation history and call 'update_blackboard' with the most relevant information (latest math steps, definitions, or a summary).

// [OPERATIONAL PROTOCOL]:
// 1. **Trigger First, Speak Second:** When the student asks a question, your neural pathway should be:
//    - Step A: Determine what visual aids (formulas, bullet points, definitions) explain this.
//    - Step B: Call \`update_blackboard\` or \`consult_knowledge_base\` with that content.
//    - Step C: ONLY AFTER calling the tool, begin speaking.

// 2. **Audio Cues:** Start your sentences by acknowledging the visual you just created.
//    - "As I've written on the board..."
//    - "If you look at the formula I just pulled up..."
//    - "I've summarized the key points on your screen..."

// 3. **Content Triggers (When to be Proactive):**
//    - **Math/Physics:** AUTOMATICALLY show the formula or step-by-step working.
//    - **History/Literature:** AUTOMATICALLY show bullet points of dates or themes.
//    - **Definitions:** AUTOMATICALLY show the definition text.
//    - **Definitions/Text:** DO NOT put plain sentences inside dollar signs. 
//         -**Correct Definition Example:** \`update_blackboard(content: "The **Pythagorean Theorem** states that in a right-angled triangle, $a^2 + b^2 = c^2$.")\`
//         - **Incorrect Example (This turns RED):** \`update_blackboard(content: "$The Pythagorean Theorem is a2 + b2 = c2$")\`
//    - **Long Explanations:** If you speak for >10 seconds, AUTOMATICALLY show a summary list.

//    [MARKDOWN & FORMATTING]:
// - DO NOT use LaTeX or dollar signs ($). 
// - Use plain Markdown and standard text symbols for all math (e.g., use 1/2 instead of fractions, and ^ for exponents).
// - Use Markdown for structure: 
//     - Use # for headers.
//     - Use - or * for bulleted lists.
//     - Use **bold** for important terms or final answers.
// - Balanced Content: Don't just show numbers. For every calculation, provide a 1-sentence explanation or definition in plain text above it.
// - Ensure all content is clean, readable, and compatible with standard Markdown viewers.
// [BEHAVIOR EXAMPLES - MIMIC THIS EXACTLY]:

// <Example 1>
// Student: "How do I calculate the area of a circle?"
// Tutor (Tool Call): update_blackboard(content: "**Area of a Circle**\nArea = Pi * r^2")
// Tutor (Audio): "It's quite simple. As you can see on the board, the formula is Pi times the radius squared."
// </Example 1>

// <Example 2>
// Student: "Tell me about Photosynthesis."
// Tutor (Tool Call): consult_knowledge_base(query: "Photosynthesis definition")
// Tutor (Audio): "Let's look at the official definition from your notes. Essentially, it's how plants convert light into energy..."
// </Example 2>

// <Example 3>
// Student: "I don't understand."
// Tutor (Tool Call): update_blackboard(content: "- Step 1: Identify variables\n- Step 2: Plug into formula\n- Step 3: Solve")
// Tutor (Audio): "That's okay! I've broken it down into three steps on the screen. Let's tackle Step 1 together."
// </Example 3>

// <Example 4>
// Student: "How do I calculate the area of a circle?"
// Tutor (Tool Call): update_blackboard(content: "Area = Pi * r^2")
// Tutor (Audio): "It's quite simple. As you can see on the board, the formula is Pi times the radius squared."
// </Example 4>

// <Example 5>
// Student: "Add these fractions."
// Tutor (Tool Call): update_blackboard(content: "**Adding Fractions**\n1/4 + 2/4 = 3/4")
// Tutor (Audio): "Since the denominators are the same, we simply add the top numbers."
// </Example 5>


// [BACKUP PLAN]:
// 1. **Text/Formulas:** If \`consult_knowledge_base\` fails, use \`update_blackboard\` with your own knowledge.

//   [CORE PROMPT]:
//     ${prompt}
//   `;

//     try {
//       session.current = await client.current.live.connect({
//         model,
//         callbacks: {
//           onopen: () => {
//             sessionOpen.current = true;
//             console.log('Session opened successfully');
//             updateStatus('Connection opened. Press record to start the session.');
//           },
//           onmessage: async (message: LiveServerMessage) => {
//             try {
//               console.log('[Gemini Debug] Received message:', JSON.stringify(message, null, 2));

//               // Check for tool calls (handling potential alternate property names)
//               const toolCall = message.toolCall || (message as any).tool_call || (message as any).toolCalls;
//               if (toolCall && toolCall.functionCalls) {
//                 try {
//                   console.log('[Tool Debug] Received tool calls:', toolCall.functionCalls);

//                   // Process all tool calls in parallel and collect responses
//                   const functionResponses = await Promise.all(toolCall.functionCalls.map(async (call: any) => {
//                     console.log(`[Tool Debug] Processing call: ${call.name} (ID: ${call.id})`);

//                     if (call.name === 'consult_knowledge_base') {
//                       try {
//                         const { query } = call.args as { query: string };
//                         updateStatus(`Searching knowledge base for: "${query}"...`);

//                         // Set loading state in visual context
//                         const loadingId = uuidv4();
//                         setVisualContexts(prev => [...prev, {
//                           id: loadingId,
//                           type: 'loading' as const,
//                           content: `Searching: ${query} `,
//                           source: 'database' as const,
//                           timestamp: new Date()
//                         }]);
//                         setIsPanelOpen(true);

//                         let searchIds: number[] = [];
//                         if (topicId === -1 && subject) {
//                           try {
//                             const accessibleTopics = await getTopics(subject, level);
//                             searchIds = accessibleTopics.map((t: any) => t.id);
//                           } catch (e) { searchIds = []; }
//                         } else {
//                           searchIds = [topicId];
//                         }

//                         const results = await searchResources(query, searchIds);
//                         console.log('[RAG Debug] searchResources results:', results);

//                         let resultText = "";
//                         if (Array.isArray(results)) {
//                           resultText = results.length > 0
//                             ? results.join('\n\n')
//                             : "No relevant information found in the knowledge base.";
//                         } else {
//                           resultText = "Search failed or no relevant information found.";
//                         }

//                         // Update the loading context with actual result
//                         setVisualContexts(prev => prev.map(ctx =>
//                           ctx.id === loadingId
//                             ? { ...ctx, type: 'source_text' as const, content: resultText }
//                             : ctx
//                         ));

//                         return {
//                           name: 'consult_knowledge_base',
//                           id: call.id,
//                           response: { result: resultText }
//                         };
//                       } catch (err) {
//                         console.error('[Tool Debug] Error in consult_knowledge_base:', err);
//                         return {
//                           name: 'consult_knowledge_base',
//                           id: call.id,
//                           response: { error: 'Internal Error' }
//                         };
//                       }

//                     } else if (call.name === 'update_blackboard') {
//                       try {
//                         const { content } = call.args as { content: string };
//                         console.log('[Tool Debug] Updating blackboard with content:', content);

//                         // 1. Update visual context state
//                         setVisualContexts(prev => [...prev, {
//                           id: uuidv4(),
//                           type: 'formula',
//                           content: content,
//                           source: 'generated',
//                           timestamp: new Date()
//                         }]);

//                         // 2. Force the panel to open so the user sees it
//                         setIsPanelOpen(true);

//                         return {
//                           name: 'update_blackboard',
//                           id: call.id,
//                           response: { success: true }
//                         };
//                       } catch (err) {
//                         console.error('[Tool Error] update_blackboard:', err);
//                         return { name: 'update_blackboard', id: call.id, response: { error: 'Failed' } };
//                       }
//                     }
//                     // else if (call.name === 'show_diagram') {
//                     //   try {
//                     //     const { url } = call.args as { url: string };
//                     //     setVisualContexts(prev => {
//                     //       const newer = [...prev, {
//                     //         id: uuidv4(),
//                     //         type: 'diagram' as const,
//                     //         content: url,
//                     //         source: 'generated' as const,
//                     //         timestamp: new Date()
//                     //       }];
//                     //       console.log('[Tool Debug] Adding diagram to blackboard:', newer);
//                     //       return newer;
//                     //     });
//                     //     setIsPanelOpen(true);

//                     //     return {
//                     //       name: 'show_diagram',
//                     //       id: call.id,
//                     //       response: { success: true }
//                     //     };
//                     //   } catch (err) {
//                     //     console.error('[Tool Debug] Error in show_diagram:', err);
//                     //     return { name: 'show_diagram', id: call.id, response: { error: 'Failed' } };
//                     //   }
//                     // }

//                     // Fallback for unknown tools
//                     console.warn(`[Tool Debug] Unknown tool: ${call.name}`);
//                     return {
//                       name: call.name,
//                       id: call.id,
//                       response: { error: 'Unknown tool' }
//                     };
//                   }));

//                   // Send all responses in a single batch
//                   if (functionResponses.length > 0) {
//                     console.log('[Tool Debug] Sending batch responses:', functionResponses);
//                     // The SDK might expect slightly different property names depending on version
//                     try {
//                       if (typeof session.current?.sendToolResponse === 'function') {
//                         session.current.sendToolResponse({ functionResponses });
//                       } else if (typeof session.current?.send === 'function') {
//                         session.current.send({ toolResponse: { functionResponses } });
//                       }
//                     } catch (sendErr) {
//                       console.error('[Tool Debug] Error sending tool response:', sendErr);
//                     }
//                   }
//                 } catch (mainErr) {
//                   console.error('[Tool Debug] Major error in tool processing loop:', mainErr);
//                 }
//               }

//               const serverContent = message.serverContent;
//               if (serverContent) {
//                 const aiPart = serverContent.modelTurn?.parts?.[0];
//                 if (aiPart?.inlineData) {
//                   const audio = aiPart.inlineData;
//                   // Use the single, shared audio context
//                   if (audioContext.current && outputNode.current && mixedStreamDestinationRef.current) {
//                     // Decode audio using the single context. It will handle resampling from 24kHz to 16kHz.
//                     const audioBuffer = await decodeAudioData(
//                       decode(audio.data ?? ''),
//                       audioContext.current, 24000, 1
//                     );
//                     const source = audioContext.current.createBufferSource();
//                     source.buffer = audioBuffer;

//                     source.connect(outputNode.current);
//                     // This connection will now succeed as both nodes are from the same context
//                     source.connect(mixedStreamDestinationRef.current);

//                     source.addEventListener('ended', () => sources.current.delete(source));

//                     nextStartTime.current = Math.max(nextStartTime.current, audioContext.current.currentTime);
//                     source.start(nextStartTime.current);
//                     nextStartTime.current += audioBuffer.duration;
//                     sources.current.add(source);
//                   }
//                 }

//                 if (serverContent.interrupted) {
//                   sources.current.forEach(source => source.stop());
//                   sources.current.clear();
//                   nextStartTime.current = 0;
//                 }
//               }
//             } catch (globalErr) {
//               console.error('[Gemini Debug] Error in onmessage loop:', globalErr);
//             }
//           },
//           onclose: (e: CloseEvent) => {
//             sessionOpen.current = false;
//             console.log('[Gemini Debug] Session closed. Details:', {
//               code: e.code,
//               reason: e.reason,
//               wasClean: e.wasClean
//             });
//             updateStatus('Session closed.');
//             if (isRecordingRef.current) {
//               console.log('[Gemini Debug] Session closed while recording, stopping conversation.');
//               stopConversation();
//             }
//           },
//           onerror: (e: ErrorEvent) => {
//             console.error('[Gemini Debug] Session error details:', e);
//             updateError(`Session error: ${e.message}`);
//           }
//         },
//         config: {
//           systemInstruction: enhancedPrompt,
//           responseModalities: [Modality.AUDIO],
//           tools: [{
//             functionDeclarations: [
//               {
//                 name: 'consult_knowledge_base',
//                 description: 'Consult the topic-specific knowledge base (documents, flashcards, past papers) to provide accurate information.',
//                 parameters: {
//                   type: Type.OBJECT,
//                   properties: {
//                     query: {
//                       type: Type.STRING,
//                       description: 'The search query to look up in the knowledge base.'
//                     }
//                   },
//                   required: ['query']
//                 }
//               },
//               {
//                 name: 'update_blackboard',
//                 description: 'Display a math formula, equation, or teaching note on the student\'s blackboard. Content should be in Markdown.',
//                 parameters: {
//                   type: Type.OBJECT,
//                   properties: {
//                     content: {
//                       type: Type.STRING,
//                       description: 'The Markdown content to display.'
//                     }
//                   },
//                   required: ['content']
//                 }
//               },
//               // {
//               //   name: 'show_diagram',
//               //   description: 'Display an image or diagram to the student.',
//               //   parameters: {
//               //     type: Type.OBJECT,
//               //     properties: {
//               //       url: {
//               //         type: Type.STRING,
//               //         description: 'The URL of the image/diagram to display.'
//               //       }
//               //     },
//               //     required: ['url']
//               //   }
//               // }
//             ]
//           }]
//         },
//       });
//     } catch (e: any) {
//       updateError(e.message);
//     }
//   }, [prompt, stopConversation]);

//   const startConversation = useCallback(async () => {
//     if (isRecording) return;
//     if (!isAllowed) {
//       updateError('You have reached your session limit. Please upgrade.');
//       return;
//     }

//     // Tracking
//     if (!hasTrackedSession) {
//       const res = await trackFeatureUsageAction('voiceTutor');
//       if (!res.success) {
//         updateError(`❌ ${res.error || "Failed to start session. Limit reached."} `);
//         return;
//       }
//       setHasTrackedSession(true);
//     }

//     if (!session.current || !sessionOpen.current) {
//       updateError('Session not ready. Please wait.');
//       return;
//     }

//     audioContext.current?.resume();
//     updateStatus('Requesting microphone...');
//     try {
//       mediaStream.current = await navigator.mediaDevices.getUserMedia({
//         audio: {
//           echoCancellation: true,
//           noiseSuppression: true,
//           autoGainControl: true,
//           sampleRate: 16000,
//           deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined
//         }
//       });
//       updateStatus('Microphone access granted.');

//       if (!audioContext.current) {
//         updateError('Audio context not initialized');
//         return;
//       }

//       mixedStreamDestinationRef.current = audioContext.current.createMediaStreamDestination();

//       const micSourceNode = audioContext.current.createMediaStreamSource(mediaStream.current);
//       micSourceNode.connect(mixedStreamDestinationRef.current);

//       audioChunksRef.current = [];
//       mediaRecorderRef.current = new MediaRecorder(mixedStreamDestinationRef.current.stream, {
//         mimeType: 'audio/webm'
//       });

//       mediaRecorderRef.current.ondataavailable = (event) => {
//         if (event.data.size > 0) audioChunksRef.current.push(event.data);
//       };

//       mediaRecorderRef.current.onstop = () => {
//         if (audioChunksRef.current.length > 0) {
//           const fullAudioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
//           onConversationEnd(fullAudioBlob);
//         } else {
//           // Handle case where no audio was captured
//           onConversationEnd(new Blob([], { type: 'audio/webm' }));
//         }
//         audioChunksRef.current = [];
//       };

//       // Note: ScriptProcessorNode is deprecated but used here for simplicity.
//       // For production apps, consider migrating to AudioWorklet.
//       scriptProcessorNode.current = audioContext.current.createScriptProcessor(4096, 1, 1);

//       // We still need a source node for sending data to Gemini, separate from the one for recording
//       const geminiSourceNode = audioContext.current.createMediaStreamSource(mediaStream.current);
//       geminiSourceNode.connect(scriptProcessorNode.current);

//       // Create a gain node and analyser for volume level visualization
//       const volumeAnalyserNode = audioContext.current.createAnalyser();
//       volumeAnalyserNode.fftSize = 256;
//       geminiSourceNode.connect(volumeAnalyserNode);

//       const dataArray = new Uint8Array(volumeAnalyserNode.frequencyBinCount);
//       const updateVolume = () => {
//         if (!isRecordingRef.current) return;
//         volumeAnalyserNode.getByteFrequencyData(dataArray);
//         const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
//         setVolumeLevel(average);
//         requestAnimationFrame(updateVolume);
//       };
//       updateVolume();

//       // Connect to the destination to keep the processing chain alive, but with gain 0 to avoid echo.
//       const muteNode = audioContext.current.createGain();
//       muteNode.gain.setValueAtTime(0, audioContext.current.currentTime);
//       scriptProcessorNode.current.connect(muteNode);
//       muteNode.connect(audioContext.current.destination);

//       scriptProcessorNode.current.onaudioprocess = (event) => {
//         if (isRecordingRef.current && session.current && sessionOpen.current) {
//           try {
//             const pcmData = event.inputBuffer.getChannelData(0);
//             session.current.sendRealtimeInput({ media: createBlob(pcmData) });
//           } catch (err) {
//             console.warn('[Gemini Debug] Failed to send audio input:', err);
//             // Don't crash the UI if a single packet fails
//           }
//         }
//       };

//       mediaRecorderRef.current.start();
//       setIsRecording(true);
//       updateStatus('🔴 Live Conversation... Speak now!');
//     } catch (err: any) {
//       updateError(`Microphone error: ${err.message}.`);
//     }
//   }, [isRecording, onConversationEnd]);

//   useEffect(() => {
//     if (isEnding && isRecording) {
//       stopConversation();
//     }
//   }, [isEnding, isRecording, stopConversation]);

//   const reset = useCallback(() => {
//     stopConversation();
//     initSession();
//   }, [initSession, stopConversation]);

//   const handleForceUpdate = useCallback(() => {
//     if (session.current && sessionOpen.current) {
//       updateStatus('Syncing blackboard...');
//       try {
//         // Corrected syntax for Multimodal Live API text injection
//         session.current.send({
//           clientContent: {
//             turns: [{
//               role: "user",
//               parts: [{ text: "[SYSTEM COMMAND]: Update the blackboard now with a summary of our current topic or math problem." }]
//             }],
//             turnComplete: true
//           }
//         });
//       } catch (err) {
//         console.error("Force update error:", err);
//         updateError("Sync failed.");
//       }
//     } else {
//       updateError('Start session first.');
//     }
//   }, [updateStatus, updateError]);

//   useEffect(() => {
//     isUnmounted.current = false;
//     const canvas = canvasRef.current;
//     if (!canvas) return;

//     // --- FIX 1 (cont.): Initialize only ONE AudioContext ---
//     audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

//     // Create all nodes from this single context
//     if (audioContext.current) {
//       outputNode.current = audioContext.current.createGain();
//       outputNode.current.connect(audioContext.current.destination);

//       const inputGainNode = audioContext.current.createGain(); // For analyser
//       inputAnalyser.current = new Analyser(inputGainNode);
//       outputAnalyser.current = new Analyser(outputNode.current);
//     }

//     client.current = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_API_KEY || '' });

//     // ... The rest of your THREE.js setup code remains unchanged ...
//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color(0x100c14);
//     const back = new THREE.Mesh(
//       new THREE.IcosahedronGeometry(10, 5),
//       new THREE.RawShaderMaterial({
//         uniforms: {
//           resolution: { value: new THREE.Vector2(0, 0) },
//           rand: { value: 0 },
//         },
//         vertexShader: backdropVS, fragmentShader: backdropFS, glslVersion: THREE.GLSL3, side: THREE.BackSide,
//       }),
//     );
//     scene.add(back);
//     backdrop.current = back;
//     camera.current = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
//     camera.current.position.set(0, 0, 5);
//     const renderer = new THREE.WebGLRenderer({
//       canvas: canvas, antialias: true,
//     });
//     renderer.setPixelRatio(window.devicePixelRatio);
//     const geometry = new THREE.IcosahedronGeometry(1, 10);
//     const pmremGenerator = new THREE.PMREMGenerator(renderer);
//     pmremGenerator.compileEquirectangularShader();
//     const sphereMaterial = new THREE.MeshStandardMaterial({
//       color: 0x000010, metalness: 0.5, roughness: 0.1, emissive: 0x000010, emissiveIntensity: 1.5,
//     });
//     new EXRLoader().load('/piz_compressed.exr', (texture) => {
//       texture.mapping = THREE.EquirectangularReflectionMapping;
//       const exrCubeRenderTarget = pmremGenerator.fromEquirectangular(texture);
//       sphereMaterial.envMap = exrCubeRenderTarget.texture;
//       if (sphere.current) sphere.current.visible = true;
//     }, undefined, (error) => {
//       console.warn('Failed to load EXR texture:', error);
//       if (sphere.current) sphere.current.visible = true;
//     });
//     sphereMaterial.onBeforeCompile = (shader) => {
//       shader.uniforms.time = { value: 0 };
//       shader.uniforms.inputData = { value: new THREE.Vector4() };
//       shader.uniforms.outputData = { value: new THREE.Vector4() };
//       sphereMaterial.userData.shader = shader;
//       shader.vertexShader = sphereVS;
//     };
//     sphere.current = new THREE.Mesh(geometry, sphereMaterial);
//     sphere.current.visible = false;
//     scene.add(sphere.current);
//     const renderPass = new RenderPass(scene, camera.current);
//     const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 5, 0.5, 0);
//     composer.current = new EffectComposer(renderer);
//     composer.current.addPass(renderPass);
//     composer.current.addPass(bloomPass);
//     const resizeObserver = new ResizeObserver(entries => {
//       for (const entry of entries) {
//         const { width, height } = entry.contentRect;
//         if (!camera.current || !renderer || !composer.current || !backdrop.current) return;
//         camera.current.aspect = width / height;
//         camera.current.updateProjectionMatrix();
//         renderer.setSize(width, height);
//         composer.current.setSize(width, height);
//         const dPR = renderer.getPixelRatio();
//         (backdrop.current.material as THREE.RawShaderMaterial).uniforms.resolution.value.set(width * dPR, height * dPR);
//       }
//     });
//     if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
//     const animate = () => {
//       if (isUnmounted.current) return;
//       animationFrameId.current = requestAnimationFrame(animate);
//       if (!inputAnalyser.current || !outputAnalyser.current || !sphere.current || !backdrop.current || !composer.current || !camera.current) return;
//       inputAnalyser.current.update();
//       outputAnalyser.current.update();
//       const t = performance.now();
//       const dt = (t - prevTime.current) / (1000 / 60);
//       prevTime.current = t;
//       (backdrop.current.material as THREE.RawShaderMaterial).uniforms.rand.value = Math.random() * 10000;
//       const sphereMaterial = sphere.current.material as THREE.MeshStandardMaterial;
//       if (sphereMaterial.userData.shader) {
//         sphere.current.scale.setScalar(1 + (0.2 * outputAnalyser.current.data[1]) / 255);
//         const f = 0.001;
//         rotation.current.x += (dt * f * 0.5 * outputAnalyser.current.data[1]) / 255;
//         rotation.current.z += (dt * f * 0.5 * inputAnalyser.current.data[1]) / 255;
//         rotation.current.y += (dt * f * 0.25 * (inputAnalyser.current.data[2] + outputAnalyser.current.data[2])) / 255;
//         camera.current.position.set(0, 0, 5);
//         sphereMaterial.userData.shader.uniforms.time.value += (dt * 0.1 * outputAnalyser.current.data[0]) / 255;
//         sphereMaterial.userData.shader.uniforms.inputData.value.set(
//           (1 * inputAnalyser.current.data[0]) / 255, (0.1 * inputAnalyser.current.data[1]) / 255, (10 * inputAnalyser.current.data[2]) / 255, 0
//         );
//         sphereMaterial.userData.shader.uniforms.outputData.value.set(
//           (2 * outputAnalyser.current.data[0]) / 255, (0.1 * outputAnalyser.current.data[1]) / 255, (10 * outputAnalyser.current.data[2]) / 255, 0
//         );
//       }
//       composer.current.render();
//     };
//     animate();

//     return () => {
//       isUnmounted.current = true;
//       if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
//       if (canvas.parentElement) resizeObserver.unobserve(canvas.parentElement);

//       scriptProcessorNode.current?.disconnect();
//       mediaStream.current?.getTracks().forEach((track) => track.stop());
//       session.current?.close();
//       audioContext.current?.close();
//       pmremGenerator.dispose();
//       renderer.dispose();
//     };
//   }, []);

//   useEffect(() => {
//     if (prompt) {
//       initSession();
//     }
//     return () => {
//       session.current?.close();
//     }
//   }, [prompt, initSession]);

//   return (
//     <div className="w-full h-[600px] flex flex-col md:flex-row bg-[#100c14] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
//       <button
//         onClick={() => setIsPanelOpen(!isPanelOpen)}
//         className="absolute top-4 right-4 z-[50] flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-md border border-white/10 transition-all shadow-lg active:scale-95"
//       >
//         <LayoutGrid size={18} />
//         <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
//           {isPanelOpen ? "Hide Board" : "Show Board"}
//         </span>

//         {/* Notification Dot: Shows if there is content but the board is closed */}
//         {visualContexts.length > 0 && !isPanelOpen && (
//           <span className="absolute -top-1 -right-1 flex h-3 w-3">
//             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
//             <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
//           </span>
//         )}
//       </button>

//       {/* Main Tutor Area */}
//       <div className="flex-1 relative min-h-[400px]">
//         <canvas ref={canvasRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
//         <div id="status" style={{ position: 'absolute', bottom: '2vh', left: 0, right: 0, zIndex: 10, textAlign: 'center', color: 'white', fontSize: '14px', opacity: 0.8 }}>
//           {error || status}
//         </div>
//         <div className="controls" style={{ zIndex: 20, position: 'absolute', bottom: '8vh', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
//           <button id="resetButton" onClick={reset} aria-label="Reset Session" style={{ outline: 'none', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.1)', width: '48px', height: '48px', cursor: 'pointer', fontSize: '24px', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//             <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#ffffff"><path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" /></svg>
//           </button>
//           {!isRecording ? (
//             <button id="startButton" onClick={startConversation} aria-label="Start Recording" style={{ outline: 'none', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', width: '56px', height: '56px', cursor: 'pointer', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//               <svg viewBox="0 0 100 100" width="32px" height="32px" fill="#c80000" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" /></svg>
//             </button>
//           ) : (
//             <button id="stopButton" onClick={reset} aria-label="Stop Recording" style={{ outline: 'none', border: '1px solid rgba(255, 50, 50, 0.5)', color: 'white', borderRadius: '50%', background: 'rgba(200, 0, 0, 0.2)', width: '56px', height: '56px', cursor: 'pointer', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//               <div style={{ width: '20px', height: '20px', background: '#ef4444', borderRadius: '4px' }}></div>
//             </button>
//           )}

//           {/* Visual Volume Meter and Settings */}
//           <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
//             {isRecording && (
//               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
//                 <Volume2 size={16} color="white" />
//                 <div style={{ width: '100px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
//                   <div style={{
//                     width: `${Math.min(100, volumeLevel * 2)}% `,
//                     height: '100%',
//                     background: volumeLevel > 50 ? '#ef4444' : '#22c55e',
//                     transition: 'width 0.1s ease-out, background 0.3s ease'
//                   }} />
//                 </div>
//               </div>
//             )}

//             <button
//               onClick={() => setShowSettings(!showSettings)}
//               style={{
//                 background: showSettings ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
//                 border: '1px solid rgba(255,255,255,0.2)',
//                 borderRadius: '50%',
//                 width: '40px',
//                 height: '40px',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 cursor: 'pointer',
//                 color: 'white',
//                 transition: 'all 0.2s ease'
//               }}
//             >
//               <Settings size={20} />
//             </button>
//           </div>

//           {/* Device Selection Dropdown */}
//           {showSettings && (
//             <div style={{
//               position: 'absolute',
//               bottom: '70px',
//               background: 'rgba(20, 20, 25, 0.95)',
//               backdropFilter: 'blur(10px)',
//               border: '1px solid rgba(255,255,255,0.1)',
//               borderRadius: '12px',
//               padding: '12px',
//               width: '280px',
//               zIndex: 100,
//               boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
//             }}>
//               <p style={{ color: 'white', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
//                 Select Microphone
//               </p>
//               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
//                 {audioDevices.length === 0 ? (
//                   <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '8px' }}>No microphones found</p>
//                 ) : (
//                   audioDevices.map(device => (
//                     <button
//                       key={device.deviceId}
//                       onClick={() => {
//                         setSelectedDeviceId(device.deviceId);
//                         setShowSettings(false);
//                         if (isRecording) {
//                           // Restart conversation if device changed while recording
//                           reset();
//                         }
//                       }}
//                       style={{
//                         background: selectedDeviceId === device.deviceId ? 'rgba(255,255,255,0.1)' : 'transparent',
//                         border: 'none',
//                         borderRadius: '8px',
//                         padding: '8px 12px',
//                         color: 'white',
//                         fontSize: '14px',
//                         textAlign: 'left',
//                         cursor: 'pointer',
//                         display: 'flex',
//                         alignItems: 'center',
//                         justifyContent: 'space-between',
//                         transition: 'background 0.2s ease'
//                       }}
//                     >
//                       <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
//                         {device.label || `Microphone ${device.deviceId.substring(0, 5)}...`}
//                       </span>
//                       {selectedDeviceId === device.deviceId && <Check size={14} color="#22c55e" />}
//                     </button>
//                   ))
//                 )}
//               </div>
//               <button
//                 onClick={() => enumerateDevices()}
//                 style={{
//                   marginTop: '8px',
//                   background: 'transparent',
//                   border: '1px solid rgba(255,255,255,0.1)',
//                   borderRadius: '6px',
//                   padding: '6px',
//                   color: 'white',
//                   fontSize: '11px',
//                   width: '100%',
//                   cursor: 'pointer',
//                   opacity: 0.6
//                 }}
//               >
//                 Refresh Device List
//               </button>
//             </div>
//           )}

//           {isRecording && <div style={{ color: 'white', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', opacity: 0.8 }}>Conversation is being recorded</div>}
//         </div>
//       </div>

//       {/* Side Context Panel Area */}
//       <div className={`relative flex flex-col h-full border-l border-white/10 transition-all duration-300 ${isPanelOpen ? 'w-full md:w-[400px]' : 'w-0'}`}>
//         {/* Force Update Button */}
//         {isPanelOpen && (
//           <button
//             onClick={handleForceUpdate}
//             className="absolute top-14 left-4 z-[60] flex items-center gap-2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded border border-white/20 text-[10px] text-white font-bold uppercase tracking-wider transition-all shadow-xl backdrop-blur-md"
//           >
//             <RefreshCw size={12} className={status.includes('Syncing') ? 'animate-spin' : ''} />
//             Sync Board
//           </button>
//         )}

//         <ActiveContextPanel
//           contexts={visualContexts}
//           isOpen={isPanelOpen}
//           onClose={() => setIsPanelOpen(false)}
//         />
//       </div>

//       {/* Floating Toggle (Mobile or when closed)
//       {(!isPanelOpen || typeof window !== 'undefined' && window.innerWidth < 768) && visualContexts.length > 0 && (
//         <button
//           onClick={() => setIsPanelOpen(true)}
//           className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md border border-white/10 z-[30] transition-all shadow-lg"
//         >
//           <LayoutGrid size={20} />
//         </button>
//       )} */}
//     </div>
//   );
// }





// components/live-transcription-audio-component.tsx

'use client';
/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, LiveServerMessage, Modality, Session, Type } from '@google/genai';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createBlob, decode, decodeAudioData } from '@/lib/utils';
import { Analyser } from '@/lib/analyser';
import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { vs as backdropVS, fs as backdropFS } from '@/lib/shaders/backdrop';
import { vs as sphereVS } from '@/lib/shaders/sphere';
import { Settings, Volume2, Check, LayoutGrid, RefreshCw } from 'lucide-react';
import { ActiveContextPanel, VisualContext } from './active-context-panel';
import { v4 as uuidv4 } from 'uuid';
import { searchResources, getTopics } from '@/app/(dashboard)/actions'; 


export interface LiveAudioComponentProps {
  prompt: string;
  topicId: number;
  subject?: string;
  level?: string;
  onConversationEnd: (audioBlob: Blob) => void;
  isEnding: boolean;
}

// Helper to convert audio buffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function LiveAudioComponent({ prompt, topicId, subject, level, onConversationEnd, isEnding }: LiveAudioComponentProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState('');
  const [hasTrackedSession, setHasTrackedSession] = useState(false);
  const [isAllowed, setIsAllowed] = useState(true);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [visualContexts, setVisualContexts] = useState<VisualContext[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Check if session is allowed on mount
  useEffect(() => {
    const { checkFeatureAllowedAction } = require('@/app/(dashboard)/usage-actions');
    async function checkLimit() {
      const res = await checkFeatureAllowedAction('voiceTutor');
      if (!res.allowed) {
        setIsAllowed(false);
        setError(`⚠️ Usage Limit Reached: ${res.error || "Please upgrade your plan."}`);
      }
    }
    checkLimit();
  }, []);

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(device => device.kind === 'audioinput');
      setAudioDevices(mics);

      // If we have mics but none selected, or the selected one is gone, pick the first one
      if (mics.length > 0) {
        const stillExists = mics.find(m => m.deviceId === selectedDeviceId);
        if (!stillExists) {
          setSelectedDeviceId(mics[0].deviceId);
        }
      }
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    // Initial enumeration
    enumerateDevices();

    // Watch for device changes (unplugging/plugging in)
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
    };
  }, [enumerateDevices]);

  const client = useRef<GoogleGenAI | null>(null);
  const session = useRef<any>(null); // Changed to any to allow flexible method calls

  // --- FIX 1: USE A SINGLE, SHARED AUDIO CONTEXT ---
  const audioContext = useRef<AudioContext | null>(null);
  const outputNode = useRef<GainNode | null>(null);
  const nextStartTime = useRef(0);
  const mediaStream = useRef<MediaStream | null>(null);
  const scriptProcessorNode = useRef<ScriptProcessorNode | null>(null);
  const sources = useRef(new Set<AudioBufferSourceNode>());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotation = useRef(new THREE.Vector3(0, 0, 0));
  const prevTime = useRef(performance.now());
  const sphere = useRef<THREE.Mesh | null>(null);
  const backdrop = useRef<THREE.Mesh | null>(null);
  const camera = useRef<THREE.PerspectiveCamera | null>(null);
  const composer = useRef<EffectComposer | null>(null);
  const inputAnalyser = useRef<Analyser | null>(null);
  const outputAnalyser = useRef<Analyser | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const isUnmounted = useRef(false);
  const sessionOpen = useRef(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mixedStreamDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const isInterruptedRef = useRef(false); // New Ref

  const updateStatus = (msg: string) => {
    console.log(msg);
    setStatus(msg);
  };
  const updateError = (msg: string) => {
    setError(msg);
  };

  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;
  // Guard so we never call initSession() while user is in the middle of clicking record
  // (setState hasn't committed yet so isRecordingRef is still false).
  const isStartingConversationRef = useRef(false);

  // --- FIX 2: STABILIZE USECALLBACKS ---
  // This function is now stable and won't cause re-renders because it has no dependencies.
  // It uses a ref to get the current recording state.
  const stopConversation = useCallback(() => {
    if (!isRecordingRef.current) return;
    isStartingConversationRef.current = false;
    setIsRecording(false);
    updateStatus('Ending conversation and preparing audio...');

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    scriptProcessorNode.current?.disconnect();
    mediaStream.current?.getTracks().forEach((track) => track.stop());
    try {
      session.current?.close();
    } catch (_) {
      // Session may already be closed by server; ignore
    }
    session.current = null;
    sessionOpen.current = false;
    scriptProcessorNode.current = null;
    mediaStream.current = null;
  }, []); // Empty dependency array makes this function stable

  const initSession = useCallback(async () => {
    if (!client.current) return;
    // Close any existing session before opening a new one (avoids double-session; cleanup no longer closes)
    if (session.current) {
      try {
        session.current.close();
      } catch (_) {}
      session.current = null;
      sessionOpen.current = false;
    }
    updateStatus('Connecting to Gemini...');

    const model = 'gemini-2.5-flash-native-audio-preview-09-2025';
    const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
    if (!apiKey) {
      updateError('API key not found.');
      return;
    }

    const enhancedPrompt = `
[STRICT INTERACTION RULES - ABSOLUTE PRIORITY]:
[SYSTEM ROLE]:
You are a "Visual-First" Private Tutor. Your pedagogy relies entirely on "Dual Coding" (Visuals + Audio).
You are NOT a standard voice assistant. You are a Blackboard Instructor.

[THE GOLDEN RULE]:
If a concept *can* be written down, it *MUST* be written down immediately.
**DO NOT WAIT for the student to ask.**
If any question involves a number, a calculation, a formula, definition or a list, you MUST call \`update_blackboard\` BEFORE you begin speaking and ensure its displayed on the board.
If you receive a "[SYSTEM COMMAND]", you must immediately review the conversation history and call 'update_blackboard' with the most relevant information (latest math steps, definitions, or a summary).

[OPERATIONAL PROTOCOL]:
1. **Trigger First, Speak Second:** When the student asks a question, your neural pathway should be:
   - Step A: Determine what visual aids (formulas, bullet points, definitions) explain this.
   - Step B: Call \`update_blackboard\` or \`consult_knowledge_base\` with that content.
   - Step C: ONLY AFTER calling the tool, begin speaking.
   
2. **Audio Cues:** Start your sentences by acknowledging the visual you just created.
   - "As I've written on the board..."
   - "If you look at the formula I just pulled up..."
   - "I've summarized the key points on your screen..."

3. **Content Triggers (When to be Proactive):**
   - **Math/Physics:** AUTOMATICALLY show the formula or step-by-step working.
   - **History/Literature:** AUTOMATICALLY show bullet points of dates or themes.
   - **Definitions:** AUTOMATICALLY show the definition text.
   - **Definitions/Text:** DO NOT put plain sentences inside dollar signs. 
        -**Correct Definition Example:** \`update_blackboard(content: "The **Pythagorean Theorem** states that in a right-angled triangle, $a^2 + b^2 = c^2$.")\`
        - **Incorrect Example (This turns RED):** \`update_blackboard(content: "$The Pythagorean Theorem is a2 + b2 = c2$")\`
   - **Long Explanations:** If you speak for >10 seconds, AUTOMATICALLY show a summary list.

   [MARKDOWN & FORMATTING]:
- DO NOT use LaTeX or dollar signs ($). 
- Use plain Markdown and standard text symbols for all math (e.g., use 1/2 instead of fractions, and ^ for exponents).
- Use Markdown for structure: 
    - Use # for headers.
    - Use - or * for bulleted lists.
    - Use **bold** for important terms or final answers.
- Balanced Content: Don't just show numbers. For every calculation, provide a 1-sentence explanation or definition in plain text above it.
- Ensure all content is clean, readable, and compatible with standard Markdown viewers.
[BEHAVIOR EXAMPLES - MIMIC THIS EXACTLY]:

<Example 1>
Student: "How do I calculate the area of a circle?"
Tutor (Tool Call): update_blackboard(content: "**Area of a Circle**\nArea = Pi * r^2")
Tutor (Audio): "It's quite simple. As you can see on the board, the formula is Pi times the radius squared."
</Example 1>

<Example 2>
Student: "Tell me about Photosynthesis."
Tutor (Tool Call): consult_knowledge_base(query: "Photosynthesis definition")
Tutor (Audio): "Let's look at the official definition from your notes. Essentially, it's how plants convert light into energy..."
</Example 2>

<Example 3>
Student: "I don't understand."
Tutor (Tool Call): update_blackboard(content: "- Step 1: Identify variables\n- Step 2: Plug into formula\n- Step 3: Solve")
Tutor (Audio): "That's okay! I've broken it down into three steps on the screen. Let's tackle Step 1 together."
</Example 3>

<Example 4>
Student: "How do I calculate the area of a circle?"
Tutor (Tool Call): update_blackboard(content: "Area = Pi * r^2")
Tutor (Audio): "It's quite simple. As you can see on the board, the formula is Pi times the radius squared."
</Example 4>

<Example 5>
Student: "Add these fractions."
Tutor (Tool Call): update_blackboard(content: "**Adding Fractions**\n1/4 + 2/4 = 3/4")
Tutor (Audio): "Since the denominators are the same, we simply add the top numbers."
</Example 5>


[BACKUP PLAN]:
1. **Text/Formulas:** If \`consult_knowledge_base\` fails, use \`update_blackboard\` with your own knowledge.

  [CORE PROMPT]:
    ${prompt}
  `;

    try {
      session.current = await client.current.live.connect({
        model,
        callbacks: {
          onopen: () => {
            sessionOpen.current = true;
            console.log('Session opened successfully');
            updateStatus('Connection opened. Press record to start the session.');
          },
          onmessage: async (message: LiveServerMessage) => {
            let pendingToolResponses: Array<{ name?: string; id?: string; response: object }> = [];
            try {
              if (message.serverContent && !message.serverContent.interrupted) {
                isInterruptedRef.current = false;
              }

              // 1. Handle API variation (toolCall vs toolCalls)
              const toolCallData = message.toolCall || (message as any).toolCalls;

              // 2. Use toolCallData instead of message.toolCall
              if (toolCallData && toolCallData.functionCalls) {
                try {
                  console.log('[Tool Debug] Received tool calls:', toolCallData.functionCalls);

                  // Process all tool calls in parallel and collect responses
                  const functionResponses = await Promise.all(toolCallData.functionCalls.map(async (call: any) => {
                    console.log(`[Tool Debug] Processing call: ${call.name} (ID: ${call.id})`);

                    if (call.name === 'consult_knowledge_base') {
                      try {
                        const { query } = call.args as { query: string };
                        updateStatus(`Searching knowledge base for: "${query}"...`);

                        const loadingId = uuidv4();
                        setVisualContexts(prev => [...prev, {
                          id: loadingId,
                          type: 'loading' as const,
                          content: `Searching: ${query} `,
                          source: 'database' as const,
                          timestamp: new Date()
                        }]);
                        setIsPanelOpen(true);

                        let searchIds: number[] = [];
                        if (topicId === -1 && subject) {
                          try {
                            const accessibleTopics = await getTopics(subject, level);
                            if (Array.isArray(accessibleTopics)) {
                              searchIds = accessibleTopics.map((t: any) => t.id);
                            }
                          } catch (e) { searchIds = []; }
                        } else {
                          searchIds = [topicId];
                        }

                        const results = await searchResources(query, searchIds);
                        console.log('[RAG Debug] searchResources results:', results);

                        const isValidArray = Array.isArray(results);

                        if (!results || !isValidArray || results.length === 0) {
                          console.warn('[RAG Debug] Result text is empty or error returned, using fallback.');
                        }

                        let resultText = "";
                        if (isValidArray && results.length > 0) {
                          resultText = results.join('\n\n');
                        } else {
                          resultText = "No relevant information found in the knowledge base.";
                        }

                        setVisualContexts(prev => prev.map(ctx =>
                          ctx.id === loadingId ? { ...ctx, type: 'source_text' as const, content: resultText } : ctx
                        ));

                        return {
                          name: 'consult_knowledge_base',
                          id: call.id,
                          response: { result: resultText }
                        };
                      } catch (err) {
                        console.error('[Tool Debug] Error in consult_knowledge_base:', err);
                        return {
                          name: 'consult_knowledge_base',
                          id: call.id,
                          response: { error: 'Internal Error' }
                        };
                      }

                    } else if (call.name === 'update_blackboard') {
                      try {
                         // 1. Robust Argument Parsing (Handle string vs object)
                         const args = call.args as any;
                         const content = typeof args === 'string' ? JSON.parse(args).content : args?.content;
                         
                         console.log('[Tool Debug] Blackboard content:', content);
 
                         if (content) {
                             setVisualContexts(prev => [...prev, {
                               id: uuidv4(),
                               type: 'formula' as const,
                               content: String(content),
                               source: 'generated' as const,
                               timestamp: new Date()
                             }]);
                             setIsPanelOpen(true);
                         }
 
                         // 2. Return 'result' instead of 'success'
                         return {
                           name: 'update_blackboard',
                           id: call.id,
                           response: { result: "Blackboard updated successfully" }
                         };
                      } catch (err) {
                        console.error('[Tool Debug] Error in update_blackboard:', err);
                        return { name: 'update_blackboard', id: call.id, response: { error: 'Failed' } };
                      }
                    }

                    // Fallback for unknown tools
                    console.warn(`[Tool Debug] Unknown tool: ${call.name}`);
                    return {
                      name: call.name,
                      id: call.id,
                      response: { error: 'Unknown tool' }
                    };
                  }));

                  pendingToolResponses = [...functionResponses];
                } catch (mainErr) {
                  console.error('[Tool Debug] Major error in tool processing loop:', mainErr);
                }
              }

              // 3. Handle Audio Content
              const serverContent = message.serverContent;
              if (serverContent) {
                if (serverContent.interrupted) {
                  console.log('[Gemini Debug] Interruption detected. Clearing audio and pending tools.');
                  isInterruptedRef.current = true;
                  sources.current.forEach(source => source.stop());
                  sources.current.clear();
                  nextStartTime.current = 0;
                  pendingToolResponses = [];
                }

                const modelTurn = serverContent.modelTurn;
                if (modelTurn?.parts) {
                  for (const part of modelTurn.parts) {
                    const audio = part.inlineData;
                    if (!audio?.data || !audio.mimeType?.includes('audio')) continue;
                    if (audioContext.current && outputNode.current) {
                      try {
                        const audioBuffer = await decodeAudioData(
                          decode(audio.data ?? ''),
                          audioContext.current,
                          24000,
                          1
                        );
                        const source = audioContext.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNode.current);
                        if (mixedStreamDestinationRef.current) source.connect(mixedStreamDestinationRef.current);
                        source.addEventListener('ended', () => sources.current.delete(source));
                        
                        // Ensure smooth playback time
                        const currentTime = audioContext.current.currentTime;
                        if (nextStartTime.current < currentTime) {
                            nextStartTime.current = currentTime;
                        }
                        
                        source.start(nextStartTime.current);
                        nextStartTime.current += audioBuffer.duration;
                        sources.current.add(source);
                      } catch (e) {
                        console.warn('[Gemini Debug] Failed to decode/play AI audio:', e);
                      }
                    }
                  }
                }
              }

              // 4. Send Tool Responses (Delayed slightly to ensure processing order)
              if (pendingToolResponses.length > 0) {
                const responses = pendingToolResponses;
                const sessionRef = session.current;
                
                // Reduced timeout to 0 to send immediately after processing current message loop
                setTimeout(() => {
                  if (!sessionRef || !sessionOpen.current) return;
                  if (isInterruptedRef.current) {
                    console.warn('[Gemini Debug] Aborted sending tool response due to interruption.');
                    return;
                  }
                  try {
                    console.log('[Tool Debug] Sending tool responses:', responses.length);
                    sessionRef.sendToolResponse({ functionResponses: responses });
                  } catch (sendErr: any) {
                    console.error('[Tool Debug] Error sending tool response:', sendErr);
                  }
                }, 0);
              }

            } catch (err) {
              console.error('[Gemini Debug] onmessage error:', err);
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('[Gemini Debug] Session error:', e.message);
            updateError(e.message);
          },
          onclose: (e: CloseEvent) => {
            sessionOpen.current = false;
            session.current = null;
            console.warn('[Gemini Debug] Session closed — code:', e.code, 'reason:', e.reason || '(none)', 'wasClean:', e.wasClean);
            updateStatus('Session closed.');
            if (isRecordingRef.current) stopConversation();
          },
        },
        config: {
          systemInstruction: enhancedPrompt,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } },
          },
          // Keep session open for multi-turn; without this the server may close after one turn
          contextWindowCompression: { slidingWindow: {} },
          tools: [{
            functionDeclarations: [
              {
                name: 'consult_knowledge_base',
                description: 'Consult the topic-specific knowledge base (documents, flashcards, past papers) to provide accurate information.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    query: {
                      type: Type.STRING,
                      description: 'The search query to look up in the knowledge base.'
                    }
                  },
                  required: ['query']
                }
              },
              {
                name: 'update_blackboard',
                description: 'Display a math formula, equation, or teaching note on the student\'s blackboard. Content should be in Markdown/LaTeX.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    content: {
                      type: Type.STRING,
                      description: 'The Markdown or LaTeX content to display.'
                    }
                  },
                  required: ['content']
                }
              },
            ]
          }]
        },
      });
    } catch (e: any) {
      updateError(e.message);
    }
  }, [prompt, stopConversation]);

  const startConversation = useCallback(async () => {
    if (isRecording) return;
    if (!isAllowed) {
      updateError('You have reached your session limit. Please upgrade.');
      return;
    }
    if (!session.current || !sessionOpen.current) {
      updateError('Session not ready. Please wait.');
      return;
    }

    isStartingConversationRef.current = true;
    // Tracking
    if (!hasTrackedSession) {
      const { trackFeatureUsageAction } = require('@/app/(dashboard)/usage-actions');
      const res = await trackFeatureUsageAction('voiceTutor');
      if (!res.success) {
        isStartingConversationRef.current = false;
        updateError(`❌ ${res.error || "Failed to start session. Limit reached."} `);
        return;
      }
      setHasTrackedSession(true);
    }

    audioContext.current?.resume();
    updateStatus('Requesting microphone...');
    try {
      mediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined
        }
      });
      updateStatus('Microphone access granted.');

      if (!audioContext.current) {
        //updateError('Audio context not initialized');
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ 
          sampleRate: 16000 
        });
        //return;
      }

      // Detect the ACTUAL sample rate the browser gave us (e.g., 48000 or 44100)
      const currentSampleRate = audioContext.current.sampleRate;
      console.log(`[Gemini Debug] Audio Sample Rate: ${currentSampleRate}Hz`);

      mixedStreamDestinationRef.current = audioContext.current.createMediaStreamDestination();

      const micSourceNode = audioContext.current.createMediaStreamSource(mediaStream.current);
      micSourceNode.connect(mixedStreamDestinationRef.current);

      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(mixedStreamDestinationRef.current.stream, {
        mimeType: 'audio/webm'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const fullAudioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          onConversationEnd(fullAudioBlob);
        } else {
          // Handle case where no audio was captured
          onConversationEnd(new Blob([], { type: 'audio/webm' }));
        }
        audioChunksRef.current = [];
      };

      // Note: ScriptProcessorNode is deprecated but used here for simplicity.
      // For production apps, consider migrating to AudioWorklet.
      scriptProcessorNode.current = audioContext.current.createScriptProcessor(4096, 1, 1);

      // We still need a source node for sending data to Gemini, separate from the one for recording
      const geminiSourceNode = audioContext.current.createMediaStreamSource(mediaStream.current);
      geminiSourceNode.connect(scriptProcessorNode.current);

      // Create a gain node and analyser for volume level visualization
      const volumeAnalyserNode = audioContext.current.createAnalyser();
      volumeAnalyserNode.fftSize = 256;
      geminiSourceNode.connect(volumeAnalyserNode);

      const dataArray = new Uint8Array(volumeAnalyserNode.frequencyBinCount);
      const updateVolume = () => {
        if (!isRecordingRef.current) return;
        volumeAnalyserNode.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setVolumeLevel(average);
        requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // Connect to the destination to keep the processing chain alive, but with gain 0 to avoid echo.
      const muteNode = audioContext.current.createGain();
      muteNode.gain.setValueAtTime(0, audioContext.current.currentTime);
      scriptProcessorNode.current.connect(muteNode);
      muteNode.connect(audioContext.current.destination);

      scriptProcessorNode.current.onaudioprocess = (event) => {
        if (!isRecordingRef.current || !session.current || !sessionOpen.current) return;
        try {
          const pcmData = event.inputBuffer.getChannelData(0);
          session.current.sendRealtimeInput({ media: createBlob(pcmData) });
        } catch (err: any) {
          // Socket may be CLOSING/CLOSED; avoid spamming and don't let this cascade
          if (err?.message?.includes('CLOSING') || err?.message?.includes('CLOSED')) return;
          console.warn('[Gemini Debug] Audio processing error:', err);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      updateStatus('🔴 Live Conversation... Speak now!');
    } catch (err: any) {
      updateError(`Microphone error: ${err.message}.`);
    } finally {
      isStartingConversationRef.current = false;
    }
  }, [isRecording, onConversationEnd]);

  useEffect(() => {
    if (isEnding && isRecording) {
      stopConversation();
    }
  }, [isEnding, isRecording, stopConversation]);

  const reset = useCallback(() => {
    stopConversation();
    initSession();
  }, [initSession, stopConversation]);

  // --- NEW FEATURE 1: FORCE UPDATE FUNCTION ---
  const handleForceUpdate = useCallback(() => {
    if (session.current && sessionOpen.current) {
      updateStatus('Syncing board...');
      session.current.sendClientContent({
        turns: "SYSTEM_COMMAND: Update the blackboard with the current math or topic summary immediately.",
        turnComplete: true,
      });
    } else {
      updateError('Start session first to sync.');
    }
  }, []);

  useEffect(() => {
    isUnmounted.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // --- FIX 1 (cont.): Initialize only ONE AudioContext ---
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

    // Create all nodes from this single context
    if (audioContext.current) {
      outputNode.current = audioContext.current.createGain();
      outputNode.current.connect(audioContext.current.destination);

      const inputGainNode = audioContext.current.createGain(); // For analyser
      inputAnalyser.current = new Analyser(inputGainNode);
      outputAnalyser.current = new Analyser(outputNode.current);
    }

    client.current = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_API_KEY || '' });

    // ... The rest of your THREE.js setup code remains unchanged ...
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x100c14);
    const back = new THREE.Mesh(
      new THREE.IcosahedronGeometry(10, 5),
      new THREE.RawShaderMaterial({
        uniforms: {
          resolution: { value: new THREE.Vector2(0, 0) },
          rand: { value: 0 },
        },
        vertexShader: backdropVS, fragmentShader: backdropFS, glslVersion: THREE.GLSL3, side: THREE.BackSide,
      }),
    );
    scene.add(back);
    backdrop.current = back;
    camera.current = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.current.position.set(0, 0, 5);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    const geometry = new THREE.IcosahedronGeometry(1, 10);
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0x000010, metalness: 0.5, roughness: 0.1, emissive: 0x000010, emissiveIntensity: 1.5,
    });
    new EXRLoader().load('/piz_compressed.exr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      const exrCubeRenderTarget = pmremGenerator.fromEquirectangular(texture);
      sphereMaterial.envMap = exrCubeRenderTarget.texture;
      if (sphere.current) sphere.current.visible = true;
    }, undefined, (error) => {
      console.warn('Failed to load EXR texture:', error);
      if (sphere.current) sphere.current.visible = true;
    });
    sphereMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.time = { value: 0 };
      shader.uniforms.inputData = { value: new THREE.Vector4() };
      shader.uniforms.outputData = { value: new THREE.Vector4() };
      sphereMaterial.userData.shader = shader;
      shader.vertexShader = sphereVS;
    };
    sphere.current = new THREE.Mesh(geometry, sphereMaterial);
    sphere.current.visible = false;
    scene.add(sphere.current);
    const renderPass = new RenderPass(scene, camera.current);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 5, 0.5, 0);
    composer.current = new EffectComposer(renderer);
    composer.current.addPass(renderPass);
    composer.current.addPass(bloomPass);
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (!camera.current || !renderer || !composer.current || !backdrop.current) return;
        camera.current.aspect = width / height;
        camera.current.updateProjectionMatrix();
        renderer.setSize(width, height);
        composer.current.setSize(width, height);
        const dPR = renderer.getPixelRatio();
        (backdrop.current.material as THREE.RawShaderMaterial).uniforms.resolution.value.set(width * dPR, height * dPR);
      }
    });
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
    const animate = () => {
      if (isUnmounted.current) return;
      animationFrameId.current = requestAnimationFrame(animate);
      if (!inputAnalyser.current || !outputAnalyser.current || !sphere.current || !backdrop.current || !composer.current || !camera.current) return;
      inputAnalyser.current.update();
      outputAnalyser.current.update();
      const t = performance.now();
      const dt = (t - prevTime.current) / (1000 / 60);
      prevTime.current = t;
      (backdrop.current.material as THREE.RawShaderMaterial).uniforms.rand.value = Math.random() * 10000;
      const sphereMaterial = sphere.current.material as THREE.MeshStandardMaterial;
      if (sphereMaterial.userData.shader) {
        sphere.current.scale.setScalar(1 + (0.2 * outputAnalyser.current.data[1]) / 255);
        const f = 0.001;
        rotation.current.x += (dt * f * 0.5 * outputAnalyser.current.data[1]) / 255;
        rotation.current.z += (dt * f * 0.5 * inputAnalyser.current.data[1]) / 255;
        rotation.current.y += (dt * f * 0.25 * (inputAnalyser.current.data[2] + outputAnalyser.current.data[2])) / 255;
        camera.current.position.set(0, 0, 5);
        sphereMaterial.userData.shader.uniforms.time.value += (dt * 0.1 * outputAnalyser.current.data[0]) / 255;
        sphereMaterial.userData.shader.uniforms.inputData.value.set(
          (1 * inputAnalyser.current.data[0]) / 255, (0.1 * inputAnalyser.current.data[1]) / 255, (10 * inputAnalyser.current.data[2]) / 255, 0
        );
        sphereMaterial.userData.shader.uniforms.outputData.value.set(
          (2 * outputAnalyser.current.data[0]) / 255, (0.1 * outputAnalyser.current.data[1]) / 255, (10 * outputAnalyser.current.data[2]) / 255, 0
        );
      }
      composer.current.render();
    };
    animate();

    return () => {
      isUnmounted.current = true;
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (canvas.parentElement) resizeObserver.unobserve(canvas.parentElement);

      scriptProcessorNode.current?.disconnect();
      mediaStream.current?.getTracks().forEach((track) => track.stop());
      session.current?.close();
      audioContext.current?.close();
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, []);

  // Only init when we have a prompt; do NOT close session in cleanup — that was ending calls abruptly
  // (e.g. effect re-run or Strict Mode). Session is closed on unmount by the canvas effect and in
  // stopConversation / at the start of initSession when reconnecting.
  useEffect(() => {
    if (!prompt) return;
    // Don’t reconnect while user is in a call — avoid tearing down session mid-conversation
    if (isRecordingRef.current || isStartingConversationRef.current) return;
    if (session.current && sessionOpen.current) return;
    initSession();
  }, [prompt, initSession]);

  return (
    <div className="w-full h-[600px] flex flex-col md:flex-row bg-[#100c14] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">

      {/* --- NEW FEATURE 2: TOGGLE BOARD BUTTON (Top Right) --- */}
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="absolute top-4 right-4 z-[50] flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-md border border-white/10 transition-all shadow-lg active:scale-95"
      >
        <LayoutGrid size={18} />
        <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
          {isPanelOpen ? "Hide Board" : "Show Board"}
        </span>
      </button>

           {isPanelOpen && (
        <button
          onClick={handleForceUpdate}
          className="absolute top-4 left-10 z-[60] flex items-center gap-2 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-100 backdrop-blur-md border border-emerald-500/30 transition-all shadow-lg active:scale-95"
          title="Force AI to update the blackboard"
        >
          <RefreshCw size={14} className={status.includes('Syncing') ? 'animate-spin' : ''} />
          <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
            Sync Active Context Board
          </span>
        </button>
      )}

      {/* Main Tutor Area */}
      <div className="flex-1 relative min-h-[400px]">
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
        <div id="status" style={{ position: 'absolute', bottom: '2vh', left: 0, right: 0, zIndex: 10, textAlign: 'center', color: 'white', fontSize: '14px', opacity: 0.8 }}>
          {error || status}
        </div>
        <div className="controls" style={{ zIndex: 20, position: 'absolute', bottom: '8vh', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
          <button id="resetButton" onClick={reset} aria-label="Reset Session" style={{ outline: 'none', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.1)', width: '48px', height: '48px', cursor: 'pointer', fontSize: '24px', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#ffffff"><path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" /></svg>
          </button>
          {!isRecording ? (
            <button id="startButton" onClick={startConversation} aria-label="Start Recording" style={{ outline: 'none', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', width: '56px', height: '56px', cursor: 'pointer', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 100 100" width="32px" height="32px" fill="#c80000" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" /></svg>
            </button>
          ) : (
            <button id="stopButton" onClick={reset} aria-label="Stop Recording" style={{ outline: 'none', border: '1px solid rgba(255, 50, 50, 0.5)', color: 'white', borderRadius: '50%', background: 'rgba(200, 0, 0, 0.2)', width: '56px', height: '56px', cursor: 'pointer', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '20px', height: '20px', background: '#ef4444', borderRadius: '4px' }}></div>
            </button>
          )}

          {/* Visual Volume Meter and Settings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
            {isRecording && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Volume2 size={16} color="white" />
                <div style={{ width: '100px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, volumeLevel * 2)}% `,
                    height: '100%',
                    background: volumeLevel > 50 ? '#ef4444' : '#22c55e',
                    transition: 'width 0.1s ease-out, background 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                background: showSettings ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                transition: 'all 0.2s ease'
              }}
            >
              <Settings size={20} />
            </button>
          </div>

          {/* Device Selection Dropdown */}
          {showSettings && (
            <div style={{
              position: 'absolute',
              bottom: '70px',
              background: 'rgba(20, 20, 25, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '12px',
              width: '280px',
              zIndex: 100,
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }}>
              <p style={{ color: 'white', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Select Microphone
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {audioDevices.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '8px' }}>No microphones found</p>
                ) : (
                  audioDevices.map(device => (
                    <button
                      key={device.deviceId}
                      onClick={() => {
                        setSelectedDeviceId(device.deviceId);
                        setShowSettings(false);
                        if (isRecording) {
                          // Restart conversation if device changed while recording
                          reset();
                        }
                      }}
                      style={{
                        background: selectedDeviceId === device.deviceId ? 'rgba(255,255,255,0.1)' : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: 'white',
                        fontSize: '14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                        {device.label || `Microphone ${device.deviceId.substring(0, 5)}...`}
                      </span>
                      {selectedDeviceId === device.deviceId && <Check size={14} color="#22c55e" />}
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => enumerateDevices()}
                style={{
                  marginTop: '8px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '6px',
                  color: 'white',
                  fontSize: '11px',
                  width: '100%',
                  cursor: 'pointer',
                  opacity: 0.6
                }}
              >
                Refresh Device List
              </button>
            </div>
          )}

          {isRecording && <div style={{ color: 'white', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', opacity: 0.8 }}>Conversation is being recorded</div>}
        </div>
      </div>

      {/* Side Context Panel Area */}

      <div 
        className={`
          flex flex-col h-full border-l border-white/10 transition-all duration-300
          
          /* Mobile: Absolute layout, high z-index, solid background to cover the 3D sphere */
          absolute top-15 right-0 z-40 bg-[#100c14]
          
          /* Desktop: Relative, RESET TOP TO 0, transparent background */
          md:relative md:top-0 md:bg-transparent md:z-auto
          
          /* Open/Close Width Logic */
          ${isPanelOpen ? 'w-full md:w-[400px]' : 'w-0 overflow-hidden'}
        `}
      >

        <ActiveContextPanel
          contexts={visualContexts}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
        />
      </div>
    </div>
  );
}