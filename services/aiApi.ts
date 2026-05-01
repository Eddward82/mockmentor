/**
 * aiApi.ts — Frontend service layer for all AI operations.
 *
 * All calls go through Firebase Cloud Functions (secure server-side).
 * No AI API keys are needed or stored in the frontend bundle.
 */

import { auth } from './firebase';
import { getToken } from 'firebase/app-check';
import { appCheck } from './firebase';
import { InterviewConfig, InterviewQuestion } from '../types';

// ---------------------------------------------------------------------------
// Base URL — Cloud Functions region / project
// In production this resolves to the deployed function URL.
// In dev with the emulator, set VITE_FUNCTIONS_BASE_URL in .env.local.
// ---------------------------------------------------------------------------
const FUNCTIONS_BASE =
  (import.meta as any).env?.VITE_FUNCTIONS_BASE_URL ||
  'https://us-central1-sql-calculation-393000.cloudfunctions.net';

// ---------------------------------------------------------------------------
// Auth token helper
// ---------------------------------------------------------------------------
async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return user.getIdToken();
}

export async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${await getIdToken()}`,
    'Content-Type': 'application/json',
  };
  if (appCheck) {
    try {
      const { token } = await getToken(appCheck);
      headers['X-Firebase-AppCheck'] = token;
    } catch {
      // App Check token unavailable (dev/emulator) — proceed without it
    }
  }
  return headers;
}

// ---------------------------------------------------------------------------
// transcribeAudio
// Converts a recorded audio Blob to text via Whisper (server-side).
// ---------------------------------------------------------------------------
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  // Convert blob to base64 for JSON transport
  const arrayBuffer = await audioBlob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
  const audioBase64 = btoa(binary);

  const res = await fetch(`${FUNCTIONS_BASE}/transcribeAudio`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ audioBase64, mimeType: audioBlob.type }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Transcription failed: ${err}`);
  }

  const data = await res.json();
  return (data.text || '').trim();
}

// ---------------------------------------------------------------------------
// fetchTTSBuffer
// Fetches MP3 audio for a text string via OpenAI TTS (server-side).
// Returns ArrayBuffer for Web Audio API playback.
// ---------------------------------------------------------------------------
export async function fetchTTSBuffer(text: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/generateTTS`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      console.error('TTS error:', await res.text());
      return null;
    }

    return await res.arrayBuffer();
  } catch (e) {
    console.error('TTS fetch failed:', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// streamInterviewResponse
// Streams a Gemini multi-turn conversation response via SSE.
// Calls onChunk(piece) for each text chunk as it arrives.
// Returns the full accumulated text.
// ---------------------------------------------------------------------------
export async function streamInterviewResponse(
  history: Array<{ role: 'user' | 'model'; text: string }>,
  systemPrompt: string | undefined,
  onChunk: (piece: string) => void
): Promise<string> {
  const res = await fetch(`${FUNCTIONS_BASE}/generateInterviewResponse`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ history, systemPrompt }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Interview response failed: ${await res.text()}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') break;
      try {
        const parsed = JSON.parse(payload) as { text?: string; error?: string };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.text) {
          fullText += parsed.text;
          onChunk(parsed.text);
        }
      } catch (e) {
        // Ignore malformed SSE lines
      }
    }
  }

  return fullText;
}

// ---------------------------------------------------------------------------
// analyzeInterview
// Sends the full session transcription to Gemini for scoring and feedback.
// ---------------------------------------------------------------------------
export async function analyzeInterview(
  config: InterviewConfig,
  transcription: string
): Promise<{
  metrics: {
    communication: number;
    confidence: number;
    technicalAccuracy: number;
    bodyLanguage: number;
    answerStructure: number;
    clarity: number;
    overall: number;
  };
  strengths: string[];
  improvementAreas: string[];
  suggestions: string[];
}> {
  const res = await fetch(`${FUNCTIONS_BASE}/analyzeInterview`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ config, transcription }),
  });

  if (!res.ok) {
    console.error('analyzeInterview failed:', await res.text());
    // Return safe fallback
    return {
      metrics: { communication: 50, confidence: 50, technicalAccuracy: 50, bodyLanguage: 50, answerStructure: 50, clarity: 50, overall: 50 },
      strengths: ['You completed the interview session.', 'You engaged with the question prompts.', 'You showed up and practiced.'],
      improvementAreas: ['Provide more specific examples.', 'Work on answer structure.', 'Practice speaking with confidence.'],
      suggestions: ['Try to provide more detail.', 'Focus on clear communication.', 'Use the STAR method for behavioral answers.'],
    };
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// analyzeLive
// Fire-and-forget per-turn live sentiment/confidence analysis.
// Returns a default value on any failure (non-critical).
// ---------------------------------------------------------------------------
export async function analyzeLive(answerSnippet: string): Promise<{
  sentiment: string;
  bodyLanguageTip: string;
  confidenceIndicator: number;
}> {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/analyzeLive`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ answerSnippet }),
    });
    if (!res.ok) return { sentiment: 'Focused', bodyLanguageTip: 'Maintain eye contact', confidenceIndicator: 75 };
    return res.json();
  } catch {
    return { sentiment: 'Focused', bodyLanguageTip: 'Maintain eye contact', confidenceIndicator: 75 };
  }
}

// ---------------------------------------------------------------------------
// generateQuestions
// Fetches interview questions from Gemini (server-side).
// ---------------------------------------------------------------------------
export async function generateQuestions(
  config: InterviewConfig,
  count: number
): Promise<InterviewQuestion[]> {
  const res = await fetch(`${FUNCTIONS_BASE}/generateQuestions`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ config, count }),
  });

  if (!res.ok) {
    console.error('generateQuestions failed:', await res.text());
    return [
      { question: 'Tell me about your background and what brings you to this role.', tips: ['Be concise', 'Highlight relevant experience', 'Show enthusiasm'], timeLimit: 90 },
      { question: 'Describe a challenging project you worked on.', tips: ['Use STAR method', 'Be specific', 'Quantify results'], timeLimit: 120 },
      { question: 'Where do you see yourself in five years?', tips: ['Be realistic', 'Show ambition', 'Connect to company goals'], timeLimit: 90 },
    ].slice(0, count);
  }

  const data = await res.json();
  return data.questions || [];
}
