'use client';

import { useState } from 'react';
import LiveAudioComponent from '@/components/live-audio-component';

export default function Home() {
  // Temporary debug log
  const [prompt, setPrompt] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);

  const handleStartSession = () => {
    if (prompt.trim()) {
      setSessionStarted(true);
    }
  };

  return (
    <main className="flex-1 p-6">
      {!sessionStarted ? (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] max-w-2xl mx-auto">
          <div className="text-center space-y-6 w-full">
            <h1 className="text-4xl font-semibold text-gray-300 tracking-tight">
              Live AI Conversation
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed max-w-lg mx-auto">
              Provide a context or a persona for the AI to start the conversation.
            </p>
            
            <div className="space-y-4 w-full">
              <textarea
                className="w-full h-32 px-4 py-3 text-gray-700 bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="For example: 'You are a space explorer on Mars, describe what you see.' or 'Let's have a debate about the future of renewable energy.'"
                aria-label="AI context prompt"
              />
              
              <button
                className={`w-full sm:w-auto px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                  prompt.trim()
                    ? 'bg-gray-800 text-white hover:bg-gray-700 transform hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                onClick={handleStartSession}
                disabled={!prompt.trim()}
                aria-label="Start session"
              >
                Start Session
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-[calc(100vh-120px)] relative rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black shadow-2xl border border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-gray-900/20"></div>
          <div className="relative w-full h-full">
            <LiveAudioComponent prompt={prompt} />
          </div>
          
          {/* Session Info Overlay */}
          <div className="absolute top-4 left-4 z-20">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-600/30">
              <p className="text-gray-300 text-sm font-medium">Active Session</p>
              <p className="text-gray-400 text-xs max-w-xs truncate">{prompt}</p>
            </div>
          </div>
          
          {/* Back Button */}
          <button
            onClick={() => setSessionStarted(false)}
            className="absolute top-4 right-4 z-20 bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-all duration-200 rounded-lg p-2 border border-gray-600/30"
            aria-label="Back to setup"
          >
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        </div>
      )}
    </main>
  );
}
