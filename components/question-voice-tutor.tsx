'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, X, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LiveAudioComponent from '@/components/live-simulation-component';

interface QuestionVoiceTutorProps {
  questionNumber?: number | string;
  questionText: string;           // plain text or HTML — we strip tags for the prompt
  modelAnswer: string;            // plain text or HTML
  workingText?: string;           // optional step-by-step working
  topicTag?: string;
  level?: string;
  subject?: string;
  topicId?: number;
}

// Strip HTML tags to plain text for the voice prompt
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function QuestionVoiceTutor({
  questionNumber,
  questionText,
  modelAnswer,
  workingText,
  topicTag,
  level = 'CSEC',
  subject = '',
  topicId = -1,
}: QuestionVoiceTutorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Build a tightly scoped system prompt for this specific question
  const questionPrompt = `You are a Personal Exam Tutor helping a student understand a specific past paper question.

YOUR ONLY JOB: Help the student understand THIS question and how to answer it correctly.
Do NOT teach the entire topic — stay focused on this question only.

QUESTION CONTEXT:
${questionNumber ? `Question Number: ${questionNumber}` : ''}
${topicTag ? `Topic: ${topicTag}` : ''}
${subject ? `Subject: ${subject} (${level})` : ''}

THE QUESTION:
${stripHtml(questionText)}

MODEL ANSWER:
${stripHtml(modelAnswer)}
${workingText ? `\nSTEP-BY-STEP WORKING:\n${stripHtml(workingText)}` : ''}

YOUR APPROACH:
1. Start by asking the student what part of the question confused them or where they got stuck.
2. Do NOT just read out the model answer — guide them to understand the reasoning.
3. Use the working steps above to walk through the logic piece by piece.
4. Ask checking questions like "Does that make sense?" or "Can you see why that step works?"
5. Keep all responses short — 1 to 3 sentences maximum. This is a conversation, not a lecture.
6. If a student gives a wrong answer, correct them gently and explain why.

IMPORTANT RULES:
- Speak conversationally. You are tutoring by voice, not writing.
- No LaTeX. No dollar signs. Say "squared" instead of x^2 when speaking.
- Stay on this question only. If the student asks about something unrelated, gently redirect.`;

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <div className="mt-3">
      {!isOpen ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="h-8 flex-1 sm:flex-none transition-colors text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-300"
        >
          <Mic className="h-4 w-4 mr-1.5 shrink-0" />
          <span className="whitespace-nowrap">Voice Tutor</span>
        </Button>
      ) : (
        <div className="border border-purple-200 rounded-xl bg-purple-50/20 overflow-hidden shadow-inner">
          {/* Header */}
          <div className="p-3 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
            <span className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
              <Mic className="h-3 w-3" />
              VOICE TUTOR{questionNumber ? `: QUESTION ${questionNumber}` : ''}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-6 w-6 text-purple-400 hover:text-purple-700 hover:bg-purple-100"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Inline voice component — compact height */}
          <div className="h-[210px] relative w-full overflow-hidden rounded-b-xl bg-slate-950">
            <div className="absolute top-0 left-0 w-[200%] h-[420px] origin-top-left scale-50">
              <LiveAudioComponent
                prompt={questionPrompt}
                topicId={topicId}
                subject={subject}
                level={level}
                onConversationEnd={() => {}}
                isEnding={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}