// 'use client';
// /* tslint:disable */
// /**
//  * @license
//  * SPDX-License-Identifier: Apache-2.0
//  */

// import {GoogleGenAI, LiveServerMessage, Modality, Session} from '@google/genai';
// import {useCallback, useEffect, useRef, useState} from 'react';
// import {createBlob, decode, decodeAudioData} from '@/lib/utils';
// import {Analyser} from '@/lib/analyser';
// import * as THREE from 'three';
// import {EXRLoader} from 'three/addons/loaders/EXRLoader.js';
// import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
// import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
// import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
// import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
// import {vs as backdropVS, fs as backdropFS} from '@/lib/shaders/backdrop';
// import {vs as sphereVS} from '@/lib/shaders/sphere';

// interface LiveAudioComponentProps {
//   prompt: string;
// }

// export default function LiveAudioComponent({prompt}: LiveAudioComponentProps) {
//   const [isRecording, setIsRecording] = useState(false);
//   const [status, setStatus] = useState('Initializing...');
//   const [error, setError] = useState('');

//   const client = useRef<GoogleGenAI | null>(null);
//   const session = useRef<Session | null>(null);

//   const inputAudioContext = useRef<AudioContext | null>(null);
//   const outputAudioContext = useRef<AudioContext | null>(null);
//   const inputNode = useRef<GainNode | null>(null);
//   const outputNode = useRef<GainNode | null>(null);
//   const nextStartTime = useRef(0);
//   const mediaStream = useRef<MediaStream | null>(null);
//   const sourceNode = useRef<MediaStreamAudioSourceNode | null>(null);
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

//   const updateStatus = (msg: string) => {
//     console.log(msg);
//     setStatus(msg);
//   };
//   const updateError = (msg: string) => {
//     console.error(msg);
//     setError(msg);
//   };

//   const stopRecording = useCallback(() => {
//     if (!isRecording) return;
//     setIsRecording(false);
//     updateStatus('Stopping recording...');

//     scriptProcessorNode.current?.disconnect();
//     sourceNode.current?.disconnect();
//     mediaStream.current?.getTracks().forEach((track) => track.stop());

//     scriptProcessorNode.current = null;
//     sourceNode.current = null;
//     mediaStream.current = null;
    
//     updateStatus('Recording stopped. Press record to talk again.');
//   }, [isRecording]);

//   const initSession = useCallback(async () => {
//     if (!client.current) return;
//     updateStatus('Connecting to Gemini...');
//     const model = 'gemini-2.5-flash-preview-native-audio-dialog';
    
//     // Log API key status (without exposing the key)
//     const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
//     console.log('API Key status:', apiKey ? 'Present' : 'Missing');
//     console.log('API Key length:', apiKey.length);
//     console.log('API Key starts with:', apiKey.substring(0, 10) + '...');
//     console.log('process.env.NEXT_PUBLIC_API_KEY type:', typeof process.env.NEXT_PUBLIC_API_KEY);
//     console.log('process.env.NEXT_PUBLIC_API_KEY value:', process.env.NEXT_PUBLIC_API_KEY);
    
//     if (!apiKey) {
//       updateError('API key not found. Please set NEXT_PUBLIC_API_KEY in your environment variables.');
//       return;
//     }
    
//     try {
//       session.current = await client.current.live.connect({
//         model,
//         callbacks: {
//           onopen: () => {
//             sessionOpen.current = true;
//             console.log('Session opened successfully');
//             updateStatus('Connection opened. Start recording to talk.');
//           },
//           onmessage: async (message: LiveServerMessage) => {
//             const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData;
//             if (audio && outputAudioContext.current && outputNode.current) {
//               nextStartTime.current = Math.max(
//                 nextStartTime.current,
//                 outputAudioContext.current.currentTime,
//               );
//               const audioBuffer = await decodeAudioData(
//                 decode(audio.data ?? ''),
//                 outputAudioContext.current,
//                 24000,
//                 1,
//               );
//               const source = outputAudioContext.current.createBufferSource();
//               source.buffer = audioBuffer;
//               source.connect(outputNode.current);
//               source.addEventListener('ended', () => {
//                 sources.current.delete(source);
//               });
//               source.start(nextStartTime.current);
//               nextStartTime.current += audioBuffer.duration;
//               sources.current.add(source);
//             }
//             const interrupted = message.serverContent?.interrupted;
//             if (interrupted) {
//               sources.current.forEach(source => source.stop());
//               sources.current.clear();
//               nextStartTime.current = 0;
//             }
//           },
//           onerror: (e: ErrorEvent) => {
//             console.error('Gemini session error:', e);
//             console.error('Error details:', {
//               message: e.message,
//               type: e.type,
//               target: e.target,
//               error: e.error
//             });
//             updateError(e.message);
//           },
//           onclose: (e: CloseEvent) => {
//             sessionOpen.current = false;
//             console.log('Session closed. CloseEvent details:', {
//               code: e.code,
//               reason: e.reason,
//               wasClean: e.wasClean,
//               type: e.type
//             });
//             updateStatus('Session closed.');
//             if (isRecordingRef.current) {
//               stopRecording();
//             }
//           },
//         },
//         config: {
//           systemInstruction: prompt,
//           responseModalities: [Modality.AUDIO],
//           speechConfig: {
//             voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } },
//           },
//         },
//       });
//     } catch (e: any) {
//       console.error('Failed to create session:', e);
//       console.error('Error details:', {
//         message: e.message,
//         name: e.name,
//         stack: e.stack
//       });
//       updateError(e.message);
//     }
//   }, [prompt, stopRecording]);

//   const startRecording = useCallback(async () => {
//     if (isRecording) return;
//     if (!session.current || !sessionOpen.current) {
//       updateError('Session not initialized or not open. Please wait.');
//       return;
//     }
    
//     // Check if API key is available
//     const apiKey = process.env.NEXT_PUBLIC_API_KEY;
//     if (!apiKey) {
//       updateError('API key not found. Please set NEXT_PUBLIC_API_KEY in your environment variables.');
//       return;
//     }
    
//     inputAudioContext.current?.resume();
//     updateStatus('Requesting microphone...');
//     try {
//       mediaStream.current = await navigator.mediaDevices.getUserMedia({ 
//         audio: {
//           echoCancellation: true,
//           noiseSuppression: true,
//           autoGainControl: true,
//           sampleRate: 16000
//         } 
//       });
//       updateStatus('Microphone access granted.');
      
//       if (!inputAudioContext.current) {
//         updateError('Audio context not initialized');
//         return;
//       }
      
//       sourceNode.current = inputAudioContext.current.createMediaStreamSource(mediaStream.current);
//       sourceNode.current.connect(inputNode.current!);
//       scriptProcessorNode.current = inputAudioContext.current.createScriptProcessor(256, 1, 1);
//       scriptProcessorNode.current.onaudioprocess = (event) => {
//         if (!isRecordingRef.current) return;
//         if (!session.current || !sessionOpen.current) return;
//         const pcmData = event.inputBuffer.getChannelData(0);
//         console.log('Audio data captured:', pcmData.length, 'samples');
//         session.current?.sendRealtimeInput({ media: createBlob(pcmData) });
//       };
//       sourceNode.current.connect(scriptProcessorNode.current);
//       scriptProcessorNode.current.connect(inputAudioContext.current!.destination);
//       setIsRecording(true);
//       updateStatus('🔴 Recording... Speak now!');
//     } catch (err: any) {
//       console.error('Microphone error:', err);
//       updateError(`Microphone error: ${err.message}. Please check browser permissions.`);
//     }
//   }, [isRecording]);

//   const reset = useCallback(() => {
//     stopRecording();
//     session.current?.close();
//     initSession();
//   }, [initSession, stopRecording]);

//   const isRecordingRef = useRef(isRecording);
//   isRecordingRef.current = isRecording;

//   useEffect(() => {
//     isUnmounted.current = false;
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     // Init Audio
//     inputAudioContext.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
//     outputAudioContext.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
//     if (inputAudioContext.current && outputAudioContext.current) {
//       inputNode.current = inputAudioContext.current.createGain();
//       outputNode.current = outputAudioContext.current.createGain();
//       if (outputNode.current && outputAudioContext.current) {
//         outputNode.current.connect(outputAudioContext.current.destination);
//       }
//       if (inputNode.current) {
//         inputAnalyser.current = new Analyser(inputNode.current);
//       }
//       if (outputNode.current) {
//         outputAnalyser.current = new Analyser(outputNode.current);
//       }
//     }

//     // Init Client
//     client.current = new GoogleGenAI({apiKey: process.env.NEXT_PUBLIC_API_KEY || ''});
    
//     // Init 3D Scene
//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color(0x100c14);

//     const back = new THREE.Mesh(
//         new THREE.IcosahedronGeometry(10, 5),
//         new THREE.RawShaderMaterial({
//             uniforms: {
//               //resolution: {value: new THREE.Vector2(window.innerWidth, window.innerHeight)},
//               resolution: {value: new THREE.Vector2(0,0)},
//               rand: {value: 0},
//             },
//             vertexShader: backdropVS,
//             fragmentShader: backdropFS,
//             glslVersion: THREE.GLSL3,
//             side: THREE.BackSide,
//         }),
//     );
//     scene.add(back);
//     backdrop.current = back;

//     //camera.current = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
//     camera.current = new THREE.PerspectiveCamera(75, 1, 0.1, 1000); // Start with aspect 1
//     camera.current.position.set(0, 0, 5);

//     const renderer = new THREE.WebGLRenderer({
//         //canvas: canvasRef.current!,
//         canvas: canvas,
//         antialias: true,
//     });
//     //renderer.setSize(window.innerWidth, window.innerHeight);
//     renderer.setPixelRatio(window.devicePixelRatio);
    
//     const geometry = new THREE.IcosahedronGeometry(1, 10);
//     const pmremGenerator = new THREE.PMREMGenerator(renderer);
//     pmremGenerator.compileEquirectangularShader();
    
//     const sphereMaterial = new THREE.MeshStandardMaterial({
//         color: 0x000010,
//         metalness: 0.5,
//         roughness: 0.1,
//         emissive: 0x000010,
//         emissiveIntensity: 1.5,
//     });

//     new EXRLoader().load('/piz_compressed.exr', (texture) => {
//         texture.mapping = THREE.EquirectangularReflectionMapping;
//         const exrCubeRenderTarget = pmremGenerator.fromEquirectangular(texture);
//         sphereMaterial.envMap = exrCubeRenderTarget.texture;
//         if(sphere.current) sphere.current.visible = true;
//     }, undefined, (error) => {
//         console.warn('Failed to load EXR texture:', error);
//         // Continue without the environment map
//         if(sphere.current) sphere.current.visible = true;
//     });

//     sphereMaterial.onBeforeCompile = (shader) => {
//         shader.uniforms.time = {value: 0};
//         shader.uniforms.inputData = {value: new THREE.Vector4()};
//         shader.uniforms.outputData = {value: new THREE.Vector4()};
//         sphereMaterial.userData.shader = shader;
//         shader.vertexShader = sphereVS;
//     };
    
//     sphere.current = new THREE.Mesh(geometry, sphereMaterial);
//     sphere.current.visible = false;
//     scene.add(sphere.current);

//     const renderPass = new RenderPass(scene, camera.current);
//     const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 5, 0.5, 0);
//     composer.current = new EffectComposer(renderer);
//     composer.current.addPass(renderPass);
//     composer.current.addPass(bloomPass);

//     // const onWindowResize = () => {
//     //     if (!camera.current || !renderer || !composer.current || !backdrop.current) return;
//     //     camera.current.aspect = window.innerWidth / window.innerHeight;
//     //     camera.current.updateProjectionMatrix();
//     //     const dPR = renderer.getPixelRatio();
//     //     const w = window.innerWidth;
//     //     const h = window.innerHeight;
//     //     (backdrop.current.material as THREE.RawShaderMaterial).uniforms.resolution.value.set(w * dPR, h * dPR);
//     //     renderer.setSize(w, h);
//     //     composer.current.setSize(w, h);
//     // };
//     const onWindowResize = () => {
//       const parent = renderer.domElement.parentElement;
//       if (!camera.current || !renderer || !composer.current || !backdrop.current || !parent) return;
      
//       const w = parent.clientWidth;
//       const h = parent.clientHeight;

//       camera.current.aspect = w / h;
//       camera.current.updateProjectionMatrix();
      
//       const dPR = renderer.getPixelRatio();
//       (backdrop.current.material as THREE.RawShaderMaterial).uniforms.resolution.value.set(w * dPR, h * dPR);
      
//       renderer.setSize(w, h);
//       composer.current.setSize(w, h);
//   };
//     window.addEventListener('resize', onWindowResize);
    

//     // --- START OF THE FIX ---
//     // Use ResizeObserver to reliably get the container's size.
//     const resizeObserver = new ResizeObserver(entries => {
//       const entry = entries[0];
//       const { width, height } = entry.contentRect;

//       if (!camera.current || !renderer || !composer.current || !backdrop.current) return;
      
//       // Update camera
//       camera.current.aspect = width / height;
//       camera.current.updateProjectionMatrix();
      
//       // Update renderer and post-processing composer
//       renderer.setSize(width, height);
//       composer.current.setSize(width, height);
      
//       // Update shader uniforms
//       const dPR = renderer.getPixelRatio();
//       (backdrop.current.material as THREE.RawShaderMaterial).uniforms.resolution.value.set(width * dPR, height * dPR);
//     });

//     // Start observing the parent element of the canvas.
//     if (canvas.parentElement) {
//       resizeObserver.observe(canvas.parentElement);
//     }
//     // --- END OF THE FIX ---

//     // Animation loop
//     const animate = () => {
//         if (isUnmounted.current) return;
//         animationFrameId.current = requestAnimationFrame(animate);

//         if (!inputAnalyser.current || !outputAnalyser.current || !sphere.current || !backdrop.current || !composer.current || !camera.current) return;
        
//         inputAnalyser.current.update();
//         outputAnalyser.current.update();

//         const t = performance.now();
//         const dt = (t - prevTime.current) / (1000 / 60);
//         prevTime.current = t;

//         (backdrop.current.material as THREE.RawShaderMaterial).uniforms.rand.value = Math.random() * 10000;
        
//         const sphereMaterial = sphere.current.material as THREE.MeshStandardMaterial;
//         if (sphereMaterial.userData.shader) {
//             sphere.current.scale.setScalar(1 + (0.2 * outputAnalyser.current.data[1]) / 255);

//             const f = 0.001;
//             rotation.current.x += (dt * f * 0.5 * outputAnalyser.current.data[1]) / 255;
//             rotation.current.z += (dt * f * 0.5 * inputAnalyser.current.data[1]) / 255;
//             rotation.current.y += (dt * f * 0.25 * (inputAnalyser.current.data[2] + outputAnalyser.current.data[2])) / 255;

//             const euler = new THREE.Euler(rotation.current.x, rotation.current.y, rotation.current.z);
//             const quaternion = new THREE.Quaternion().setFromEuler(euler);
//             // Keep camera perfectly centered
//             camera.current.position.set(0, 0, 5);

//             //camera.current.lookAt(sphere.current.position);

//             sphereMaterial.userData.shader.uniforms.time.value += (dt * 0.1 * outputAnalyser.current.data[0]) / 255;
//             sphereMaterial.userData.shader.uniforms.inputData.value.set(
//                 (1 * inputAnalyser.current.data[0]) / 255,
//                 (0.1 * inputAnalyser.current.data[1]) / 255,
//                 (10 * inputAnalyser.current.data[2]) / 255,
//                  0
//             );
//             sphereMaterial.userData.shader.uniforms.outputData.value.set(
//                 (2 * outputAnalyser.current.data[0]) / 255,
//                 (0.1 * outputAnalyser.current.data[1]) / 255,
//                 (10 * outputAnalyser.current.data[2]) / 255,
//                 0
//             );
//         }

//         composer.current.render();
//     };

//     animate();

//     return () => {
//         isUnmounted.current = true;
//         if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
//         window.removeEventListener('resize', onWindowResize);
        
//         // Inline cleanup to avoid dependency on the `stopRecording` callback
//         scriptProcessorNode.current?.disconnect();
//         sourceNode.current?.disconnect();
//         mediaStream.current?.getTracks().forEach((track) => track.stop());
//         scriptProcessorNode.current = null;
//         sourceNode.current = null;
//         mediaStream.current = null;

//         session.current?.close();
//         inputAudioContext.current?.close();
//         outputAudioContext.current?.close();
//         pmremGenerator.dispose();
//         renderer.dispose();
//     };
//   }, []); // Empty dependency array ensures this effect runs only once on mount and unmount

//   useEffect(() => {
//     if (prompt) {
//         initSession();
//     }
//   }, [prompt, initSession]);

//   return (
//     <div style={{width: '100%', height: '100%', position: 'relative'}}>
//       <canvas ref={canvasRef} style={{width: '100%', height: '100%', position: 'absolute', inset: 0}} />
//       <div id="status" style={{position: 'absolute', bottom: '5vh', left: 0, right: 0, zIndex: 10, textAlign: 'center', color: 'white'}}>
//         {error || status}
//       </div>
//       <div className="controls" style={{zIndex: 10, position: 'absolute', bottom: '10vh', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px'}}>
//       <button id="resetButton" onClick={reset} disabled={isRecording} aria-label="Reset Session" style={{ outline: 'none', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.1)', width: '56px', height: '56px', cursor: 'pointer', fontSize: '24px', padding: 0, margin: 0, display: isRecording ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>

//       {/* <div className="controls" style={{zIndex: 10, position: 'absolute', bottom: '10vh', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px'}}> */}
//         {/* <button id="resetButton" onClick={reset} disabled={isRecording} aria-label="Reset Session" style={{ outline: 'none', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.1)', width: '64px', height: '64px', cursor: 'pointer', fontSize: '24px', padding: 0, margin: 0, display: isRecording ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}> */}

//           <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#ffffff"><path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" /></svg>
//         </button>
//         <button id="startButton" onClick={startRecording} disabled={isRecording} aria-label="Start Recording" style={{ outline: 'none', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', width: '56px', height: '56px', cursor: 'pointer', padding: 0, margin: 0, display: isRecording ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
//         {/* <button id="startButton" onClick={startRecording} disabled={isRecording} aria-label="Start Recording" style={{ outline: 'none', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', width: '64px', height: '64px', cursor: 'pointer', padding: 0, margin: 0, display: isRecording ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}> */}
//           <svg viewBox="0 0 100 100" width="32px" height="32px" fill="#c80000" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" /></svg>
//         </button>
//         <button id="stopButton" onClick={stopRecording} disabled={!isRecording} aria-label="Stop Recording" style={{ outline: 'none', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.1)', width: '56px', height: '56px', cursor: 'pointer', padding: 0, margin: 0, display: !isRecording ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
//         {/* <button id="stopButton" onClick={stopRecording} disabled={!isRecording} aria-label="Stop Recording" style={{ outline: 'none', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.1)', width: '64px', height: '64px', cursor: 'pointer', padding: 0, margin: 0, display: !isRecording ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}> */}
//           <svg viewBox="0 0 100 100" width="32px" height="32px" fill="#ffffff" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="70" height="70" rx="8" /></svg>
//         </button>
//       </div>
//     </div>
//   );
// }



'use client';
/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, LiveServerMessage, Modality, Session} from '@google/genai';
import {useCallback, useEffect, useRef, useState} from 'react';
import {createBlob, decode, decodeAudioData} from '@/lib/utils';
import {Analyser} from '@/lib/analyser';
import * as THREE from 'three';
import {EXRLoader} from 'three/addons/loaders/EXRLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {vs as backdropVS, fs as backdropFS} from '@/lib/shaders/backdrop';
import {vs as sphereVS} from '@/lib/shaders/sphere';

interface LiveAudioComponentProps {
  prompt: string;
}

export default function LiveAudioComponent({prompt}: LiveAudioComponentProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState('');
  // FIX: Added state to track if the session is ready for interaction
  const [isSessionReady, setIsSessionReady] = useState(false);


  const client = useRef<GoogleGenAI | null>(null);
  const session = useRef<Session | null>(null);

  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const inputNode = useRef<GainNode | null>(null);
  const outputNode = useRef<GainNode | null>(null);
  const nextStartTime = useRef(0);
  const mediaStream = useRef<MediaStream | null>(null);
  const sourceNode = useRef<MediaStreamAudioSourceNode | null>(null);
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

  // FIX: Use a ref for isRecording to avoid stale closures in callbacks
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;


  const updateStatus = (msg: string) => {
    console.log(msg);
    setStatus(msg);
  };
  const updateError = (msg: string) => {
    console.error(msg);
    setError(msg);
  };

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    setIsRecording(false);
    updateStatus('Stopping recording...');

    scriptProcessorNode.current?.disconnect();
    sourceNode.current?.disconnect();
    mediaStream.current?.getTracks().forEach((track) => track.stop());

    scriptProcessorNode.current = null;
    sourceNode.current = null;
    mediaStream.current = null;
    
    updateStatus('Recording stopped. Press record to talk again.');
  }, []); // FIX: Empty dependency array as it has no external dependencies

  // FIX: This entire useEffect block is refactored to handle the Gemini session lifecycle robustly
  useEffect(() => {
    let isCancelled = false;
    
    const initSession = async () => {
      // Ensure client is initialized
      if (!client.current) {
        const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
        if (!apiKey) {
          updateError('API key not found. Please set NEXT_PUBLIC_API_KEY in your environment variables.');
          return;
        }
        client.current = new GoogleGenAI({ apiKey });
      }

      if (!prompt) return;
      
      updateStatus('Connecting to Gemini...');
      setError('');
      
      try {
        const newSession = await client.current.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              if (isCancelled) return;
              console.log('Session opened successfully');
              setIsSessionReady(true);
              updateStatus('Connection opened. Start recording to talk.');
            },
            onmessage: async (message: LiveServerMessage) => {
              if (isCancelled) return;
              const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData;
              if (audio && outputAudioContext.current && outputNode.current) {
                nextStartTime.current = Math.max(
                  nextStartTime.current,
                  outputAudioContext.current.currentTime,
                );
                const audioBuffer = await decodeAudioData(
                  decode(audio.data ?? ''),
                  outputAudioContext.current,
                  24000,
                  1,
                );
                const source = outputAudioContext.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode.current);
                source.addEventListener('ended', () => {
                  sources.current.delete(source);
                });
                source.start(nextStartTime.current);
                nextStartTime.current += audioBuffer.duration;
                sources.current.add(source);
              }
              const interrupted = message.serverContent?.interrupted;
              if (interrupted) {
                sources.current.forEach(source => source.stop());
                sources.current.clear();
                nextStartTime.current = 0;
              }
            },
            onerror: (e: ErrorEvent) => {
              if (isCancelled) return;
              console.error('Gemini session error:', e);
              updateError(`Session error: ${e.message}`);
              setIsSessionReady(false);
            },
            onclose: (e: CloseEvent) => {
              if (isCancelled) return;
              console.log('Session closed. CloseEvent details:', {
                code: e.code,
                reason: e.reason,
                wasClean: e.wasClean,
              });
              setIsSessionReady(false);
              updateStatus('Session closed.');
              if (isRecordingRef.current) {
                stopRecording();
              }
            },
          },
          config: {
            systemInstruction: prompt,
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } },
            },
          },
        });
        session.current = newSession;

      } catch (e: any) {
        if (isCancelled) return;
        console.error('Failed to create session:', e);
        updateError(`Failed to create session: ${e.message}`);
      }
    };
    
    initSession();

    // This is the crucial cleanup function
    return () => {
      isCancelled = true;
      if (session.current) {
        console.log('Closing session on component unmount or prompt change.');
        session.current.close();
        session.current = null;
      }
      setIsSessionReady(false);
    };
  }, [prompt, stopRecording]); // Rerun this effect only if the prompt changes

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return;
    if (!session.current || !isSessionReady) {
      updateError('Session not initialized or not open. Please wait.');
      return;
    }
    
    setError(''); // Clear previous errors
    inputAudioContext.current?.resume();
    updateStatus('Requesting microphone...');
    try {
      mediaStream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      updateStatus('Microphone access granted.');
      
      if (!inputAudioContext.current || !inputNode.current) {
        updateError('Audio context not initialized');
        return;
      }
      
      sourceNode.current = inputAudioContext.current.createMediaStreamSource(mediaStream.current);
      sourceNode.current.connect(inputNode.current);
      // Use a larger buffer size for better performance
      scriptProcessorNode.current = inputAudioContext.current.createScriptProcessor(1024, 1, 1);
      scriptProcessorNode.current.onaudioprocess = (event) => {
        if (!isRecordingRef.current || !session.current || !isSessionReady) return;
        const pcmData = event.inputBuffer.getChannelData(0);
        session.current?.sendRealtimeInput({ media: createBlob(pcmData) });
      };
      sourceNode.current.connect(scriptProcessorNode.current);
      scriptProcessorNode.current.connect(inputAudioContext.current.destination);
      setIsRecording(true);
      updateStatus('🔴 Recording... Speak now!');
    } catch (err: any) {
      console.error('Microphone error:', err);
      updateError(`Microphone error: ${err.message}. Please check browser permissions.`);
    }
  }, [isSessionReady]);

  const reset = useCallback(() => {
    stopRecording();
    updateStatus('Session reset. Ready to start again.');
    // The main useEffect will handle re-initializing if needed, but for now this is clean.
  }, [stopRecording]);

  // This effect handles the 3D scene and audio context setup (runs only once on mount)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // --- Init Audio ---
    inputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    inputNode.current = inputAudioContext.current.createGain();
    outputNode.current = outputAudioContext.current.createGain();
    outputNode.current.connect(outputAudioContext.current.destination);
    
    inputAnalyser.current = new Analyser(inputNode.current);
    outputAnalyser.current = new Analyser(outputNode.current);

    // --- Init 3D Scene ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x100c14);

    const back = new THREE.Mesh(
        new THREE.IcosahedronGeometry(10, 5),
        new THREE.RawShaderMaterial({
            uniforms: {
              resolution: {value: new THREE.Vector2(0,0)},
              rand: {value: 0},
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

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    
    const geometry = new THREE.IcosahedronGeometry(1, 10);
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    
    const sphereMaterial = new THREE.MeshStandardMaterial({
        color: 0x000010,
        metalness: 0.5,
        roughness: 0.1,
        emissive: 0x000010,
        emissiveIntensity: 1.5,
    });

    new EXRLoader().load('/piz_compressed.exr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const exrCubeRenderTarget = pmremGenerator.fromEquirectangular(texture);
        sphereMaterial.envMap = exrCubeRenderTarget.texture;
        if(sphere.current) sphere.current.visible = true;
    }, undefined, (error) => {
        console.warn('Failed to load EXR texture:', error);
        if(sphere.current) sphere.current.visible = true;
    });

    sphereMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.time = {value: 0};
        shader.uniforms.inputData = {value: new THREE.Vector4()};
        shader.uniforms.outputData = {value: new THREE.Vector4()};
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

    const onResize = () => {
      const parent = renderer.domElement.parentElement;
      if (!camera.current || !composer.current || !backdrop.current || !parent) return;
      
      const { clientWidth: w, clientHeight: h } = parent;
      camera.current.aspect = w / h;
      camera.current.updateProjectionMatrix();
      
      const dPR = renderer.getPixelRatio();
      (backdrop.current.material as THREE.RawShaderMaterial).uniforms.resolution.value.set(w * dPR, h * dPR);
      
      renderer.setSize(w, h);
      composer.current.setSize(w, h);
    };
    
    const resizeObserver = new ResizeObserver(onResize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    onResize(); // Initial resize call

    const animate = () => {
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
                (1 * inputAnalyser.current.data[0]) / 255,
                (0.1 * inputAnalyser.current.data[1]) / 255,
                (10 * inputAnalyser.current.data[2]) / 255,
                 0
            );
            sphereMaterial.userData.shader.uniforms.outputData.value.set(
                (2 * outputAnalyser.current.data[0]) / 255,
                (0.1 * outputAnalyser.current.data[1]) / 255,
                (10 * outputAnalyser.current.data[2]) / 255,
                0
            );
        }

        composer.current.render();
    };

    animate();

    return () => {
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        if (canvas.parentElement) resizeObserver.unobserve(canvas.parentElement);
        
        stopRecording(); // This is stable now
        inputAudioContext.current?.close();
        outputAudioContext.current?.close();
        pmremGenerator.dispose();
        renderer.dispose();
    };
  }, [stopRecording]); // Only depends on the stable stopRecording function

  // Main component render
  return (
    <div style={{width: '100%', height: '100%', position: 'relative'}}>
      <canvas ref={canvasRef} style={{width: '100%', height: '100%', position: 'absolute', inset: 0}} />
      <div id="status" style={{position: 'absolute', bottom: '5vh', left: 0, right: 0, zIndex: 10, textAlign: 'center', color: 'white'}}>
        {error || status}
      </div>
      <div className="controls" style={{zIndex: 10, position: 'absolute', bottom: '10vh', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px'}}>
        <button id="resetButton" onClick={reset} disabled={isRecording} aria-label="Reset Session" style={{ outline: 'none', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.1)', width: '56px', height: '56px', cursor: 'pointer', fontSize: '24px', padding: 0, margin: 0, display: isRecording ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#ffffff"><path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" /></svg>
        </button>
        {/* FIX: The start button is now disabled until the session is fully ready */}
        <button id="startButton" onClick={startRecording} disabled={isRecording || !isSessionReady} aria-label="Start Recording" style={{ outline: 'none', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', width: '56px', height: '56px', cursor: isSessionReady ? 'pointer' : 'not-allowed', padding: 0, margin: 0, display: isRecording ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', opacity: isSessionReady ? 1 : 0.5 }}>
          <svg viewBox="0 0 100 100" width="32px" height="32px" fill="#c80000" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" /></svg>
        </button>
        <button id="stopButton" onClick={stopRecording} disabled={!isRecording} aria-label="Stop Recording" style={{ outline: 'none', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.1)', width: '56px', height: '56px', cursor: 'pointer', padding: 0, margin: 0, display: !isRecording ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 100 100" width="32px" height="32px" fill="#ffffff" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="70" height="70" rx="8" /></svg>
        </button>
      </div>
    </div>
  );
}