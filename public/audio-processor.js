// public/audio-processor.js
// This file runs on the browser's dedicated audio thread — completely separate
// from React, Three.js, and the main page. Nothing can interrupt it.

class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      // Buffer to accumulate samples before sending
      // 2048 samples at 16kHz = 128ms — half the old delay
      this._buffer = new Int16Array(2048);
      this._bufferIndex = 0;
    }
  
    process(inputs) {
      // inputs[0] is the microphone channel
      // inputs[0][0] is the array of Float32 audio samples for this frame
      const input = inputs[0];
      if (!input || !input[0]) return true;
  
      const float32Samples = input[0];
  
      for (let i = 0; i < float32Samples.length; i++) {
        // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
        // This is the format Gemini expects
        const s = Math.max(-1, Math.min(1, float32Samples[i]));
        this._buffer[this._bufferIndex++] = s < 0 ? s * 0x8000 : s * 0x7fff;
  
        // When buffer is full, send it to the main thread and reset
        if (this._bufferIndex >= this._buffer.length) {
          // Send a copy — we keep writing to the original
          this.port.postMessage(this._buffer.slice(0));
          this._bufferIndex = 0;
        }
      }
  
      // Return true = keep processor alive
      return true;
    }
  }
  
  registerProcessor('pcm-processor', PCMProcessor);