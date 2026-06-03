'use client';
/**
 * live-simulation-component.tsx
 * 
 * FIX 1 APPLIED: ScriptProcessorNode → AudioWorkletNode
 * The audio capture now runs on a dedicated audio thread.
 * Buffer size: 2048 samples (128ms) — was 4096 (256ms).
 */

import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { useCallback, useEffect, useRef, useState } from 'react';
import { decode, decodeAudioData } from '@/lib/utils';
import { int16ArrayToBase64, createPCMBlob } from '@/lib/audio-utils';
import { Analyser } from '@/lib/analyser';
import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
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
  // Fix 2 & 3: lesson state passed in from parent
  onLessonProgressUpdate?: (progress: LessonProgress) => void;
  initialLessonProgress?: LessonProgress | null;
}

// Fix 2: The lesson progress structure we track outside the AI's memory
export interface LessonProgress {
  topicsIntroduced: string[];
  topicsConfirmed: string[];
  currentTopic: string;
  studentMisconceptions: string[];
  lastSummary: string;
  sessionCount: number;
}

const DEFAULT_LESSON_PROGRESS: LessonProgress = {
  topicsIntroduced: [],
  topicsConfirmed: [],
  currentTopic: '',
  studentMisconceptions: [],
  lastSummary: '',
  sessionCount: 0,
};

export default function LiveAudioComponent({
  prompt,
  topicId,
  subject,
  level,
  onConversationEnd,
  isEnding,
  onLessonProgressUpdate,
  initialLessonProgress,
}: LiveAudioComponentProps) {
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

  // Fix 2: Lesson progress tracked in React state (outside AI memory)
  const [lessonProgress, setLessonProgress] = useState<LessonProgress>(
    initialLessonProgress || DEFAULT_LESSON_PROGRESS
  );
  const lessonProgressRef = useRef<LessonProgress>(
    initialLessonProgress || DEFAULT_LESSON_PROGRESS
  );

  // Fix 3: Session timer ref for proactive handoff
  const sessionStartTimeRef = useRef<number | null>(null);
  const handoffTriggeredRef = useRef(false);

  // ─── Usage limit check ────────────────────────────────────────────────────
  useEffect(() => {
    const { checkFeatureAllowedAction } = require('@/app/(dashboard)/usage-actions');
    async function checkLimit() {
      const res = await checkFeatureAllowedAction('voiceTutor');
      if (!res.allowed) {
        setIsAllowed(false);
        setError(`⚠️ Usage Limit Reached: ${res.error || 'Please upgrade your plan.'}`);
      }
    }
    checkLimit();
  }, []);

  // ─── Device enumeration ───────────────────────────────────────────────────
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(d => d.kind === 'audioinput');
      setAudioDevices(mics);
      if (mics.length > 0) {
        const stillExists = mics.find(m => m.deviceId === selectedDeviceId);
        if (!stillExists) setSelectedDeviceId(mics[0].deviceId);
      }
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    enumerateDevices();
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
  }, [enumerateDevices]);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const client = useRef<GoogleGenAI | null>(null);
  const session = useRef<any>(null);

  const audioContext = useRef<AudioContext | null>(null);
  const outputNode = useRef<GainNode | null>(null);
  const nextStartTime = useRef(0);
  const mediaStream = useRef<MediaStream | null>(null);

  // FIX 1: AudioWorkletNode replaces ScriptProcessorNode
  const audioWorkletNode = useRef<AudioWorkletNode | null>(null);

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
  const isInterruptedRef = useRef(false);

  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;
  const isStartingConversationRef = useRef(false);

  const pendingToolCallsRef = useRef(0);
  const isReconnectingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  const updateStatus = (msg: string) => { console.log('[Status]', msg); setStatus(msg); };
  const updateError  = (msg: string) => { console.error('[Error]', msg); setError(msg); };

  // ─── Fix 2: Update lesson progress helper ────────────────────────────────
  const updateLessonProgress = useCallback((updates: Partial<LessonProgress>) => {
    setLessonProgress(prev => {
      const next = { ...prev, ...updates };
      lessonProgressRef.current = next;
      // Notify parent (for DB save in Fix 3)
      onLessonProgressUpdate?.(next);
      return next;
    });
  }, [onLessonProgressUpdate]);

  // ─── Fix 2: Build lesson progress summary string for injection ───────────
  const buildProgressSummary = useCallback((progress: LessonProgress): string => {
    if (
      progress.topicsIntroduced.length === 0 &&
      progress.currentTopic === '' &&
      progress.lastSummary === ''
    ) {
      return ''; // No progress yet — fresh lesson
    }

    let summary = '\n\n--- LESSON PROGRESS (do not repeat covered content) ---\n';
    if (progress.sessionCount > 1) {
      summary += `This is session ${progress.sessionCount} — you are CONTINUING a lesson, not starting a new one.\n`;
    }
    if (progress.currentTopic) {
      summary += `Currently teaching: "${progress.currentTopic}"\n`;
    }
    if (progress.topicsConfirmed.length > 0) {
      summary += `Student has confirmed understanding of: ${progress.topicsConfirmed.join(', ')}\n`;
    }
    if (progress.topicsIntroduced.length > 0) {
      summary += `Topics introduced (may not be confirmed yet): ${progress.topicsIntroduced.join(', ')}\n`;
    }
    if (progress.studentMisconceptions.length > 0) {
      summary += `Student misconceptions to revisit: ${progress.studentMisconceptions.join(', ')}\n`;
    }
    if (progress.lastSummary) {
      summary += `\nLast session summary: ${progress.lastSummary}\n`;
    }
    summary += '--- Do NOT re-introduce topics listed as confirmed above ---\n';

    return summary;
  }, []);

  // ─── Stop conversation ────────────────────────────────────────────────────
  const stopConversation = useCallback(() => {
    if (!isRecordingRef.current) return;
    isStartingConversationRef.current = false;
    isReconnectingRef.current = false;
    reconnectAttemptsRef.current = 0;
    setIsRecording(false);
    updateStatus('Ending conversation and preparing audio...');

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // FIX 1: Disconnect AudioWorkletNode instead of ScriptProcessorNode
    if (audioWorkletNode.current) {
      audioWorkletNode.current.disconnect();
      audioWorkletNode.current.port.onmessage = null;
      audioWorkletNode.current = null;
    }

    mediaStream.current?.getTracks().forEach(t => t.stop());
    try { session.current?.close(); } catch (_) {}
    session.current = null;
    sessionOpen.current = false;
    mediaStream.current = null;
    sessionStartTimeRef.current = null;
    handoffTriggeredRef.current = false;
  }, []);

  // ─── Build system prompt (with Fix 2 progress injection) ─────────────────
  const buildSystemPrompt = useCallback((userPrompt: string, progress?: LessonProgress) => {
    const PROMPT_CHAR_LIMIT = 1500;
    const safePrompt = userPrompt.length > PROMPT_CHAR_LIMIT
      ? userPrompt.slice(0, PROMPT_CHAR_LIMIT) +
        '\n[Full curriculum is available via the consult_knowledge_base tool.]'
      : userPrompt;

    // Fix 2: Inject lesson progress summary so model knows where we are
    const progressSummary = progress ? buildProgressSummary(progress) : '';

    return `You are a Visual-First Private Tutor who uses Dual Coding (Visuals + Audio).

GOLDEN RULE: Always call a tool BEFORE speaking.
- Formulas / worked examples / bullet lists → call update_blackboard first, then speak.
- Subject facts / syllabus content / past-paper answers → call consult_knowledge_base first, then speak.
- On any "[SYSTEM COMMAND]" message → immediately call update_blackboard with the current topic summary.

AUDIO CUES: Begin sentences with "As I've written on the board…" or "As you can see on the screen…"

PROACTIVE TRIGGERS:
- Maths/Physics → show formula + step-by-step working on board.
- Definitions → show definition text on board.
- Explanation >10 seconds → show bullet summary on board.

BLACKBOARD FORMATTING (Markdown only — NO LaTeX, NO dollar signs):
- Exponents: x^2   Fractions: 1/2   Bold answers: **answer**
- Headers: #   Bullet lists: -

TUTOR CONTEXT:
${safePrompt}${progressSummary}`.trim();
  }, [buildProgressSummary]);

  // ─── Init session ─────────────────────────────────────────────────────────
  const initSession = useCallback(async (progressOverride?: LessonProgress) => {
    if (!client.current) return;

    if (session.current) {
      try { session.current.close(); } catch (_) {}
      session.current = null;
      sessionOpen.current = false;
    }

    updateStatus('Connecting to Gemini...');

    const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
    if (!apiKey) { updateError('API key not found.'); return; }

    // Use progressOverride (from handoff) or current ref value
    const currentProgress = progressOverride || lessonProgressRef.current;
    const systemInstruction = buildSystemPrompt(prompt, currentProgress);

    try {
      session.current = await client.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            sessionOpen.current = true;
            reconnectAttemptsRef.current = 0;
            console.log('[Session] Opened successfully');
            if (isRecordingRef.current) {
              updateStatus('🔴 Live Conversation… Speak now!');
            } else {
              updateStatus('Ready — press record to start.');
            }
          },

          onmessage: async (message: LiveServerMessage) => {
            try {
              if (message.serverContent && !message.serverContent.interrupted) {
                isInterruptedRef.current = false;
              }

              if (message.serverContent?.interrupted) {
                console.log('[Session] Interruption received — clearing audio queue');
                isInterruptedRef.current = true;
                sources.current.forEach(s => { try { s.stop(); } catch (_) {} });
                sources.current.clear();
                nextStartTime.current = 0;
                return;
              }

              const toolCallData = message.toolCall || (message as any).toolCalls;
              if (toolCallData?.functionCalls?.length) {
                setIsPanelOpen(true);
                pendingToolCallsRef.current += toolCallData.functionCalls.length;

                const functionResponses = await Promise.all(
                  toolCallData.functionCalls.map(async (call: any) => {
                    console.log(`[Tool] Handling: ${call.name}`);

                    if (call.name === 'consult_knowledge_base') {
                      const { query } = call.args as { query: string };
                      const loadingId = uuidv4();
                      updateStatus(`Searching: "${query}"…`);
                      setVisualContexts(prev => [...prev, {
                        id: loadingId, type: 'loading' as const,
                        content: `Searching: ${query}`, source: 'database' as const,
                        timestamp: new Date(),
                      }]);

                      try {
                        let searchIds: number[] = [];
                        if (topicId === -1 && subject) {
                          try {
                            const accessibleTopics = await getTopics(subject, level);
                            if (Array.isArray(accessibleTopics)) {
                              searchIds = accessibleTopics.map((t: any) => t.id);
                            }
                          } catch { searchIds = []; }
                        } else {
                          searchIds = [topicId];
                        }
                        const results = await searchResources(query, searchIds);
                        const resultText = Array.isArray(results) && results.length > 0
                          ? results.join('\n\n')
                          : 'No relevant information found.';

                        setVisualContexts(prev =>
                          prev.map(ctx => ctx.id === loadingId
                            ? { ...ctx, type: 'source_text' as const, content: resultText }
                            : ctx)
                        );
                        updateStatus('🔴 Live Conversation… Speak now!');
                        return { id: call.id, name: call.name, response: { output: resultText } };
                      } catch (err) {
                        console.error('[Tool] consult_knowledge_base error:', err);
                        setVisualContexts(prev =>
                          prev.map(ctx => ctx.id === loadingId
                            ? { ...ctx, type: 'source_text' as const, content: 'Search failed.' }
                            : ctx)
                        );
                        return { id: call.id, name: call.name, response: { output: 'Search failed.' } };
                      }

                    } else if (call.name === 'update_blackboard') {
                      try {
                        const args = call.args as any;
                        const content = typeof args === 'string'
                          ? JSON.parse(args).content
                          : args?.content;

                        if (content) {
                          setVisualContexts(prev => [...prev, {
                            id: uuidv4(), type: 'formula' as const,
                            content: String(content), source: 'generated' as const,
                            timestamp: new Date(),
                          }]);

                          // Fix 2: Extract topic from blackboard content and update progress
                          const topicMatch = content.match(/^#\s+(.+)/m);
                          if (topicMatch) {
                            const detectedTopic = topicMatch[1].trim();
                            updateLessonProgress({
                              currentTopic: detectedTopic,
                              topicsIntroduced: [
                                ...new Set([
                                  ...lessonProgressRef.current.topicsIntroduced,
                                  detectedTopic,
                                ]),
                              ],
                            });
                          }
                        }
                        return { id: call.id, name: call.name, response: { output: 'Blackboard updated.' } };
                      } catch (err) {
                        console.error('[Tool] update_blackboard error:', err);
                        return { id: call.id, name: call.name, response: { output: 'Failed.' } };
                      }

                    } else if (call.name === 'confirm_topic_understood') {
                      // Fix 2: New tool — model calls this when student confirms understanding
                      try {
                        const args = call.args as any;
                        const topic = typeof args === 'string' ? JSON.parse(args).topic : args?.topic;
                        if (topic) {
                          updateLessonProgress({
                            topicsConfirmed: [
                              ...new Set([
                                ...lessonProgressRef.current.topicsConfirmed,
                                topic,
                              ]),
                            ],
                          });
                        }
                        return { id: call.id, name: call.name, response: { output: `Confirmed: ${topic}` } };
                      } catch (err) {
                        return { id: call.id, name: call.name, response: { output: 'Failed.' } };
                      }

                    } else if (call.name === 'save_lesson_summary') {
                      // Fix 3: Model calls this when we send the 8-minute handoff command
                      try {
                        const args = call.args as any;
                        const summary = typeof args === 'string'
                          ? JSON.parse(args).summary
                          : args?.summary;
                        if (summary) {
                          updateLessonProgress({ lastSummary: summary });
                          console.log('[Handoff] Summary saved:', summary);
                        }
                        return { id: call.id, name: call.name, response: { output: 'Summary saved.' } };
                      } catch (err) {
                        return { id: call.id, name: call.name, response: { output: 'Failed.' } };
                      }

                    } else {
                      console.warn('[Tool] Unknown tool:', call.name);
                      return { id: call.id, name: call.name, response: { output: 'Unknown tool.' } };
                    }
                  })
                );

                pendingToolCallsRef.current -= toolCallData.functionCalls.length;

                if (session.current && sessionOpen.current && !isInterruptedRef.current) {
                  try {
                    session.current.sendToolResponse({ functionResponses });
                  } catch (err: any) {
                    console.error('[Tool] sendToolResponse error:', err);
                  }
                }
              }

              // Audio playback
              const modelTurn = message.serverContent?.modelTurn;
              if (modelTurn?.parts) {
                for (const part of modelTurn.parts) {
                  const audio = part.inlineData;
                  if (!audio?.data || !audio.mimeType?.includes('audio')) continue;
                  if (!audioContext.current || !outputNode.current) continue;

                  try {
                    const audioBuffer = await decodeAudioData(
                      decode(audio.data ?? ''),
                      audioContext.current,
                      24000, 1
                    );
                    const source = audioContext.current.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputNode.current);
                    if (mixedStreamDestinationRef.current) {
                      source.connect(mixedStreamDestinationRef.current);
                    }
                    source.addEventListener('ended', () => sources.current.delete(source));
                    const currentTime = audioContext.current.currentTime;
                    if (nextStartTime.current < currentTime) nextStartTime.current = currentTime;
                    source.start(nextStartTime.current);
                    nextStartTime.current += audioBuffer.duration;
                    sources.current.add(source);
                  } catch (e) {
                    console.warn('[Audio] Failed to decode/play chunk:', e);
                  }
                }
              }

            } catch (err) {
              console.error('[onmessage] Unhandled error:', err);
            }
          },

          onerror: (e: ErrorEvent) => {
            console.error('[Session] Error:', e.message);
            updateError(e.message);
          },

          onclose: (e: CloseEvent) => {
            sessionOpen.current = false;
            session.current = null;
            console.warn('[Session] Closed — code:', e.code, '| reason:', e.reason || '(none)');

            if (isUnmounted.current) return;

            if (isRecordingRef.current) {
              if (isReconnectingRef.current) return;

              reconnectAttemptsRef.current += 1;
              if (reconnectAttemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
                updateError(`Connection lost after ${MAX_RECONNECT_ATTEMPTS} retries. Please reset.`);
                stopConversation();
                reconnectAttemptsRef.current = 0;
                return;
              }

              const delay = e.code === 1000
                ? 300
                : Math.min(300 * Math.pow(2, reconnectAttemptsRef.current), 5000);

              isReconnectingRef.current = true;
              updateStatus(`Reconnecting (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);

              setTimeout(async () => {
                if (!isUnmounted.current && isRecordingRef.current) {
                  // Fix 3: Pass current lesson progress into the new session
                  await initSession(lessonProgressRef.current);
                }
                isReconnectingRef.current = false;
              }, delay);
            } else {
              updateStatus('Session closed.');
            }
          },
        },

        config: {
          systemInstruction: buildSystemPrompt(prompt, lessonProgressRef.current),
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } },
          },
          contextWindowCompression: { slidingWindow: {} },
          tools: [{
            functionDeclarations: [
              {
                name: 'consult_knowledge_base',
                description: 'Search the topic-specific knowledge base for accurate curriculum-aligned information.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    query: { type: Type.STRING, description: 'The search query.' },
                  },
                  required: ['query'],
                },
              },
              {
                name: 'update_blackboard',
                description: 'Display a formula, equation, definition, or bullet list on the blackboard. Use Markdown. No LaTeX.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    content: { type: Type.STRING, description: 'Markdown content to display.' },
                  },
                  required: ['content'],
                },
              },
              {
                // Fix 2: New tool — tracks confirmed understanding
                name: 'confirm_topic_understood',
                description: 'Call this when the student has clearly demonstrated understanding of a topic. This prevents re-teaching it.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING, description: 'The topic name the student just confirmed.' },
                  },
                  required: ['topic'],
                },
              },
              {
                // Fix 3: New tool — captures session summary for handoff
                name: 'save_lesson_summary',
                description: 'Call this when asked to save a lesson summary. Summarise what was covered and where the student is.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    summary: {
                      type: Type.STRING,
                      description: 'A concise summary of lesson progress, topics covered, and next steps.',
                    },
                  },
                  required: ['summary'],
                },
              },
            ],
          }],
        },
      });
    } catch (e: any) {
      updateError(`Connection failed: ${e.message}`);
    }
  }, [prompt, stopConversation, buildSystemPrompt, topicId, subject, level, updateLessonProgress]);

  // ─── Fix 3: Proactive session handoff at 8 minutes ────────────────────────
  useEffect(() => {
    if (!isRecording) return;

    sessionStartTimeRef.current = Date.now();
    handoffTriggeredRef.current = false;

    // At 8 minutes, request a summary before Google kills the session at 10 min
    const handoffTimer = setTimeout(() => {
      if (!isRecordingRef.current || !session.current || !sessionOpen.current) return;
      if (handoffTriggeredRef.current) return;

      handoffTriggeredRef.current = true;
      console.log('[Handoff] 8-minute mark — requesting lesson summary');
      updateStatus('Saving lesson progress…');

      try {
        session.current.sendRealtimeInput({
          text: '[SYSTEM COMMAND]: You must immediately call the save_lesson_summary tool with a concise summary of: (1) which topics you have introduced, (2) which topics the student confirmed understanding of, (3) where you currently are in the lesson, (4) any misconceptions the student showed. Do this now silently — do not speak it aloud.',
        });
      } catch (err) {
        console.error('[Handoff] Failed to send handoff command:', err);
      }
    }, 8 * 60 * 1000); // 8 minutes

    return () => clearTimeout(handoffTimer);
  }, [isRecording]);

  // ─── Start conversation ───────────────────────────────────────────────────
  const startConversation = useCallback(async () => {
    if (isRecording) return;
    if (!isAllowed) { updateError('Usage limit reached. Please upgrade.'); return; }
    if (!session.current || !sessionOpen.current) { updateError('Session not ready. Please wait.'); return; }

    isStartingConversationRef.current = true;

    if (!hasTrackedSession) {
      const { trackFeatureUsageAction } = require('@/app/(dashboard)/usage-actions');
      const res = await trackFeatureUsageAction('voiceTutor');
      if (!res.success) {
        isStartingConversationRef.current = false;
        updateError(`❌ ${res.error || 'Failed to start session.'}`);
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
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        },
      });
      updateStatus('Microphone granted.');

      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000,
        });
      }

      await audioContext.current.resume();

      // ── FIX 1: Load the AudioWorklet processor ──────────────────────────
      // The processor file lives at public/audio-processor.js
      // It runs on a dedicated audio thread — never blocks the UI
      try {
        await audioContext.current.audioWorklet.addModule('/audio-processor.js');
        console.log('[Audio] AudioWorklet module loaded successfully');
      } catch (workletErr) {
        console.error('[Audio] AudioWorklet failed to load:', workletErr);
        updateError('Audio processor failed to load. Please refresh the page.');
        isStartingConversationRef.current = false;
        return;
      }

      mixedStreamDestinationRef.current = audioContext.current.createMediaStreamDestination();

      const micSourceNode = audioContext.current.createMediaStreamSource(mediaStream.current);
      micSourceNode.connect(mixedStreamDestinationRef.current);

      // Set up MediaRecorder for conversation recording (unchanged)
      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(
        mixedStreamDestinationRef.current.stream,
        { mimeType: 'audio/webm' }
      );
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = audioChunksRef.current.length > 0
          ? new Blob(audioChunksRef.current, { type: 'audio/webm' })
          : new Blob([], { type: 'audio/webm' });
        onConversationEnd(blob);
        audioChunksRef.current = [];
      };

      // ── FIX 1: Create AudioWorkletNode ──────────────────────────────────
      // This replaces ScriptProcessorNode entirely.
      // The worklet processor we loaded above handles the audio capture.
      audioWorkletNode.current = new AudioWorkletNode(
        audioContext.current,
        'pcm-processor' // must match registerProcessor name in audio-processor.js
      );

      // Connect mic → worklet (worklet captures audio on its own thread)
      const geminiSourceNode = audioContext.current.createMediaStreamSource(mediaStream.current);
      geminiSourceNode.connect(audioWorkletNode.current);

      // The worklet sends processed Int16 chunks via postMessage
      // We forward them to Gemini — this callback is called from the audio thread
      audioWorkletNode.current.port.onmessage = (event: MessageEvent<Int16Array>) => {
        if (!isRecordingRef.current || !session.current || !sessionOpen.current) return;
        try {
          const base64 = int16ArrayToBase64(event.data);
          session.current.sendRealtimeInput({ media: createPCMBlob(base64) });
        } catch (err: any) {
          if (err?.message?.includes('CLOSING') || err?.message?.includes('CLOSED')) return;
          console.warn('[Audio] WorkletNode send error:', err);
        }
      };

      // Connect worklet to a silent node to keep audio graph alive
      const muteNode = audioContext.current.createGain();
      muteNode.gain.setValueAtTime(0, audioContext.current.currentTime);
      audioWorkletNode.current.connect(muteNode);
      muteNode.connect(audioContext.current.destination);

      // Volume meter (same as before — uses separate analyser)
      const volumeAnalyserNode = audioContext.current.createAnalyser();
      volumeAnalyserNode.fftSize = 256;
      geminiSourceNode.connect(volumeAnalyserNode);
      const dataArray = new Uint8Array(volumeAnalyserNode.frequencyBinCount);
      const updateVolume = () => {
        if (!isRecordingRef.current) return;
        volumeAnalyserNode.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolumeLevel(avg);
        requestAnimationFrame(updateVolume);
      };
      updateVolume();

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Fix 2: Increment session count on each start
      updateLessonProgress({
        sessionCount: lessonProgressRef.current.sessionCount + 1,
      });

      updateStatus('🔴 Live Conversation… Speak now!');
    } catch (err: any) {
      updateError(`Microphone error: ${err.message}`);
    } finally {
      isStartingConversationRef.current = false;
    }
  }, [isRecording, isAllowed, hasTrackedSession, onConversationEnd, selectedDeviceId, updateLessonProgress]);

  // ─── isEnding prop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isEnding && isRecording) stopConversation();
  }, [isEnding, isRecording, stopConversation]);

  // ─── Reset ────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    stopConversation();
    initSession(lessonProgressRef.current); // Fix 3: pass progress on reset too
  }, [initSession, stopConversation]);

  // ─── Force board sync ─────────────────────────────────────────────────────
  const handleForceUpdate = useCallback(() => {
    if (!session.current || !sessionOpen.current) {
      updateError('Start a session first to sync the board.');
      return;
    }
    updateStatus('Syncing board…');
    try {
      session.current.sendRealtimeInput({
        text: '[SYSTEM COMMAND]: Please immediately call update_blackboard with the most important content from our current discussion.',
      });
    } catch (err: any) {
      updateError('Sync failed — try resetting the session.');
    }
  }, []);

  // ─── THREE.js + AudioContext init (run once) ──────────────────────────────
  useEffect(() => {
    isUnmounted.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });

    if (audioContext.current) {
      outputNode.current = audioContext.current.createGain();
      outputNode.current.connect(audioContext.current.destination);
      const inputGainNode = audioContext.current.createGain();
      inputAnalyser.current = new Analyser(inputGainNode);
      outputAnalyser.current = new Analyser(outputNode.current);
    }

    client.current = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_API_KEY || '' });

    // Three.js setup (unchanged from original)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x100c14);

    const back = new THREE.Mesh(
      new THREE.IcosahedronGeometry(10, 5),
      new THREE.RawShaderMaterial({
        uniforms: {
          resolution: { value: new THREE.Vector2(0, 0) },
          rand: { value: 0 },
        },
        vertexShader: backdropVS,
        fragmentShader: backdropFS,
        glslVersion: THREE.GLSL3,
        side: THREE.BackSide,
      }),
    );
    scene.add(back);
    backdrop.current = back;

    camera.current = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.current.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);

    const geometry = new THREE.IcosahedronGeometry(1, 10);
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0x000010, metalness: 0.5, roughness: 0.1,
      emissive: 0x000010, emissiveIntensity: 1.5,
    });

    new EXRLoader().load('/piz_compressed.exr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      const exrCubeRenderTarget = pmremGenerator.fromEquirectangular(texture);
      sphereMaterial.envMap = exrCubeRenderTarget.texture;
      if (sphere.current) sphere.current.visible = true;
    }, undefined, () => {
      if (sphere.current) sphere.current.visible = true;
    });

    sphereMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.time       = { value: 0 };
      shader.uniforms.inputData  = { value: new THREE.Vector4() };
      shader.uniforms.outputData = { value: new THREE.Vector4() };
      sphereMaterial.userData.shader = shader;
      shader.vertexShader = sphereVS;
    };

    sphere.current = new THREE.Mesh(geometry, sphereMaterial);
    sphere.current.visible = false;
    scene.add(sphere.current);

    const renderPass = new RenderPass(scene, camera.current);
    const bloomPass  = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 5, 0.5, 0
    );
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
        (backdrop.current.material as THREE.RawShaderMaterial).uniforms.resolution.value
          .set(width * dPR, height * dPR);
      }
    });
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    const animate = () => {
      if (isUnmounted.current) return;
      animationFrameId.current = requestAnimationFrame(animate);
      if (!inputAnalyser.current || !outputAnalyser.current || !sphere.current ||
          !backdrop.current || !composer.current || !camera.current) return;
      inputAnalyser.current.update();
      outputAnalyser.current.update();
      const t  = performance.now();
      const dt = (t - prevTime.current) / (1000 / 60);
      prevTime.current = t;
      (backdrop.current.material as THREE.RawShaderMaterial).uniforms.rand.value = Math.random() * 10000;
      const mat = sphere.current.material as THREE.MeshStandardMaterial;
      if (mat.userData.shader) {
        sphere.current.scale.setScalar(1 + (0.2 * outputAnalyser.current.data[1]) / 255);
        const f = 0.001;
        rotation.current.x += (dt * f * 0.5  * outputAnalyser.current.data[1]) / 255;
        rotation.current.z += (dt * f * 0.5  * inputAnalyser.current.data[1]) / 255;
        rotation.current.y += (dt * f * 0.25 * (inputAnalyser.current.data[2] + outputAnalyser.current.data[2])) / 255;
        camera.current.position.set(0, 0, 5);
        mat.userData.shader.uniforms.time.value       += (dt * 0.1 * outputAnalyser.current.data[0]) / 255;
        mat.userData.shader.uniforms.inputData.value.set(
          (1  * inputAnalyser.current.data[0]) / 255,
          (0.1 * inputAnalyser.current.data[1]) / 255,
          (10  * inputAnalyser.current.data[2]) / 255, 0
        );
        mat.userData.shader.uniforms.outputData.value.set(
          (2  * outputAnalyser.current.data[0]) / 255,
          (0.1 * outputAnalyser.current.data[1]) / 255,
          (10  * outputAnalyser.current.data[2]) / 255, 0
        );
      }
      composer.current.render();
    };
    animate();

    return () => {
      isUnmounted.current = true;
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (canvas.parentElement) resizeObserver.unobserve(canvas.parentElement);
      // FIX 1: clean up worklet node
      if (audioWorkletNode.current) {
        audioWorkletNode.current.disconnect();
        audioWorkletNode.current.port.onmessage = null;
      }
      mediaStream.current?.getTracks().forEach(t => t.stop());
      session.current?.close();
      audioContext.current?.close();
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!prompt) return;
    if (isRecordingRef.current || isStartingConversationRef.current) return;
    if (session.current && sessionOpen.current) return;
    initSession(lessonProgressRef.current);
  }, [prompt, initSession]);

  // ─── Render (unchanged from original) ────────────────────────────────────
  return (
    <div className="w-full h-[600px] flex flex-col md:flex-row bg-[#100c14] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">

      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="absolute top-4 right-4 z-[50] flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-md border border-white/10 transition-all shadow-lg active:scale-95"
      >
        <LayoutGrid size={18} />
        <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
          {isPanelOpen ? 'Hide Board' : 'Show Board'}
        </span>
      </button>

      {isPanelOpen && (
        <button
          onClick={handleForceUpdate}
          className="absolute top-4 left-10 z-[60] flex items-center gap-2 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-100 backdrop-blur-md border border-emerald-500/30 transition-all shadow-lg active:scale-95"
        >
          <RefreshCw size={14} className={status.includes('Syncing') ? 'animate-spin' : ''} />
          <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Sync Board</span>
        </button>
      )}

      {/* Fix 2: Show lesson progress indicator */}
      {lessonProgress.topicsConfirmed.length > 0 && (
        <div className="absolute bottom-4 left-4 z-[50] bg-black/40 backdrop-blur-md rounded-lg px-3 py-2 border border-white/10">
          <p className="text-xs text-emerald-400 font-bold">
            ✓ {lessonProgress.topicsConfirmed.length} topic{lessonProgress.topicsConfirmed.length > 1 ? 's' : ''} confirmed
          </p>
        </div>
      )}

      <div className="flex-1 relative min-h-[400px]">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        />

        <div style={{
          position: 'absolute', bottom: '2vh', left: 0, right: 0,
          zIndex: 10, textAlign: 'center', color: 'white', fontSize: '14px', opacity: 0.8,
        }}>
          {error || status}
        </div>

        <div className="controls" style={{
          zIndex: 20, position: 'absolute', bottom: '8vh', left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '8px',
        }}>
          <button id="resetButton" onClick={reset} aria-label="Reset Session"
            style={{
              outline: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'white',
              borderRadius: '12px', background: 'rgba(255,255,255,0.1)',
              width: '48px', height: '48px', cursor: 'pointer', fontSize: '24px',
              padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#ffffff">
              <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z"/>
            </svg>
          </button>

          {!isRecording ? (
            <button id="startButton" onClick={startConversation} aria-label="Start Recording"
              style={{
                outline: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'white',
                borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                width: '56px', height: '56px', cursor: 'pointer',
                padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <svg viewBox="0 0 100 100" width="32px" height="32px" fill="#c80000" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45"/>
              </svg>
            </button>
          ) : (
            <button id="stopButton" onClick={reset} aria-label="Stop Recording"
              style={{
                outline: 'none', border: '1px solid rgba(255,50,50,0.5)', color: 'white',
                borderRadius: '50%', background: 'rgba(200,0,0,0.2)',
                width: '56px', height: '56px', cursor: 'pointer',
                padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <div style={{ width: '20px', height: '20px', background: '#ef4444', borderRadius: '4px' }}/>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
            {isRecording && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(0,0,0,0.5)', padding: '8px 16px',
                borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <Volume2 size={16} color="white"/>
                <div style={{
                  width: '100px', height: '4px',
                  background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${Math.min(100, volumeLevel * 2)}%`, height: '100%',
                    background: volumeLevel > 50 ? '#ef4444' : '#22c55e',
                    transition: 'width 0.1s ease-out, background 0.3s ease',
                  }}/>
                </div>
              </div>
            )}

            <button onClick={() => setShowSettings(!showSettings)} style={{
              background: showSettings ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%',
              width: '40px', height: '40px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: 'white',
            }}>
              <Settings size={20}/>
            </button>
          </div>

          {showSettings && (
            <div style={{
              position: 'absolute', bottom: '70px',
              background: 'rgba(20,20,25,0.95)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
              padding: '12px', width: '280px', zIndex: 100,
            }}>
              <p style={{
                color: 'white', fontSize: '12px', fontWeight: 'bold',
                marginBottom: '8px', opacity: 0.7, textTransform: 'uppercase',
              }}>Select Microphone</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {audioDevices.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '8px' }}>
                    No microphones found
                  </p>
                ) : (
                  audioDevices.map(device => (
                    <button key={device.deviceId}
                      onClick={() => {
                        setSelectedDeviceId(device.deviceId);
                        setShowSettings(false);
                        if (isRecording) reset();
                      }}
                      style={{
                        background: selectedDeviceId === device.deviceId
                          ? 'rgba(255,255,255,0.1)' : 'transparent',
                        border: 'none', borderRadius: '8px', padding: '8px 12px',
                        color: 'white', fontSize: '14px', textAlign: 'left', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                        {device.label || `Microphone ${device.deviceId.substring(0, 5)}…`}
                      </span>
                      {selectedDeviceId === device.deviceId && <Check size={14} color="#22c55e"/>}
                    </button>
                  ))
                )}
              </div>
              <button onClick={() => enumerateDevices()} style={{
                marginTop: '8px', background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                padding: '6px', color: 'white', fontSize: '11px',
                width: '100%', cursor: 'pointer', opacity: 0.6,
              }}>
                Refresh Device List
              </button>
            </div>
          )}

          {isRecording && (
            <div style={{
              color: 'white', background: 'rgba(0,0,0,0.5)',
              padding: '4px 8px', borderRadius: '8px', fontSize: '12px', opacity: 0.8,
            }}>
              Conversation is being recorded
            </div>
          )}
        </div>
      </div>

      <div className={`
        flex flex-col h-full border-l border-white/10 transition-all duration-300
        absolute top-15 right-0 z-40 bg-[#100c14]
        md:relative md:top-0 md:bg-transparent md:z-auto
        ${isPanelOpen ? 'w-full md:w-[400px]' : 'w-0 overflow-hidden'}
      `}>
        <ActiveContextPanel
          contexts={visualContexts}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
        />
      </div>
    </div>
  );
}

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


// export interface LiveAudioComponentProps {
//   prompt: string;
//   topicId: number;
//   subject?: string;
//   level?: string;
//   onConversationEnd: (audioBlob: Blob) => void;
//   isEnding: boolean;
// }

// function arrayBufferToBase64(buffer: ArrayBuffer) {
//   let binary = '';
//   const bytes = new Uint8Array(buffer);
//   for (let i = 0; i < bytes.byteLength; i++) {
//     binary += String.fromCharCode(bytes[i]);
//   }
//   return btoa(binary);
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

//   // ─── Usage limit check ────────────────────────────────────────────────────
//   useEffect(() => {
//     const { checkFeatureAllowedAction } = require('@/app/(dashboard)/usage-actions');
//     async function checkLimit() {
//       const res = await checkFeatureAllowedAction('voiceTutor');
//       if (!res.allowed) {
//         setIsAllowed(false);
//         setError(`⚠️ Usage Limit Reached: ${res.error || 'Please upgrade your plan.'}`);
//       }
//     }
//     checkLimit();
//   }, []);

//   // ─── Device enumeration ───────────────────────────────────────────────────
//   const enumerateDevices = useCallback(async () => {
//     try {
//       const devices = await navigator.mediaDevices.enumerateDevices();
//       const mics = devices.filter(d => d.kind === 'audioinput');
//       setAudioDevices(mics);
//       if (mics.length > 0) {
//         const stillExists = mics.find(m => m.deviceId === selectedDeviceId);
//         if (!stillExists) setSelectedDeviceId(mics[0].deviceId);
//       }
//     } catch (err) {
//       console.error('Error enumerating devices:', err);
//     }
//   }, [selectedDeviceId]);

//   useEffect(() => {
//     enumerateDevices();
//     navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
//     return () => navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
//   }, [enumerateDevices]);

//   // ─── Refs ─────────────────────────────────────────────────────────────────
//   const client = useRef<GoogleGenAI | null>(null);
//   const session = useRef<any>(null);

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
//   const isInterruptedRef = useRef(false);

//   const isRecordingRef = useRef(isRecording);
//   isRecordingRef.current = isRecording;
//   const isStartingConversationRef = useRef(false);

//   // Track if we are currently processing a tool call (to block interruption from discarding responses)
//   const pendingToolCallsRef = useRef(0);
//   // Prevent multiple simultaneous reconnect attempts
//   const isReconnectingRef = useRef(false);
//   // Cap reconnect attempts to prevent infinite loops on hard server errors
//   const reconnectAttemptsRef = useRef(0);
//   const MAX_RECONNECT_ATTEMPTS = 3;

//   const updateStatus = (msg: string) => { console.log('[Status]', msg); setStatus(msg); };
//   const updateError  = (msg: string) => { console.error('[Error]', msg); setError(msg); };

//   // ─── Stop conversation ────────────────────────────────────────────────────
//   const stopConversation = useCallback(() => {
//     if (!isRecordingRef.current) return;
//     isStartingConversationRef.current = false;
//     isReconnectingRef.current = false;
//     reconnectAttemptsRef.current = 0;
//     setIsRecording(false);
//     updateStatus('Ending conversation and preparing audio...');

//     if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
//       mediaRecorderRef.current.stop();
//     }

//     scriptProcessorNode.current?.disconnect();
//     mediaStream.current?.getTracks().forEach(t => t.stop());
//     try { session.current?.close(); } catch (_) {}
//     session.current = null;
//     sessionOpen.current = false;
//     scriptProcessorNode.current = null;
//     mediaStream.current = null;
//   }, []);

//   // ─── Build system prompt ──────────────────────────────────────────────────
//   // CRITICAL: The Gemini Live API hard-limits system instructions to ~8 000 tokens.
//   // NEVER embed a full syllabus / document here — it causes instant 1011 server errors.
//   // Large subject content must be retrieved on-demand via consult_knowledge_base.
//   const buildSystemPrompt = useCallback((userPrompt: string) => {
//     // Keep only the first 1 500 chars of the caller-supplied prompt.
//     // That is enough to convey subject, level, and persona without exceeding
//     // the API's system-instruction token budget.
//     const PROMPT_CHAR_LIMIT = 1500;
//     const safePrompt = userPrompt.length > PROMPT_CHAR_LIMIT
//       ? userPrompt.slice(0, PROMPT_CHAR_LIMIT) +
//         '\n[Full curriculum is available via the consult_knowledge_base tool.]'
//       : userPrompt;

//     return `You are a Visual-First Private Tutor who uses Dual Coding (Visuals + Audio).

// GOLDEN RULE: Always call a tool BEFORE speaking.
// - Formulas / worked examples / bullet lists → call update_blackboard first, then speak.
// - Subject facts / syllabus content / past-paper answers → call consult_knowledge_base first, then speak.
// - On any "[SYSTEM COMMAND]" message → immediately call update_blackboard with the current topic summary.

// AUDIO CUES: Begin sentences with "As I've written on the board…" or "As you can see on the screen…"

// PROACTIVE TRIGGERS:
// - Maths/Physics → show formula + step-by-step working on board.
// - Definitions → show definition text on board.
// - Explanation >10 seconds → show bullet summary on board.

// BLACKBOARD FORMATTING (Markdown only — NO LaTeX, NO dollar signs):
// - Exponents: x^2   Fractions: 1/2   Bold answers: **answer**
// - Headers: #   Bullet lists: -

// TUTOR CONTEXT:
// ${safePrompt}`.trim();
//   }, []);

//   // ─── Init session ─────────────────────────────────────────────────────────
//   const initSession = useCallback(async () => {
//     if (!client.current) return;

//     // Close any existing session cleanly
//     if (session.current) {
//       try { session.current.close(); } catch (_) {}
//       session.current = null;
//       sessionOpen.current = false;
//     }

//     updateStatus('Connecting to Gemini...');

//     const model = 'gemini-2.5-flash-native-audio-preview-09-2025';
//     const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
//     if (!apiKey) { updateError('API key not found.'); return; }

//     const systemInstruction = buildSystemPrompt(prompt);

//     try {
//       session.current = await client.current.live.connect({
//         model,
//         callbacks: {
//           onopen: () => {
//             sessionOpen.current = true;
//             reconnectAttemptsRef.current = 0; // reset on successful connection
//             console.log('[Session] Opened successfully');
//             if (isRecordingRef.current) {
//               updateStatus('🔴 Live Conversation… Speak now!');
//             } else {
//               updateStatus('Ready — press record to start.');
//             }
//           },

//           // ─── Main message handler ─────────────────────────────────────────
//           onmessage: async (message: LiveServerMessage) => {
//             try {
//               // Reset interrupted flag on new clean content
//               if (message.serverContent && !message.serverContent.interrupted) {
//                 isInterruptedRef.current = false;
//               }

//               // ── Handle interruptions ──────────────────────────────────────
//               if (message.serverContent?.interrupted) {
//                 console.log('[Session] Interruption received — clearing audio queue');
//                 isInterruptedRef.current = true;
//                 sources.current.forEach(s => { try { s.stop(); } catch (_) {} });
//                 sources.current.clear();
//                 nextStartTime.current = 0;
//                 return; // Don't process further on interruption
//               }

//               // ── Tool calls ────────────────────────────────────────────────
//               const toolCallData = message.toolCall || (message as any).toolCalls;
//               if (toolCallData?.functionCalls?.length) {
//                 // IMMEDIATELY open the board so the user sees something is happening
//                 setIsPanelOpen(true);
//                 pendingToolCallsRef.current += toolCallData.functionCalls.length;

//                 const functionResponses = await Promise.all(
//                   toolCallData.functionCalls.map(async (call: any) => {
//                     console.log(`[Tool] Handling: ${call.name} (id=${call.id})`);

//                     // ── consult_knowledge_base ────────────────────────────
//                     if (call.name === 'consult_knowledge_base') {
//                       const { query } = call.args as { query: string };
//                       const loadingId = uuidv4();

//                       updateStatus(`Searching: "${query}"…`);
//                       setVisualContexts(prev => [...prev, {
//                         id: loadingId,
//                         type: 'loading' as const,
//                         content: `Searching: ${query}`,
//                         source: 'database' as const,
//                         timestamp: new Date(),
//                       }]);

//                       try {
//                         let searchIds: number[] = [];
//                         if (topicId === -1 && subject) {
//                           try {
//                             const accessibleTopics = await getTopics(subject, level);
//                             if (Array.isArray(accessibleTopics)) {
//                               searchIds = accessibleTopics.map((t: any) => t.id);
//                             }
//                           } catch { searchIds = []; }
//                         } else {
//                           searchIds = [topicId];
//                         }

//                         const results = await searchResources(query, searchIds);
//                         const resultText = Array.isArray(results) && results.length > 0
//                           ? results.join('\n\n')
//                           : 'No relevant information found in the knowledge base.';

//                         setVisualContexts(prev =>
//                           prev.map(ctx =>
//                             ctx.id === loadingId
//                               ? { ...ctx, type: 'source_text' as const, content: resultText }
//                               : ctx
//                           )
//                         );

//                         updateStatus('🔴 Live Conversation… Speak now!');
//                         return { id: call.id, name: call.name, response: { output: resultText } };
//                       } catch (err) {
//                         console.error('[Tool] consult_knowledge_base error:', err);
//                         setVisualContexts(prev =>
//                           prev.map(ctx =>
//                             ctx.id === loadingId
//                               ? { ...ctx, type: 'source_text' as const, content: 'Search failed — using general knowledge.' }
//                               : ctx
//                           )
//                         );
//                         return { id: call.id, name: call.name, response: { output: 'Search failed.' } };
//                       }

//                     // ── update_blackboard ─────────────────────────────────
//                     } else if (call.name === 'update_blackboard') {
//                       try {
//                         const args = call.args as any;
//                         const content = typeof args === 'string'
//                           ? JSON.parse(args).content
//                           : args?.content;

//                         console.log('[Tool] Blackboard content:', content);

//                         if (content) {
//                           setVisualContexts(prev => [...prev, {
//                             id: uuidv4(),
//                             type: 'formula' as const,
//                             content: String(content),
//                             source: 'generated' as const,
//                             timestamp: new Date(),
//                           }]);
//                         }

//                         return { id: call.id, name: call.name, response: { output: 'Blackboard updated successfully.' } };
//                       } catch (err) {
//                         console.error('[Tool] update_blackboard error:', err);
//                         return { id: call.id, name: call.name, response: { output: 'Failed to update blackboard.' } };
//                       }

//                     // ── Unknown tool ──────────────────────────────────────
//                     } else {
//                       console.warn('[Tool] Unknown tool:', call.name);
//                       return { id: call.id, name: call.name, response: { output: 'Unknown tool.' } };
//                     }
//                   })
//                 );

//                 pendingToolCallsRef.current -= toolCallData.functionCalls.length;

//                 // Only send response if session is still alive and we weren't interrupted
//                 if (session.current && sessionOpen.current && !isInterruptedRef.current) {
//                   try {
//                     console.log('[Tool] Sending', functionResponses.length, 'response(s)');
//                     session.current.sendToolResponse({ functionResponses });
//                   } catch (err: any) {
//                     console.error('[Tool] sendToolResponse error:', err);
//                   }
//                 } else {
//                   console.warn('[Tool] Skipping tool response — session gone or interrupted');
//                 }
//               }

//               // ── Audio playback ────────────────────────────────────────────
//               const modelTurn = message.serverContent?.modelTurn;
//               if (modelTurn?.parts) {
//                 for (const part of modelTurn.parts) {
//                   const audio = part.inlineData;
//                   if (!audio?.data || !audio.mimeType?.includes('audio')) continue;
//                   if (!audioContext.current || !outputNode.current) continue;

//                   try {
//                     const audioBuffer = await decodeAudioData(
//                       decode(audio.data ?? ''),
//                       audioContext.current,
//                       24000,
//                       1
//                     );
//                     const source = audioContext.current.createBufferSource();
//                     source.buffer = audioBuffer;
//                     source.connect(outputNode.current);
//                     if (mixedStreamDestinationRef.current) {
//                       source.connect(mixedStreamDestinationRef.current);
//                     }
//                     source.addEventListener('ended', () => sources.current.delete(source));

//                     const currentTime = audioContext.current.currentTime;
//                     if (nextStartTime.current < currentTime) {
//                       nextStartTime.current = currentTime;
//                     }
//                     source.start(nextStartTime.current);
//                     nextStartTime.current += audioBuffer.duration;
//                     sources.current.add(source);
//                   } catch (e) {
//                     console.warn('[Audio] Failed to decode/play audio chunk:', e);
//                   }
//                 }
//               }

//             } catch (err) {
//               console.error('[onmessage] Unhandled error:', err);
//             }
//           },

//           onerror: (e: ErrorEvent) => {
//             console.error('[Session] Error:', e.message);
//             updateError(e.message);
//           },

//           onclose: (e: CloseEvent) => {
//             sessionOpen.current = false;
//             session.current = null;
//             console.warn('[Session] Closed — code:', e.code, '| reason:', e.reason || '(none)', '| clean:', e.wasClean);

//             if (isUnmounted.current) return;

//             if (isRecordingRef.current) {
//               // Guard: skip if already reconnecting
//               if (isReconnectingRef.current) {
//                 console.log('[Session] Already reconnecting — skipping duplicate');
//                 return;
//               }

//               // Guard: stop after MAX_RECONNECT_ATTEMPTS consecutive failures
//               reconnectAttemptsRef.current += 1;
//               if (reconnectAttemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
//                 console.error(`[Session] Giving up after ${MAX_RECONNECT_ATTEMPTS} reconnect attempts`);
//                 updateError(`Connection lost after ${MAX_RECONNECT_ATTEMPTS} retries. Please reset.`);
//                 stopConversation();
//                 reconnectAttemptsRef.current = 0;
//                 return;
//               }

//               // Exponential backoff: 300ms, 1.2s, 2.5s
//               const delay = e.code === 1000
//                 ? 300
//                 : Math.min(300 * Math.pow(2, reconnectAttemptsRef.current), 5000);

//               isReconnectingRef.current = true;
//               console.log(`[Session] Closed (code ${e.code}) — attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}, reconnecting in ${delay}ms`);
//               updateStatus(`Reconnecting (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);

//               setTimeout(async () => {
//                 if (!isUnmounted.current && isRecordingRef.current) {
//                   await initSession();
//                 }
//                 isReconnectingRef.current = false;
//               }, delay);
//             } else {
//               updateStatus('Session closed.');
//             }
//           },
//         },

//         config: {
//           systemInstruction,
//           responseModalities: [Modality.AUDIO],
//           speechConfig: {
//             voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } },
//           },
//           contextWindowCompression: { slidingWindow: {} },
//           tools: [{
//             functionDeclarations: [
//               {
//                 name: 'consult_knowledge_base',
//                 description: 'Search the topic-specific knowledge base (documents, flashcards, past papers) to retrieve accurate, curriculum-aligned information.',
//                 parameters: {
//                   type: Type.OBJECT,
//                   properties: {
//                     query: {
//                       type: Type.STRING,
//                       description: 'The search query to look up in the knowledge base.',
//                     },
//                   },
//                   required: ['query'],
//                 },
//               },
//               {
//                 name: 'update_blackboard',
//                 description: 'Display a formula, equation, definition, bullet-point list, or teaching note on the student\'s blackboard. Use Markdown. No LaTeX/dollar-signs.',
//                 parameters: {
//                   type: Type.OBJECT,
//                   properties: {
//                     content: {
//                       type: Type.STRING,
//                       description: 'The Markdown content to display on the blackboard.',
//                     },
//                   },
//                   required: ['content'],
//                 },
//               },
//             ],
//           }],
//         },
//       });
//     } catch (e: any) {
//       updateError(`Connection failed: ${e.message}`);
//     }
//   }, [prompt, stopConversation, buildSystemPrompt, topicId, subject, level]);

//   // ─── Start conversation ───────────────────────────────────────────────────
//   const startConversation = useCallback(async () => {
//     if (isRecording) return;
//     if (!isAllowed) { updateError('Usage limit reached. Please upgrade.'); return; }
//     if (!session.current || !sessionOpen.current) { updateError('Session not ready. Please wait.'); return; }

//     isStartingConversationRef.current = true;

//     // Track usage
//     if (!hasTrackedSession) {
//       const { trackFeatureUsageAction } = require('@/app/(dashboard)/usage-actions');
//       const res = await trackFeatureUsageAction('voiceTutor');
//       if (!res.success) {
//         isStartingConversationRef.current = false;
//         updateError(`❌ ${res.error || 'Failed to start session. Limit reached.'}`);
//         return;
//       }
//       setHasTrackedSession(true);
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
//           deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
//         },
//       });
//       updateStatus('Microphone granted.');

//       if (!audioContext.current) {
//         audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
//       }

//       const currentSampleRate = audioContext.current.sampleRate;
//       console.log('[Audio] Sample rate:', currentSampleRate);

//       mixedStreamDestinationRef.current = audioContext.current.createMediaStreamDestination();

//       const micSourceNode = audioContext.current.createMediaStreamSource(mediaStream.current);
//       micSourceNode.connect(mixedStreamDestinationRef.current);

//       audioChunksRef.current = [];
//       mediaRecorderRef.current = new MediaRecorder(mixedStreamDestinationRef.current.stream, { mimeType: 'audio/webm' });

//       mediaRecorderRef.current.ondataavailable = (event) => {
//         if (event.data.size > 0) audioChunksRef.current.push(event.data);
//       };

//       mediaRecorderRef.current.onstop = () => {
//         const blob = audioChunksRef.current.length > 0
//           ? new Blob(audioChunksRef.current, { type: 'audio/webm' })
//           : new Blob([], { type: 'audio/webm' });
//         onConversationEnd(blob);
//         audioChunksRef.current = [];
//       };

//       scriptProcessorNode.current = audioContext.current.createScriptProcessor(4096, 1, 1);

//       const geminiSourceNode = audioContext.current.createMediaStreamSource(mediaStream.current);
//       geminiSourceNode.connect(scriptProcessorNode.current);

//       // Volume meter
//       const volumeAnalyserNode = audioContext.current.createAnalyser();
//       volumeAnalyserNode.fftSize = 256;
//       geminiSourceNode.connect(volumeAnalyserNode);
//       const dataArray = new Uint8Array(volumeAnalyserNode.frequencyBinCount);
//       const updateVolume = () => {
//         if (!isRecordingRef.current) return;
//         volumeAnalyserNode.getByteFrequencyData(dataArray);
//         const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
//         setVolumeLevel(avg);
//         requestAnimationFrame(updateVolume);
//       };
//       updateVolume();

//       // Silent output to keep processing chain alive
//       const muteNode = audioContext.current.createGain();
//       muteNode.gain.setValueAtTime(0, audioContext.current.currentTime);
//       scriptProcessorNode.current.connect(muteNode);
//       muteNode.connect(audioContext.current.destination);

//       scriptProcessorNode.current.onaudioprocess = (event) => {
//         if (!isRecordingRef.current || !session.current || !sessionOpen.current) return;
//         try {
//           const pcmData = event.inputBuffer.getChannelData(0);
//           session.current.sendRealtimeInput({ media: createBlob(pcmData) });
//         } catch (err: any) {
//           if (err?.message?.includes('CLOSING') || err?.message?.includes('CLOSED')) return;
//           console.warn('[Audio] Processing error:', err);
//         }
//       };

//       mediaRecorderRef.current.start();
//       setIsRecording(true);
//       updateStatus('🔴 Live Conversation… Speak now!');
//     } catch (err: any) {
//       updateError(`Microphone error: ${err.message}`);
//     } finally {
//       isStartingConversationRef.current = false;
//     }
//   }, [isRecording, isAllowed, hasTrackedSession, onConversationEnd, selectedDeviceId]);

//   // ─── isEnding prop ────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (isEnding && isRecording) stopConversation();
//   }, [isEnding, isRecording, stopConversation]);

//   // ─── Reset ────────────────────────────────────────────────────────────────
//   const reset = useCallback(() => {
//     stopConversation();
//     initSession();
//   }, [initSession, stopConversation]);

//   // ─── Force board sync ─────────────────────────────────────────────────────
//   // IMPORTANT: We use sendRealtimeInput({text}) — NOT sendClientContent with
//   // turnComplete:true — because the latter signals the server that the user's
//   // turn is complete and the model should wrap up, which can trigger a session
//   // close after it responds.
//   const handleForceUpdate = useCallback(() => {
//     if (!session.current || !sessionOpen.current) {
//       updateError('Start a session first to sync the board.');
//       return;
//     }
//     updateStatus('Syncing board…');
//     try {
//       session.current.sendRealtimeInput({
//         text: '[SYSTEM COMMAND]: Please immediately call update_blackboard with the most important content from our current discussion — the latest worked example, formula, definition, or key summary. Do this now before saying anything.',
//       });
//       console.log('[ForceUpdate] Sent sync command via sendRealtimeInput');
//     } catch (err: any) {
//       console.error('[ForceUpdate] sendRealtimeInput failed:', err);
//       updateError('Sync failed — try resetting the session.');
//     }
//   }, []);

//   // ─── THREE.js + AudioContext init (run once) ──────────────────────────────
//   useEffect(() => {
//     isUnmounted.current = false;
//     const canvas = canvasRef.current;
//     if (!canvas) return;

//     audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

//     if (audioContext.current) {
//       outputNode.current = audioContext.current.createGain();
//       outputNode.current.connect(audioContext.current.destination);
//       const inputGainNode = audioContext.current.createGain();
//       inputAnalyser.current = new Analyser(inputGainNode);
//       outputAnalyser.current = new Analyser(outputNode.current);
//     }

//     client.current = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_API_KEY || '' });

//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color(0x100c14);

//     const back = new THREE.Mesh(
//       new THREE.IcosahedronGeometry(10, 5),
//       new THREE.RawShaderMaterial({
//         uniforms: {
//           resolution: { value: new THREE.Vector2(0, 0) },
//           rand: { value: 0 },
//         },
//         vertexShader: backdropVS,
//         fragmentShader: backdropFS,
//         glslVersion: THREE.GLSL3,
//         side: THREE.BackSide,
//       }),
//     );
//     scene.add(back);
//     backdrop.current = back;

//     camera.current = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
//     camera.current.position.set(0, 0, 5);

//     const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
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
//     }, undefined, () => {
//       if (sphere.current) sphere.current.visible = true;
//     });

//     sphereMaterial.onBeforeCompile = (shader) => {
//       shader.uniforms.time       = { value: 0 };
//       shader.uniforms.inputData  = { value: new THREE.Vector4() };
//       shader.uniforms.outputData = { value: new THREE.Vector4() };
//       sphereMaterial.userData.shader = shader;
//       shader.vertexShader = sphereVS;
//     };

//     sphere.current = new THREE.Mesh(geometry, sphereMaterial);
//     sphere.current.visible = false;
//     scene.add(sphere.current);

//     const renderPass = new RenderPass(scene, camera.current);
//     const bloomPass  = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 5, 0.5, 0);
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
//       const t  = performance.now();
//       const dt = (t - prevTime.current) / (1000 / 60);
//       prevTime.current = t;
//       (backdrop.current.material as THREE.RawShaderMaterial).uniforms.rand.value = Math.random() * 10000;
//       const mat = sphere.current.material as THREE.MeshStandardMaterial;
//       if (mat.userData.shader) {
//         sphere.current.scale.setScalar(1 + (0.2 * outputAnalyser.current.data[1]) / 255);
//         const f = 0.001;
//         rotation.current.x += (dt * f * 0.5  * outputAnalyser.current.data[1]) / 255;
//         rotation.current.z += (dt * f * 0.5  * inputAnalyser.current.data[1]) / 255;
//         rotation.current.y += (dt * f * 0.25 * (inputAnalyser.current.data[2] + outputAnalyser.current.data[2])) / 255;
//         camera.current.position.set(0, 0, 5);
//         mat.userData.shader.uniforms.time.value       += (dt * 0.1 * outputAnalyser.current.data[0]) / 255;
//         mat.userData.shader.uniforms.inputData.value.set(
//           (1  * inputAnalyser.current.data[0]) / 255,
//           (0.1 * inputAnalyser.current.data[1]) / 255,
//           (10  * inputAnalyser.current.data[2]) / 255,
//           0
//         );
//         mat.userData.shader.uniforms.outputData.value.set(
//           (2  * outputAnalyser.current.data[0]) / 255,
//           (0.1 * outputAnalyser.current.data[1]) / 255,
//           (10  * outputAnalyser.current.data[2]) / 255,
//           0
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
//       mediaStream.current?.getTracks().forEach(t => t.stop());
//       session.current?.close();
//       audioContext.current?.close();
//       pmremGenerator.dispose();
//       renderer.dispose();
//     };
//   }, []);

//   // ─── Init session when prompt is ready ───────────────────────────────────
//   useEffect(() => {
//     if (!prompt) return;
//     if (isRecordingRef.current || isStartingConversationRef.current) return;
//     if (session.current && sessionOpen.current) return;
//     initSession();
//   }, [prompt, initSession]);

//   // ─── Render ───────────────────────────────────────────────────────────────
//   return (
//     <div className="w-full h-[600px] flex flex-col md:flex-row bg-[#100c14] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">

//       {/* Toggle Board Button */}
//       <button
//         onClick={() => setIsPanelOpen(!isPanelOpen)}
//         className="absolute top-4 right-4 z-[50] flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-md border border-white/10 transition-all shadow-lg active:scale-95"
//       >
//         <LayoutGrid size={18} />
//         <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
//           {isPanelOpen ? 'Hide Board' : 'Show Board'}
//         </span>
//       </button>

//       {/* Sync Board Button */}
//       {isPanelOpen && (
//         <button
//           onClick={handleForceUpdate}
//           className="absolute top-4 left-10 z-[60] flex items-center gap-2 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-100 backdrop-blur-md border border-emerald-500/30 transition-all shadow-lg active:scale-95"
//           title="Force AI to update the blackboard"
//         >
//           <RefreshCw size={14} className={status.includes('Syncing') ? 'animate-spin' : ''} />
//           <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
//             Sync Board
//           </span>
//         </button>
//       )}

//       {/* ── Main Tutor / 3D Canvas ── */}
//       <div className="flex-1 relative min-h-[400px]">
//         <canvas
//           ref={canvasRef}
//           style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
//         />

//         {/* Status bar */}
//         <div
//           style={{
//             position: 'absolute', bottom: '2vh', left: 0, right: 0,
//             zIndex: 10, textAlign: 'center', color: 'white', fontSize: '14px', opacity: 0.8,
//           }}
//         >
//           {error || status}
//         </div>

//         {/* Controls */}
//         <div
//           className="controls"
//           style={{
//             zIndex: 20, position: 'absolute', bottom: '8vh', left: 0, right: 0,
//             display: 'flex', alignItems: 'center', justifyContent: 'center',
//             flexDirection: 'column', gap: '8px',
//           }}
//         >
//           {/* Reset button */}
//           <button
//             id="resetButton"
//             onClick={reset}
//             aria-label="Reset Session"
//             style={{
//               outline: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'white',
//               borderRadius: '12px', background: 'rgba(255,255,255,0.1)',
//               width: '48px', height: '48px', cursor: 'pointer', fontSize: '24px',
//               padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
//             }}
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#ffffff">
//               <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
//             </svg>
//           </button>

//           {/* Record / Stop button */}
//           {!isRecording ? (
//             <button
//               id="startButton"
//               onClick={startConversation}
//               aria-label="Start Recording"
//               style={{
//                 outline: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'white',
//                 borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
//                 width: '56px', height: '56px', cursor: 'pointer',
//                 padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
//               }}
//             >
//               <svg viewBox="0 0 100 100" width="32px" height="32px" fill="#c80000" xmlns="http://www.w3.org/2000/svg">
//                 <circle cx="50" cy="50" r="45" />
//               </svg>
//             </button>
//           ) : (
//             <button
//               id="stopButton"
//               onClick={reset}
//               aria-label="Stop Recording"
//               style={{
//                 outline: 'none', border: '1px solid rgba(255,50,50,0.5)', color: 'white',
//                 borderRadius: '50%', background: 'rgba(200,0,0,0.2)',
//                 width: '56px', height: '56px', cursor: 'pointer',
//                 padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
//               }}
//             >
//               <div style={{ width: '20px', height: '20px', background: '#ef4444', borderRadius: '4px' }} />
//             </button>
//           )}

//           {/* Volume meter + Settings */}
//           <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
//             {isRecording && (
//               <div style={{
//                 display: 'flex', alignItems: 'center', gap: '8px',
//                 background: 'rgba(0,0,0,0.5)', padding: '8px 16px',
//                 borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
//               }}>
//                 <Volume2 size={16} color="white" />
//                 <div style={{
//                   width: '100px', height: '4px',
//                   background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden',
//                 }}>
//                   <div style={{
//                     width: `${Math.min(100, volumeLevel * 2)}%`,
//                     height: '100%',
//                     background: volumeLevel > 50 ? '#ef4444' : '#22c55e',
//                     transition: 'width 0.1s ease-out, background 0.3s ease',
//                   }} />
//                 </div>
//               </div>
//             )}

//             <button
//               onClick={() => setShowSettings(!showSettings)}
//               style={{
//                 background: showSettings ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
//                 border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%',
//                 width: '40px', height: '40px', display: 'flex', alignItems: 'center',
//                 justifyContent: 'center', cursor: 'pointer', color: 'white',
//                 transition: 'all 0.2s ease',
//               }}
//             >
//               <Settings size={20} />
//             </button>
//           </div>

//           {/* Microphone selector */}
//           {showSettings && (
//             <div style={{
//               position: 'absolute', bottom: '70px',
//               background: 'rgba(20,20,25,0.95)', backdropFilter: 'blur(10px)',
//               border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
//               padding: '12px', width: '280px', zIndex: 100,
//               boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
//             }}>
//               <p style={{
//                 color: 'white', fontSize: '12px', fontWeight: 'bold',
//                 marginBottom: '8px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em',
//               }}>
//                 Select Microphone
//               </p>
//               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
//                 {audioDevices.length === 0 ? (
//                   <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '8px' }}>
//                     No microphones found
//                   </p>
//                 ) : (
//                   audioDevices.map(device => (
//                     <button
//                       key={device.deviceId}
//                       onClick={() => {
//                         setSelectedDeviceId(device.deviceId);
//                         setShowSettings(false);
//                         if (isRecording) reset();
//                       }}
//                       style={{
//                         background: selectedDeviceId === device.deviceId ? 'rgba(255,255,255,0.1)' : 'transparent',
//                         border: 'none', borderRadius: '8px', padding: '8px 12px',
//                         color: 'white', fontSize: '14px', textAlign: 'left', cursor: 'pointer',
//                         display: 'flex', alignItems: 'center', justifyContent: 'space-between',
//                         transition: 'background 0.2s ease',
//                       }}
//                     >
//                       <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
//                         {device.label || `Microphone ${device.deviceId.substring(0, 5)}…`}
//                       </span>
//                       {selectedDeviceId === device.deviceId && <Check size={14} color="#22c55e" />}
//                     </button>
//                   ))
//                 )}
//               </div>
//               <button
//                 onClick={() => enumerateDevices()}
//                 style={{
//                   marginTop: '8px', background: 'transparent',
//                   border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
//                   padding: '6px', color: 'white', fontSize: '11px',
//                   width: '100%', cursor: 'pointer', opacity: 0.6,
//                 }}
//               >
//                 Refresh Device List
//               </button>
//             </div>
//           )}

//           {isRecording && (
//             <div style={{
//               color: 'white', background: 'rgba(0,0,0,0.5)',
//               padding: '4px 8px', borderRadius: '8px', fontSize: '12px', opacity: 0.8,
//             }}>
//               Conversation is being recorded
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ── Side Context Panel ── */}
//       <div
//         className={`
//           flex flex-col h-full border-l border-white/10 transition-all duration-300
//           absolute top-15 right-0 z-40 bg-[#100c14]
//           md:relative md:top-0 md:bg-transparent md:z-auto
//           ${isPanelOpen ? 'w-full md:w-[400px]' : 'w-0 overflow-hidden'}
//         `}
//       >
//         <ActiveContextPanel
//           contexts={visualContexts}
//           isOpen={isPanelOpen}
//           onClose={() => setIsPanelOpen(false)}
//         />
//       </div>
//     </div>
//   );
// }
