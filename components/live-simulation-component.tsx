
// components/live-transcription-audio-component.tsx

'use client';
/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';
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

interface LiveAudioComponentProps {
  prompt: string;
  onConversationEnd: (audioBlob: Blob) => void;
  isEnding: boolean;
}

export default function LiveAudioComponent({ prompt, onConversationEnd, isEnding }: LiveAudioComponentProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState('');
  const [hasTrackedSession, setHasTrackedSession] = useState(false);
  const [isAllowed, setIsAllowed] = useState(true);

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

  const client = useRef<GoogleGenAI | null>(null);
  const session = useRef<Session | null>(null);

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

  const updateStatus = (msg: string) => {
    console.log(msg);
    setStatus(msg);
  };
  const updateError = (msg: string) => {
    setError(msg);
  };

  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  // --- FIX 2: STABILIZE USECALLBACKS ---
  // This function is now stable and won't cause re-renders because it has no dependencies.
  // It uses a ref to get the current recording state.
  const stopConversation = useCallback(() => {
    if (!isRecordingRef.current) return;
    setIsRecording(false);
    updateStatus('Ending conversation and preparing audio...');

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    scriptProcessorNode.current?.disconnect();
    // No need to disconnect sourceNode, as it's part of the stream that's stopping
    mediaStream.current?.getTracks().forEach((track) => track.stop());
    session.current?.close();

    scriptProcessorNode.current = null;
    mediaStream.current = null;
  }, []); // Empty dependency array makes this function stable

  const initSession = useCallback(async () => {
    if (!client.current) return;
    updateStatus('Connecting to Gemini...');

    const model = 'gemini-2.5-flash-native-audio-preview-09-2025';
    const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
    if (!apiKey) {
      updateError('API key not found.');
      return;
    }

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
            const serverContent = message.serverContent;
            if (!serverContent) return;

            const aiPart = serverContent.modelTurn?.parts?.[0];
            if (aiPart?.inlineData) {
              const audio = aiPart.inlineData;
              // Use the single, shared audio context
              if (audioContext.current && outputNode.current && mixedStreamDestinationRef.current) {
                // Decode audio using the single context. It will handle resampling from 24kHz to 16kHz.
                const audioBuffer = await decodeAudioData(
                  decode(audio.data ?? ''),
                  audioContext.current, 24000, 1
                );
                const source = audioContext.current.createBufferSource();
                source.buffer = audioBuffer;

                source.connect(outputNode.current);
                // This connection will now succeed as both nodes are from the same context
                source.connect(mixedStreamDestinationRef.current);

                source.addEventListener('ended', () => sources.current.delete(source));

                nextStartTime.current = Math.max(nextStartTime.current, audioContext.current.currentTime);
                source.start(nextStartTime.current);
                nextStartTime.current += audioBuffer.duration;
                sources.current.add(source);
              }
            }

            if (serverContent.interrupted) {
              sources.current.forEach(source => source.stop());
              sources.current.clear();
              nextStartTime.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => updateError(e.message),
          onclose: (e: CloseEvent) => {
            sessionOpen.current = false;
            console.log('Session closed.');
            updateStatus('Session closed.');
            if (isRecordingRef.current) stopConversation();
          },
        },
        config: {
          systemInstruction: prompt,
          responseModalities: [Modality.AUDIO],
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

    // Tracking
    if (!hasTrackedSession) {
      const { trackFeatureUsageAction } = require('@/app/(dashboard)/usage-actions');
      const res = await trackFeatureUsageAction('voiceTutor');
      if (!res.success) {
        updateError(`❌ ${res.error || "Failed to start session. Limit reached."}`);
        return;
      }
      setHasTrackedSession(true);
    }

    if (!session.current || !sessionOpen.current) {
      updateError('Session not ready. Please wait.');
      return;
    }

    audioContext.current?.resume();
    updateStatus('Requesting microphone...');
    try {
      mediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000 }
      });
      updateStatus('Microphone access granted.');

      if (!audioContext.current) {
        updateError('Audio context not initialized');
        return;
      }

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
      // Connect to the destination to keep the processing chain alive, but with gain 0 to avoid echo.
      const muteNode = audioContext.current.createGain();
      muteNode.gain.setValueAtTime(0, audioContext.current.currentTime);
      scriptProcessorNode.current.connect(muteNode);
      muteNode.connect(audioContext.current.destination);

      scriptProcessorNode.current.onaudioprocess = (event) => {
        if (isRecordingRef.current && session.current && sessionOpen.current) {
          const pcmData = event.inputBuffer.getChannelData(0);
          session.current?.sendRealtimeInput({ media: createBlob(pcmData) });
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      updateStatus('🔴 Live Conversation... Speak now!');
    } catch (err: any) {
      updateError(`Microphone error: ${err.message}.`);
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

  useEffect(() => {
    if (prompt) {
      initSession();
    }
    return () => {
      session.current?.close();
    }
  }, [prompt, initSession]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
      <div id="status" style={{ position: 'absolute', bottom: '5vh', left: 0, right: 0, zIndex: 10, textAlign: 'center', color: 'white' }}>
        {error || status}
      </div>
      <div className="controls" style={{ zIndex: 10, position: 'absolute', bottom: '10vh', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
        <button id="resetButton" onClick={reset} disabled={isRecording} aria-label="Reset Session" style={{ outline: 'none', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.1)', width: '56px', height: '56px', cursor: 'pointer', fontSize: '24px', padding: 0, margin: 0, display: isRecording ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#ffffff"><path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" /></svg>
        </button>
        <button id="startButton" onClick={startConversation} disabled={isRecording} aria-label="Start Recording" style={{ outline: 'none', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', width: '56px', height: '56px', cursor: 'pointer', padding: 0, margin: 0, display: isRecording ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 100 100" width="32px" height="32px" fill="#c80000" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" /></svg>
        </button>
        {isRecording && <div style={{ color: 'white', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '8px' }}>Conversation is being recorded</div>}
      </div>
    </div>
  );
}