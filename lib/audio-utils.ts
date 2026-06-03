// lib/audio-utils.ts
// Helper functions for the new AudioWorklet pipeline

/**
 * Converts an Int16Array of PCM samples into a base64 string
 * that Gemini's sendRealtimeInput() accepts.
 * 
 * Previously this was handled inside createBlob() — we now do it
 * here so the worklet thread sends Int16 directly (no Float32 conversion needed).
 */
export function int16ArrayToBase64(int16Array: Int16Array): string {
    const uint8 = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < uint8.byteLength; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  }
  
  /**
   * Creates the Gemini-compatible blob object from a base64 PCM string.
   * Gemini Live API expects audio/pcm with 16kHz sample rate.
   */
  export function createPCMBlob(base64: string) {
    return {
      mimeType: 'audio/pcm;rate=16000',
      data: base64,
    };
  }