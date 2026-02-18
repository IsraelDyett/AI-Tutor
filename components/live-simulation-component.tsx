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
  const isInterruptedRef = useRef(false);

  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;
  const isStartingConversationRef = useRef(false);

  // Track if we are currently processing a tool call (to block interruption from discarding responses)
  const pendingToolCallsRef = useRef(0);
  // Prevent multiple simultaneous reconnect attempts
  const isReconnectingRef = useRef(false);
  // Cap reconnect attempts to prevent infinite loops on hard server errors
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  const updateStatus = (msg: string) => { console.log('[Status]', msg); setStatus(msg); };
  const updateError  = (msg: string) => { console.error('[Error]', msg); setError(msg); };

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

    scriptProcessorNode.current?.disconnect();
    mediaStream.current?.getTracks().forEach(t => t.stop());
    try { session.current?.close(); } catch (_) {}
    session.current = null;
    sessionOpen.current = false;
    scriptProcessorNode.current = null;
    mediaStream.current = null;
  }, []);

  // ─── Build system prompt ──────────────────────────────────────────────────
  // CRITICAL: The Gemini Live API hard-limits system instructions to ~8 000 tokens.
  // NEVER embed a full syllabus / document here — it causes instant 1011 server errors.
  // Large subject content must be retrieved on-demand via consult_knowledge_base.
  const buildSystemPrompt = useCallback((userPrompt: string) => {
    // Keep only the first 1 500 chars of the caller-supplied prompt.
    // That is enough to convey subject, level, and persona without exceeding
    // the API's system-instruction token budget.
    const PROMPT_CHAR_LIMIT = 1500;
    const safePrompt = userPrompt.length > PROMPT_CHAR_LIMIT
      ? userPrompt.slice(0, PROMPT_CHAR_LIMIT) +
        '\n[Full curriculum is available via the consult_knowledge_base tool.]'
      : userPrompt;

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
${safePrompt}`.trim();
  }, []);

  // ─── Init session ─────────────────────────────────────────────────────────
  const initSession = useCallback(async () => {
    if (!client.current) return;

    // Close any existing session cleanly
    if (session.current) {
      try { session.current.close(); } catch (_) {}
      session.current = null;
      sessionOpen.current = false;
    }

    updateStatus('Connecting to Gemini...');

    const model = 'gemini-2.5-flash-native-audio-preview-09-2025';
    const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
    if (!apiKey) { updateError('API key not found.'); return; }

    const systemInstruction = buildSystemPrompt(prompt);

    try {
      session.current = await client.current.live.connect({
        model,
        callbacks: {
          onopen: () => {
            sessionOpen.current = true;
            reconnectAttemptsRef.current = 0; // reset on successful connection
            console.log('[Session] Opened successfully');
            if (isRecordingRef.current) {
              updateStatus('🔴 Live Conversation… Speak now!');
            } else {
              updateStatus('Ready — press record to start.');
            }
          },

          // ─── Main message handler ─────────────────────────────────────────
          onmessage: async (message: LiveServerMessage) => {
            try {
              // Reset interrupted flag on new clean content
              if (message.serverContent && !message.serverContent.interrupted) {
                isInterruptedRef.current = false;
              }

              // ── Handle interruptions ──────────────────────────────────────
              if (message.serverContent?.interrupted) {
                console.log('[Session] Interruption received — clearing audio queue');
                isInterruptedRef.current = true;
                sources.current.forEach(s => { try { s.stop(); } catch (_) {} });
                sources.current.clear();
                nextStartTime.current = 0;
                return; // Don't process further on interruption
              }

              // ── Tool calls ────────────────────────────────────────────────
              const toolCallData = message.toolCall || (message as any).toolCalls;
              if (toolCallData?.functionCalls?.length) {
                // IMMEDIATELY open the board so the user sees something is happening
                setIsPanelOpen(true);
                pendingToolCallsRef.current += toolCallData.functionCalls.length;

                const functionResponses = await Promise.all(
                  toolCallData.functionCalls.map(async (call: any) => {
                    console.log(`[Tool] Handling: ${call.name} (id=${call.id})`);

                    // ── consult_knowledge_base ────────────────────────────
                    if (call.name === 'consult_knowledge_base') {
                      const { query } = call.args as { query: string };
                      const loadingId = uuidv4();

                      updateStatus(`Searching: "${query}"…`);
                      setVisualContexts(prev => [...prev, {
                        id: loadingId,
                        type: 'loading' as const,
                        content: `Searching: ${query}`,
                        source: 'database' as const,
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
                          : 'No relevant information found in the knowledge base.';

                        setVisualContexts(prev =>
                          prev.map(ctx =>
                            ctx.id === loadingId
                              ? { ...ctx, type: 'source_text' as const, content: resultText }
                              : ctx
                          )
                        );

                        updateStatus('🔴 Live Conversation… Speak now!');
                        return { id: call.id, name: call.name, response: { output: resultText } };
                      } catch (err) {
                        console.error('[Tool] consult_knowledge_base error:', err);
                        setVisualContexts(prev =>
                          prev.map(ctx =>
                            ctx.id === loadingId
                              ? { ...ctx, type: 'source_text' as const, content: 'Search failed — using general knowledge.' }
                              : ctx
                          )
                        );
                        return { id: call.id, name: call.name, response: { output: 'Search failed.' } };
                      }

                    // ── update_blackboard ─────────────────────────────────
                    } else if (call.name === 'update_blackboard') {
                      try {
                        const args = call.args as any;
                        const content = typeof args === 'string'
                          ? JSON.parse(args).content
                          : args?.content;

                        console.log('[Tool] Blackboard content:', content);

                        if (content) {
                          setVisualContexts(prev => [...prev, {
                            id: uuidv4(),
                            type: 'formula' as const,
                            content: String(content),
                            source: 'generated' as const,
                            timestamp: new Date(),
                          }]);
                        }

                        return { id: call.id, name: call.name, response: { output: 'Blackboard updated successfully.' } };
                      } catch (err) {
                        console.error('[Tool] update_blackboard error:', err);
                        return { id: call.id, name: call.name, response: { output: 'Failed to update blackboard.' } };
                      }

                    // ── Unknown tool ──────────────────────────────────────
                    } else {
                      console.warn('[Tool] Unknown tool:', call.name);
                      return { id: call.id, name: call.name, response: { output: 'Unknown tool.' } };
                    }
                  })
                );

                pendingToolCallsRef.current -= toolCallData.functionCalls.length;

                // Only send response if session is still alive and we weren't interrupted
                if (session.current && sessionOpen.current && !isInterruptedRef.current) {
                  try {
                    console.log('[Tool] Sending', functionResponses.length, 'response(s)');
                    session.current.sendToolResponse({ functionResponses });
                  } catch (err: any) {
                    console.error('[Tool] sendToolResponse error:', err);
                  }
                } else {
                  console.warn('[Tool] Skipping tool response — session gone or interrupted');
                }
              }

              // ── Audio playback ────────────────────────────────────────────
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
                      24000,
                      1
                    );
                    const source = audioContext.current.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputNode.current);
                    if (mixedStreamDestinationRef.current) {
                      source.connect(mixedStreamDestinationRef.current);
                    }
                    source.addEventListener('ended', () => sources.current.delete(source));

                    const currentTime = audioContext.current.currentTime;
                    if (nextStartTime.current < currentTime) {
                      nextStartTime.current = currentTime;
                    }
                    source.start(nextStartTime.current);
                    nextStartTime.current += audioBuffer.duration;
                    sources.current.add(source);
                  } catch (e) {
                    console.warn('[Audio] Failed to decode/play audio chunk:', e);
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
            console.warn('[Session] Closed — code:', e.code, '| reason:', e.reason || '(none)', '| clean:', e.wasClean);

            if (isUnmounted.current) return;

            if (isRecordingRef.current) {
              // Guard: skip if already reconnecting
              if (isReconnectingRef.current) {
                console.log('[Session] Already reconnecting — skipping duplicate');
                return;
              }

              // Guard: stop after MAX_RECONNECT_ATTEMPTS consecutive failures
              reconnectAttemptsRef.current += 1;
              if (reconnectAttemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
                console.error(`[Session] Giving up after ${MAX_RECONNECT_ATTEMPTS} reconnect attempts`);
                updateError(`Connection lost after ${MAX_RECONNECT_ATTEMPTS} retries. Please reset.`);
                stopConversation();
                reconnectAttemptsRef.current = 0;
                return;
              }

              // Exponential backoff: 300ms, 1.2s, 2.5s
              const delay = e.code === 1000
                ? 300
                : Math.min(300 * Math.pow(2, reconnectAttemptsRef.current), 5000);

              isReconnectingRef.current = true;
              console.log(`[Session] Closed (code ${e.code}) — attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}, reconnecting in ${delay}ms`);
              updateStatus(`Reconnecting (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);

              setTimeout(async () => {
                if (!isUnmounted.current && isRecordingRef.current) {
                  await initSession();
                }
                isReconnectingRef.current = false;
              }, delay);
            } else {
              updateStatus('Session closed.');
            }
          },
        },

        config: {
          systemInstruction,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } },
          },
          contextWindowCompression: { slidingWindow: {} },
          tools: [{
            functionDeclarations: [
              {
                name: 'consult_knowledge_base',
                description: 'Search the topic-specific knowledge base (documents, flashcards, past papers) to retrieve accurate, curriculum-aligned information.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    query: {
                      type: Type.STRING,
                      description: 'The search query to look up in the knowledge base.',
                    },
                  },
                  required: ['query'],
                },
              },
              {
                name: 'update_blackboard',
                description: 'Display a formula, equation, definition, bullet-point list, or teaching note on the student\'s blackboard. Use Markdown. No LaTeX/dollar-signs.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    content: {
                      type: Type.STRING,
                      description: 'The Markdown content to display on the blackboard.',
                    },
                  },
                  required: ['content'],
                },
              },
            ],
          }],
        },
      });
    } catch (e: any) {
      updateError(`Connection failed: ${e.message}`);
    }
  }, [prompt, stopConversation, buildSystemPrompt, topicId, subject, level]);

  // ─── Start conversation ───────────────────────────────────────────────────
  const startConversation = useCallback(async () => {
    if (isRecording) return;
    if (!isAllowed) { updateError('Usage limit reached. Please upgrade.'); return; }
    if (!session.current || !sessionOpen.current) { updateError('Session not ready. Please wait.'); return; }

    isStartingConversationRef.current = true;

    // Track usage
    if (!hasTrackedSession) {
      const { trackFeatureUsageAction } = require('@/app/(dashboard)/usage-actions');
      const res = await trackFeatureUsageAction('voiceTutor');
      if (!res.success) {
        isStartingConversationRef.current = false;
        updateError(`❌ ${res.error || 'Failed to start session. Limit reached.'}`);
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
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }

      const currentSampleRate = audioContext.current.sampleRate;
      console.log('[Audio] Sample rate:', currentSampleRate);

      mixedStreamDestinationRef.current = audioContext.current.createMediaStreamDestination();

      const micSourceNode = audioContext.current.createMediaStreamSource(mediaStream.current);
      micSourceNode.connect(mixedStreamDestinationRef.current);

      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(mixedStreamDestinationRef.current.stream, { mimeType: 'audio/webm' });

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

      scriptProcessorNode.current = audioContext.current.createScriptProcessor(4096, 1, 1);

      const geminiSourceNode = audioContext.current.createMediaStreamSource(mediaStream.current);
      geminiSourceNode.connect(scriptProcessorNode.current);

      // Volume meter
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

      // Silent output to keep processing chain alive
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
          if (err?.message?.includes('CLOSING') || err?.message?.includes('CLOSED')) return;
          console.warn('[Audio] Processing error:', err);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      updateStatus('🔴 Live Conversation… Speak now!');
    } catch (err: any) {
      updateError(`Microphone error: ${err.message}`);
    } finally {
      isStartingConversationRef.current = false;
    }
  }, [isRecording, isAllowed, hasTrackedSession, onConversationEnd, selectedDeviceId]);

  // ─── isEnding prop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isEnding && isRecording) stopConversation();
  }, [isEnding, isRecording, stopConversation]);

  // ─── Reset ────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    stopConversation();
    initSession();
  }, [initSession, stopConversation]);

  // ─── Force board sync ─────────────────────────────────────────────────────
  // IMPORTANT: We use sendRealtimeInput({text}) — NOT sendClientContent with
  // turnComplete:true — because the latter signals the server that the user's
  // turn is complete and the model should wrap up, which can trigger a session
  // close after it responds.
  const handleForceUpdate = useCallback(() => {
    if (!session.current || !sessionOpen.current) {
      updateError('Start a session first to sync the board.');
      return;
    }
    updateStatus('Syncing board…');
    try {
      session.current.sendRealtimeInput({
        text: '[SYSTEM COMMAND]: Please immediately call update_blackboard with the most important content from our current discussion — the latest worked example, formula, definition, or key summary. Do this now before saying anything.',
      });
      console.log('[ForceUpdate] Sent sync command via sendRealtimeInput');
    } catch (err: any) {
      console.error('[ForceUpdate] sendRealtimeInput failed:', err);
      updateError('Sync failed — try resetting the session.');
    }
  }, []);

  // ─── THREE.js + AudioContext init (run once) ──────────────────────────────
  useEffect(() => {
    isUnmounted.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

    if (audioContext.current) {
      outputNode.current = audioContext.current.createGain();
      outputNode.current.connect(audioContext.current.destination);
      const inputGainNode = audioContext.current.createGain();
      inputAnalyser.current = new Analyser(inputGainNode);
      outputAnalyser.current = new Analyser(outputNode.current);
    }

    client.current = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_API_KEY || '' });

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
      color: 0x000010, metalness: 0.5, roughness: 0.1, emissive: 0x000010, emissiveIntensity: 1.5,
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
    const bloomPass  = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 5, 0.5, 0);
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
          (10  * inputAnalyser.current.data[2]) / 255,
          0
        );
        mat.userData.shader.uniforms.outputData.value.set(
          (2  * outputAnalyser.current.data[0]) / 255,
          (0.1 * outputAnalyser.current.data[1]) / 255,
          (10  * outputAnalyser.current.data[2]) / 255,
          0
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
      mediaStream.current?.getTracks().forEach(t => t.stop());
      session.current?.close();
      audioContext.current?.close();
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, []);

  // ─── Init session when prompt is ready ───────────────────────────────────
  useEffect(() => {
    if (!prompt) return;
    if (isRecordingRef.current || isStartingConversationRef.current) return;
    if (session.current && sessionOpen.current) return;
    initSession();
  }, [prompt, initSession]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-[600px] flex flex-col md:flex-row bg-[#100c14] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">

      {/* Toggle Board Button */}
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="absolute top-4 right-4 z-[50] flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-md border border-white/10 transition-all shadow-lg active:scale-95"
      >
        <LayoutGrid size={18} />
        <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
          {isPanelOpen ? 'Hide Board' : 'Show Board'}
        </span>
      </button>

      {/* Sync Board Button */}
      {isPanelOpen && (
        <button
          onClick={handleForceUpdate}
          className="absolute top-4 left-10 z-[60] flex items-center gap-2 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-100 backdrop-blur-md border border-emerald-500/30 transition-all shadow-lg active:scale-95"
          title="Force AI to update the blackboard"
        >
          <RefreshCw size={14} className={status.includes('Syncing') ? 'animate-spin' : ''} />
          <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
            Sync Board
          </span>
        </button>
      )}

      {/* ── Main Tutor / 3D Canvas ── */}
      <div className="flex-1 relative min-h-[400px]">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        />

        {/* Status bar */}
        <div
          style={{
            position: 'absolute', bottom: '2vh', left: 0, right: 0,
            zIndex: 10, textAlign: 'center', color: 'white', fontSize: '14px', opacity: 0.8,
          }}
        >
          {error || status}
        </div>

        {/* Controls */}
        <div
          className="controls"
          style={{
            zIndex: 20, position: 'absolute', bottom: '8vh', left: 0, right: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '8px',
          }}
        >
          {/* Reset button */}
          <button
            id="resetButton"
            onClick={reset}
            aria-label="Reset Session"
            style={{
              outline: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'white',
              borderRadius: '12px', background: 'rgba(255,255,255,0.1)',
              width: '48px', height: '48px', cursor: 'pointer', fontSize: '24px',
              padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#ffffff">
              <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
            </svg>
          </button>

          {/* Record / Stop button */}
          {!isRecording ? (
            <button
              id="startButton"
              onClick={startConversation}
              aria-label="Start Recording"
              style={{
                outline: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'white',
                borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                width: '56px', height: '56px', cursor: 'pointer',
                padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg viewBox="0 0 100 100" width="32px" height="32px" fill="#c80000" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" />
              </svg>
            </button>
          ) : (
            <button
              id="stopButton"
              onClick={reset}
              aria-label="Stop Recording"
              style={{
                outline: 'none', border: '1px solid rgba(255,50,50,0.5)', color: 'white',
                borderRadius: '50%', background: 'rgba(200,0,0,0.2)',
                width: '56px', height: '56px', cursor: 'pointer',
                padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{ width: '20px', height: '20px', background: '#ef4444', borderRadius: '4px' }} />
            </button>
          )}

          {/* Volume meter + Settings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
            {isRecording && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(0,0,0,0.5)', padding: '8px 16px',
                borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <Volume2 size={16} color="white" />
                <div style={{
                  width: '100px', height: '4px',
                  background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${Math.min(100, volumeLevel * 2)}%`,
                    height: '100%',
                    background: volumeLevel > 50 ? '#ef4444' : '#22c55e',
                    transition: 'width 0.1s ease-out, background 0.3s ease',
                  }} />
                </div>
              </div>
            )}

            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                background: showSettings ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%',
                width: '40px', height: '40px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', color: 'white',
                transition: 'all 0.2s ease',
              }}
            >
              <Settings size={20} />
            </button>
          </div>

          {/* Microphone selector */}
          {showSettings && (
            <div style={{
              position: 'absolute', bottom: '70px',
              background: 'rgba(20,20,25,0.95)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
              padding: '12px', width: '280px', zIndex: 100,
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            }}>
              <p style={{
                color: 'white', fontSize: '12px', fontWeight: 'bold',
                marginBottom: '8px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Select Microphone
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {audioDevices.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '8px' }}>
                    No microphones found
                  </p>
                ) : (
                  audioDevices.map(device => (
                    <button
                      key={device.deviceId}
                      onClick={() => {
                        setSelectedDeviceId(device.deviceId);
                        setShowSettings(false);
                        if (isRecording) reset();
                      }}
                      style={{
                        background: selectedDeviceId === device.deviceId ? 'rgba(255,255,255,0.1)' : 'transparent',
                        border: 'none', borderRadius: '8px', padding: '8px 12px',
                        color: 'white', fontSize: '14px', textAlign: 'left', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                        {device.label || `Microphone ${device.deviceId.substring(0, 5)}…`}
                      </span>
                      {selectedDeviceId === device.deviceId && <Check size={14} color="#22c55e" />}
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => enumerateDevices()}
                style={{
                  marginTop: '8px', background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                  padding: '6px', color: 'white', fontSize: '11px',
                  width: '100%', cursor: 'pointer', opacity: 0.6,
                }}
              >
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

      {/* ── Side Context Panel ── */}
      <div
        className={`
          flex flex-col h-full border-l border-white/10 transition-all duration-300
          absolute top-15 right-0 z-40 bg-[#100c14]
          md:relative md:top-0 md:bg-transparent md:z-auto
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

// //components/live-transcription-audio-component.tsx

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

// // Helper to convert audio buffer to Base64
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

//   // Check if session is allowed on mount
//   useEffect(() => {
//     const { checkFeatureAllowedAction } = require('@/app/(dashboard)/usage-actions');
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
//   const session = useRef<any>(null); // Changed to any to allow flexible method calls

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
//   const isInterruptedRef = useRef(false); // New Ref

//   const updateStatus = (msg: string) => {
//     console.log(msg);
//     setStatus(msg);
//   };
//   const updateError = (msg: string) => {
//     setError(msg);
//   };

//   const isRecordingRef = useRef(isRecording);
//   isRecordingRef.current = isRecording;
//   // Guard so we never call initSession() while user is in the middle of clicking record
//   // (setState hasn't committed yet so isRecordingRef is still false).
//   const isStartingConversationRef = useRef(false);

//   // --- FIX 2: STABILIZE USECALLBACKS ---
//   // This function is now stable and won't cause re-renders because it has no dependencies.
//   // It uses a ref to get the current recording state.
//   const stopConversation = useCallback(() => {
//     if (!isRecordingRef.current) return;
//     isStartingConversationRef.current = false;
//     setIsRecording(false);
//     updateStatus('Ending conversation and preparing audio...');

//     if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
//       mediaRecorderRef.current.stop();
//     }

//     scriptProcessorNode.current?.disconnect();
//     mediaStream.current?.getTracks().forEach((track) => track.stop());
//     try {
//       session.current?.close();
//     } catch (_) {
//       // Session may already be closed by server; ignore
//     }
//     session.current = null;
//     sessionOpen.current = false;
//     scriptProcessorNode.current = null;
//     mediaStream.current = null;
//   }, []); // Empty dependency array makes this function stable

//   const initSession = useCallback(async () => {
//     if (!client.current) return;
//     // Close any existing session before opening a new one (avoids double-session; cleanup no longer closes)
//     if (session.current) {
//       try {
//         session.current.close();
//       } catch (_) {}
//       session.current = null;
//       sessionOpen.current = false;
//     }
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
//             let pendingToolResponses: Array<{ name?: string; id?: string; response: object }> = [];
//             try {
//               if (message.serverContent && !message.serverContent.interrupted) {
//                 isInterruptedRef.current = false;
//               }

//               // 1. Handle API variation (toolCall vs toolCalls)
//               const toolCallData = message.toolCall || (message as any).toolCalls;

//               // 2. Use toolCallData instead of message.toolCall
//               if (toolCallData && toolCallData.functionCalls) {
//                 try {
//                   console.log('[Tool Debug] Received tool calls:', toolCallData.functionCalls);

//                   // Process all tool calls in parallel and collect responses
//                   const functionResponses = await Promise.all(toolCallData.functionCalls.map(async (call: any) => {
//                     console.log(`[Tool Debug] Processing call: ${call.name} (ID: ${call.id})`);

//                     if (call.name === 'consult_knowledge_base') {
//                       try {
//                         const { query } = call.args as { query: string };
//                         updateStatus(`Searching knowledge base for: "${query}"...`);

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
//                             if (Array.isArray(accessibleTopics)) {
//                               searchIds = accessibleTopics.map((t: any) => t.id);
//                             }
//                           } catch (e) { searchIds = []; }
//                         } else {
//                           searchIds = [topicId];
//                         }

//                         const results = await searchResources(query, searchIds);
//                         console.log('[RAG Debug] searchResources results:', results);

//                         const isValidArray = Array.isArray(results);

//                         if (!results || !isValidArray || results.length === 0) {
//                           console.warn('[RAG Debug] Result text is empty or error returned, using fallback.');
//                         }

//                         let resultText = "";
//                         if (isValidArray && results.length > 0) {
//                           resultText = results.join('\n\n');
//                         } else {
//                           resultText = "No relevant information found in the knowledge base.";
//                         }

//                         setVisualContexts(prev => prev.map(ctx =>
//                           ctx.id === loadingId ? { ...ctx, type: 'source_text' as const, content: resultText } : ctx
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
//                          // 1. Robust Argument Parsing (Handle string vs object)
//                          const args = call.args as any;
//                          const content = typeof args === 'string' ? JSON.parse(args).content : args?.content;
                         
//                          console.log('[Tool Debug] Blackboard content:', content);
 
//                          if (content) {
//                              setVisualContexts(prev => [...prev, {
//                                id: uuidv4(),
//                                type: 'formula' as const,
//                                content: String(content),
//                                source: 'generated' as const,
//                                timestamp: new Date()
//                              }]);
//                              setIsPanelOpen(true);
//                          }
 
//                          // 2. Return 'result' instead of 'success'
//                          return {
//                            name: 'update_blackboard',
//                            id: call.id,
//                            response: { result: "Blackboard updated successfully" }
//                          };
//                       } catch (err) {
//                         console.error('[Tool Debug] Error in update_blackboard:', err);
//                         return { name: 'update_blackboard', id: call.id, response: { error: 'Failed' } };
//                       }
//                     }

//                     // Fallback for unknown tools
//                     console.warn(`[Tool Debug] Unknown tool: ${call.name}`);
//                     return {
//                       name: call.name,
//                       id: call.id,
//                       response: { error: 'Unknown tool' }
//                     };
//                   }));

//                   pendingToolResponses = [...functionResponses];
//                 } catch (mainErr) {
//                   console.error('[Tool Debug] Major error in tool processing loop:', mainErr);
//                 }
//               }

//               // 3. Handle Audio Content
//               const serverContent = message.serverContent;
//               if (serverContent) {
//                 if (serverContent.interrupted) {
//                   console.log('[Gemini Debug] Interruption detected. Clearing audio and pending tools.');
//                   isInterruptedRef.current = true;
//                   sources.current.forEach(source => source.stop());
//                   sources.current.clear();
//                   nextStartTime.current = 0;
//                   pendingToolResponses = [];
//                 }

//                 const modelTurn = serverContent.modelTurn;
//                 if (modelTurn?.parts) {
//                   for (const part of modelTurn.parts) {
//                     const audio = part.inlineData;
//                     if (!audio?.data || !audio.mimeType?.includes('audio')) continue;
//                     if (audioContext.current && outputNode.current) {
//                       try {
//                         const audioBuffer = await decodeAudioData(
//                           decode(audio.data ?? ''),
//                           audioContext.current,
//                           24000,
//                           1
//                         );
//                         const source = audioContext.current.createBufferSource();
//                         source.buffer = audioBuffer;
//                         source.connect(outputNode.current);
//                         if (mixedStreamDestinationRef.current) source.connect(mixedStreamDestinationRef.current);
//                         source.addEventListener('ended', () => sources.current.delete(source));
                        
//                         // Ensure smooth playback time
//                         const currentTime = audioContext.current.currentTime;
//                         if (nextStartTime.current < currentTime) {
//                             nextStartTime.current = currentTime;
//                         }
                        
//                         source.start(nextStartTime.current);
//                         nextStartTime.current += audioBuffer.duration;
//                         sources.current.add(source);
//                       } catch (e) {
//                         console.warn('[Gemini Debug] Failed to decode/play AI audio:', e);
//                       }
//                     }
//                   }
//                 }
//               }

//               // 4. Send Tool Responses (Delayed slightly to ensure processing order)
//               if (pendingToolResponses.length > 0) {
//                 const responses = pendingToolResponses;
//                 const sessionRef = session.current;
                
//                 // Reduced timeout to 0 to send immediately after processing current message loop
//                 setTimeout(() => {
//                   if (!sessionRef || !sessionOpen.current) return;
//                   if (isInterruptedRef.current) {
//                     console.warn('[Gemini Debug] Aborted sending tool response due to interruption.');
//                     return;
//                   }
//                   try {
//                     console.log('[Tool Debug] Sending tool responses:', responses.length);
//                     sessionRef.sendToolResponse({ functionResponses: responses });
//                   } catch (sendErr: any) {
//                     console.error('[Tool Debug] Error sending tool response:', sendErr);
//                   }
//                 }, 0);
//               }

//             } catch (err) {
//               console.error('[Gemini Debug] onmessage error:', err);
//             }
//           },
//           onerror: (e: ErrorEvent) => {
//             console.error('[Gemini Debug] Session error:', e.message);
//             updateError(e.message);
//           },
//           onclose: (e: CloseEvent) => {
//             sessionOpen.current = false;
//             session.current = null;
//             console.warn('[Gemini Debug] Session closed — code:', e.code, 'reason:', e.reason || '(none)', 'wasClean:', e.wasClean);
//             updateStatus('Session closed.');
//             if (isRecordingRef.current) stopConversation();
//           },
//         },
//         config: {
//           systemInstruction: enhancedPrompt,
//           responseModalities: [Modality.AUDIO],
//           speechConfig: {
//             voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } },
//           },
//           // Keep session open for multi-turn; without this the server may close after one turn
//           contextWindowCompression: { slidingWindow: {} },
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
//                 description: 'Display a math formula, equation, or teaching note on the student\'s blackboard. Content should be in Markdown/LaTeX.',
//                 parameters: {
//                   type: Type.OBJECT,
//                   properties: {
//                     content: {
//                       type: Type.STRING,
//                       description: 'The Markdown or LaTeX content to display.'
//                     }
//                   },
//                   required: ['content']
//                 }
//               },
//             ]
//           }]
//         },
//       });
//     } catch (e: any) {
//       updateError(e.message);
//     }
//   }, [prompt, stopConversation, topicId, subject, level]);

//   const startConversation = useCallback(async () => {
//     if (isRecording) return;
//     if (!isAllowed) {
//       updateError('You have reached your session limit. Please upgrade.');
//       return;
//     }
//     if (!session.current || !sessionOpen.current) {
//       updateError('Session not ready. Please wait.');
//       return;
//     }

//     isStartingConversationRef.current = true;
//     // Tracking
//     if (!hasTrackedSession) {
//       const { trackFeatureUsageAction } = require('@/app/(dashboard)/usage-actions');
//       const res = await trackFeatureUsageAction('voiceTutor');
//       if (!res.success) {
//         isStartingConversationRef.current = false;
//         updateError(`❌ ${res.error || "Failed to start session. Limit reached."} `);
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
//           deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined
//         }
//       });
//       updateStatus('Microphone access granted.');

//       if (!audioContext.current) {
//         //updateError('Audio context not initialized');
//         audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ 
//           sampleRate: 16000 
//         });
//         //return;
//       }

//       // Detect the ACTUAL sample rate the browser gave us (e.g., 48000 or 44100)
//       const currentSampleRate = audioContext.current.sampleRate;
//       console.log(`[Gemini Debug] Audio Sample Rate: ${currentSampleRate}Hz`);

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
//         if (!isRecordingRef.current || !session.current || !sessionOpen.current) return;
//         try {
//           const pcmData = event.inputBuffer.getChannelData(0);
//           session.current.sendRealtimeInput({ media: createBlob(pcmData) });
//         } catch (err: any) {
//           // Socket may be CLOSING/CLOSED; avoid spamming and don't let this cascade
//           if (err?.message?.includes('CLOSING') || err?.message?.includes('CLOSED')) return;
//           console.warn('[Gemini Debug] Audio processing error:', err);
//         }
//       };

//       mediaRecorderRef.current.start();
//       setIsRecording(true);
//       updateStatus('🔴 Live Conversation... Speak now!');
//     } catch (err: any) {
//       updateError(`Microphone error: ${err.message}.`);
//     } finally {
//       isStartingConversationRef.current = false;
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

//   // --- NEW FEATURE 1: FORCE UPDATE FUNCTION ---
//   const handleForceUpdate = useCallback(() => {
//     if (session.current && sessionOpen.current) {
//       updateStatus('Syncing board...');
//       session.current.sendClientContent({
//         turns: "SYSTEM_COMMAND: Update the blackboard with the current math or topic summary immediately.",
//         turnComplete: true,
//       });
//     } else {
//       updateError('Start session first to sync.');
//     }
//   }, []);

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

//   // Only init when we have a prompt; do NOT close session in cleanup — that was ending calls abruptly
//   // (e.g. effect re-run or Strict Mode). Session is closed on unmount by the canvas effect and in
//   // stopConversation / at the start of initSession when reconnecting.
//   useEffect(() => {
//     if (!prompt) return;
//     // Don’t reconnect while user is in a call — avoid tearing down session mid-conversation
//     if (isRecordingRef.current || isStartingConversationRef.current) return;
//     if (session.current && sessionOpen.current) return;
//     initSession();
//   }, [prompt, initSession]);

//   return (
//     <div className="w-full h-[600px] flex flex-col md:flex-row bg-[#100c14] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">

//       {/* --- NEW FEATURE 2: TOGGLE BOARD BUTTON (Top Right) --- */}
//       <button
//         onClick={() => setIsPanelOpen(!isPanelOpen)}
//         className="absolute top-4 right-4 z-[50] flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-md border border-white/10 transition-all shadow-lg active:scale-95"
//       >
//         <LayoutGrid size={18} />
//         <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
//           {isPanelOpen ? "Hide Board" : "Show Board"}
//         </span>
//       </button>

//            {isPanelOpen && (
//         <button
//           onClick={handleForceUpdate}
//           className="absolute top-4 left-10 z-[60] flex items-center gap-2 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-100 backdrop-blur-md border border-emerald-500/30 transition-all shadow-lg active:scale-95"
//           title="Force AI to update the blackboard"
//         >
//           <RefreshCw size={14} className={status.includes('Syncing') ? 'animate-spin' : ''} />
//           <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
//             Sync Active Context Board
//           </span>
//         </button>
//       )}

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

//       <div 
//         className={`
//           flex flex-col h-full border-l border-white/10 transition-all duration-300
          
//           /* Mobile: Absolute layout, high z-index, solid background to cover the 3D sphere */
//           absolute top-15 right-0 z-40 bg-[#100c14]
          
//           /* Desktop: Relative, RESET TOP TO 0, transparent background */
//           md:relative md:top-0 md:bg-transparent md:z-auto
          
//           /* Open/Close Width Logic */
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