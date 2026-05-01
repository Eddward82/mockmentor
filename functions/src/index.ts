import * as crypto from 'crypto';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

initializeApp();

// ---------------------------------------------------------------------------
// Auth helper — verifies the Firebase ID token in the Authorization header.
// Returns the decoded token or throws a 401 response.
// ---------------------------------------------------------------------------
async function verifyAuth(req: any, res: any): Promise<{ uid: string } | null> {
  const authHeader: string | undefined = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const idToken = authHeader.slice(7);
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return { uid: decoded.uid };
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
}

// ---------------------------------------------------------------------------
// App Check helper — verifies the X-Firebase-AppCheck token.
// Returns true if valid (or if running in debug/emulator mode), false + 401 otherwise.
// ---------------------------------------------------------------------------
async function verifyAppCheck(req: any, res: any): Promise<boolean> {
  const appCheckToken: string | undefined = req.headers['x-firebase-appcheck'];
  if (!appCheckToken) {
    res.status(401).json({ error: 'App Check token missing' });
    return false;
  }
  try {
    await getAppCheck().verifyToken(appCheckToken);
    return true;
  } catch {
    res.status(401).json({ error: 'App Check token invalid' });
    return false;
  }
}

// ---------------------------------------------------------------------------
// CORS headers helper
// ---------------------------------------------------------------------------
function setCors(req: any, res: any): boolean {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Firebase-AppCheck');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Rate limiting — per-user, per-bucket, Firestore-backed
//
// Firestore doc: rate_limits/{uid}
// Fields: stt_requests, gemini_requests, tts_requests  (arrays of Timestamps)
//
// Strategy: read once, prune stale entries in-memory, write back only when
// the array actually changed (avoids unnecessary writes on every request).
// ---------------------------------------------------------------------------
type RateLimitBucket = 'stt_requests' | 'gemini_requests' | 'tts_requests';

const RATE_LIMITS: Record<RateLimitBucket, number> = {
  stt_requests: 10,     // per 60 seconds
  gemini_requests: 10,  // per 60 seconds
  tts_requests: 20,     // per 60 seconds
};

const WINDOW_MS = 60_000; // 1 minute sliding window

/**
 * Check and record a rate-limit hit for a user+bucket.
 * Returns true if the request is allowed, false (+ sends 429) if exceeded.
 * Uses a single Firestore read + conditional write to minimise usage.
 */
async function checkRateLimit(
  uid: string,
  bucket: RateLimitBucket,
  res: any
): Promise<boolean> {
  const db = getFirestore();
  const docRef = db.doc(`rate_limits/${uid}`);
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const limit = RATE_LIMITS[bucket];

  const snap = await docRef.get();
  const data = snap.exists ? (snap.data() as Record<string, any>) : {};

  // Convert stored Firestore Timestamps (or plain numbers) to ms numbers
  const raw: any[] = data[bucket] ?? [];
  const recent: number[] = raw
    .map((t: any) => (t?.toMillis ? t.toMillis() : Number(t)))
    .filter((ms: number) => ms > windowStart);

  if (recent.length >= limit) {
    res.status(429).json({ error: 'Rate limit exceeded. Please wait before trying again.' });
    return false;
  }

  // Append current timestamp and write back only when changed
  recent.push(now);
  await docRef.set({ [bucket]: recent }, { merge: true });

  return true;
}

// ---------------------------------------------------------------------------
// Map Polar product IDs to internal plan names
// ---------------------------------------------------------------------------
const PRODUCT_TO_PLAN: Record<string, 'professional' | 'premium'> = {
  '5f157d56-826b-48b7-8657-241cb41419f4': 'professional', // Professional Monthly
  '1a816832-c376-4833-b1ca-099108cbfe24': 'professional', // Professional Yearly
  '261673be-c002-4cc7-bd10-402a1ec17db6': 'premium',      // Premium Monthly
  '1e9ed26c-4385-42d8-96ca-1bdbd4b5b16d': 'premium',      // Premium Yearly
};

// ---------------------------------------------------------------------------
// Polar webhook (existing, unchanged)
// ---------------------------------------------------------------------------
export const polarWebhook = onRequest(
  { secrets: ['POLAR_WEBHOOK_SECRET'] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('POLAR_WEBHOOK_SECRET not configured');
      res.status(500).send('Server misconfigured');
      return;
    }

    const rawBody = (req as any).rawBody as Buffer;
    const signature = req.headers['webhook-signature'] as string;

    if (!rawBody || !signature) {
      res.status(400).send('Missing body or signature');
      return;
    }

    const sigHex = signature.startsWith('v1=') ? signature.slice(3) : signature;
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = hmac.update(rawBody).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(digest, 'utf8'), Buffer.from(sigHex, 'utf8'))) {
      res.status(401).send('Invalid signature');
      return;
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventType: string = payload.type ?? '';
    const data = payload.data ?? {};
    const uid: string | undefined = data.metadata?.uid ?? data.subscription?.metadata?.uid;

    console.log(`Polar webhook: ${eventType}, uid: ${uid}`);

    if (!uid) {
      res.status(200).send('No uid, ignored');
      return;
    }

    const db = getFirestore();
    const planRef = db.doc(`users/${uid}/profile/plan`);

    if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
      const status: string = data.status ?? '';
      const productId: string = data.product_id ?? '';
      const plan = PRODUCT_TO_PLAN[productId];

      if (status === 'active' && plan) {
        await planRef.set(
          {
            plan,
            polarSubscriptionId: data.id ?? '',
            polarProductId: productId,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        console.log(`Plan updated to ${plan} for user ${uid}`);
      }
    } else if (eventType === 'subscription.revoked') {
      await planRef.set(
        { plan: 'starter', updatedAt: new Date().toISOString() },
        { merge: true }
      );
      console.log(`Plan downgraded to starter for user ${uid}`);
    }

    res.status(200).send('OK');
  }
);

// ---------------------------------------------------------------------------
// transcribeAudio — Whisper STT
// Receives: multipart/form-data with field "audio" (binary) and "mimeType"
// Returns: { text: string }
// ---------------------------------------------------------------------------
export const transcribeAudio = onRequest(
  {
    secrets: ['OPENAI_API_KEY'],
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (req, res) => {
    if (setCors(req, res)) return;
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }
    if (!await verifyAppCheck(req, res)) return;

    const user = await verifyAuth(req, res);
    if (!user) return;
    if (!await checkRateLimit(user.uid, 'stt_requests', res)) return;

    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // The frontend sends a base64-encoded audio blob + mimeType in JSON
      const { audioBase64, mimeType } = req.body as { audioBase64: string; mimeType: string };
      if (!audioBase64 || !mimeType) {
        res.status(400).json({ error: 'audioBase64 and mimeType are required' });
        return;
      }

      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';

      // OpenAI SDK accepts a File-like object; use toFile helper
      const { toFile } = await import('openai');
      const audioFile = await toFile(audioBuffer, `audio.${ext}`, { type: mimeType });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en',
      });

      res.json({ text: transcription.text || '' });
    } catch (err: any) {
      console.error('transcribeAudio error:', err);
      res.status(500).json({ error: err?.message ?? 'Transcription failed' });
    }
  }
);

// ---------------------------------------------------------------------------
// generateTTS — OpenAI Text-to-Speech
// Receives: { text: string }
// Returns: audio/mpeg binary (ArrayBuffer on client side)
// ---------------------------------------------------------------------------
export const generateTTS = onRequest(
  {
    secrets: ['OPENAI_API_KEY'],
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (req, res) => {
    if (setCors(req, res)) return;
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }
    if (!await verifyAppCheck(req, res)) return;

    const user = await verifyAuth(req, res);
    if (!user) return;
    if (!await checkRateLimit(user.uid, 'tts_requests', res)) return;

    try {
      const { text } = req.body as { text: string };
      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'text is required' });
        return;
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const ttsResponse = await openai.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        input: text,
        voice: 'nova',
        response_format: 'mp3',
      });

      const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

      res.set('Content-Type', 'audio/mpeg');
      res.set('Content-Length', String(audioBuffer.length));
      res.status(200).send(audioBuffer);
    } catch (err: any) {
      console.error('generateTTS error:', err);
      res.status(500).json({ error: err?.message ?? 'TTS failed' });
    }
  }
);

// ---------------------------------------------------------------------------
// generateInterviewResponse — Gemini streaming multi-turn conversation
// Receives: { history, systemPrompt }
// Returns: text/event-stream (SSE) with data chunks, then a final [DONE] event
// ---------------------------------------------------------------------------
export const generateInterviewResponse = onRequest(
  {
    secrets: ['GEMINI_API_KEY'],
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (req, res) => {
    if (setCors(req, res)) return;
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }
    if (!await verifyAppCheck(req, res)) return;

    const user = await verifyAuth(req, res);
    if (!user) return;
    if (!await checkRateLimit(user.uid, 'gemini_requests', res)) return;

    try {
      const { history, systemPrompt } = req.body as {
        history: Array<{ role: 'user' | 'model'; text: string }>;
        systemPrompt?: string;
      };

      if (!history || !Array.isArray(history)) {
        res.status(400).json({ error: 'history array is required' });
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const contents = history.map((turn) => ({
        role: turn.role,
        parts: [{ text: turn.text }],
      }));

      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents,
        config: systemPrompt ? { systemInstruction: systemPrompt } : undefined,
      });

      // Stream as SSE
      res.set('Content-Type', 'text/event-stream');
      res.set('Cache-Control', 'no-cache');
      res.set('Connection', 'keep-alive');
      res.set('X-Accel-Buffering', 'no');
      res.flushHeaders();

      for await (const chunk of stream) {
        const piece = chunk.text ?? '';
        if (piece) {
          res.write(`data: ${JSON.stringify({ text: piece })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      console.error('generateInterviewResponse error:', err);
      // If headers already sent, just end
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message ?? 'Generation failed' });
      } else {
        res.write(`data: ${JSON.stringify({ error: err?.message ?? 'Generation failed' })}\n\n`);
        res.end();
      }
    }
  }
);

// ---------------------------------------------------------------------------
// analyzeInterview — Gemini full interview summary/feedback
// Receives: { config: InterviewConfig, transcription: string }
// Returns: { metrics, strengths, improvementAreas, suggestions }
// ---------------------------------------------------------------------------
export const analyzeInterview = onRequest(
  {
    secrets: ['GEMINI_API_KEY'],
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async (req, res) => {
    if (setCors(req, res)) return;
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }
    if (!await verifyAppCheck(req, res)) return;

    const user = await verifyAuth(req, res);
    if (!user) return;
    if (!await checkRateLimit(user.uid, 'gemini_requests', res)) return;

    try {
      const { config, transcription } = req.body as {
        config: { jobTitle: string; level: string; mode: string; company?: string };
        transcription: string;
      };

      if (!config || !config.jobTitle) {
        res.status(400).json({ error: 'config with jobTitle is required' });
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = `You are a professional interview coach. Evaluate this ${config.level} ${config.jobTitle} interview (${config.mode} mode).

The transcript below contains ALL questions asked and ALL answers given by the candidate. Each question is clearly separated. You MUST read and evaluate every single question and answer — do not focus only on the last one.

Full Interview Transcript:
"${transcription || ''}"

Instructions:
1. Read the entire transcript from start to finish covering all questions.
2. Score the candidate 0-100 in each category based on their OVERALL performance across ALL questions combined — not just one.
3. If the transcript is empty or very short, provide fair baseline scores around 50.
4. Your strengths, improvementAreas, and suggestions must reflect patterns observed across ALL questions — not isolated to any single answer.

Scoring categories:
- communication: clarity of expression, vocabulary richness, articulation across all answers
- confidence: assertiveness, self-assurance, absence of hedging language ("I think maybe...", "I'm not sure but...") throughout the session
- technicalAccuracy: correctness of domain knowledge and facts across all answers
- bodyLanguage: infer from verbal delivery — use of filler words, hesitation, pacing, energy conveyed through word choice across the session
- answerStructure: use of frameworks (STAR, etc.), logical flow, completeness across all answers
- clarity: conciseness, avoiding rambling, getting to the point — evaluated across all answers
- overall: weighted average across all categories

Also provide (based on the full session):
- strengths: exactly 3 specific things the candidate did well consistently across the interview
- improvementAreas: exactly 3 specific areas that need work based on patterns seen across all answers
- suggestions: exactly 3 actionable recommendations the candidate can practice before their next interview

Respond with valid JSON only. Schema:
{
  "metrics": { "communication": number, "confidence": number, "technicalAccuracy": number, "bodyLanguage": number, "answerStructure": number, "clarity": number, "overall": number },
  "strengths": [string, string, string],
  "improvementAreas": [string, string, string],
  "suggestions": [string, string, string]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const result = JSON.parse(response.text || '{}');
      res.json(result);
    } catch (err: any) {
      console.error('analyzeInterview error:', err);
      res.status(500).json({ error: err?.message ?? 'Analysis failed' });
    }
  }
);

// ---------------------------------------------------------------------------
// analyzeLive — Gemini live per-turn sentiment/confidence analysis
// Receives: { answerSnippet: string }
// Returns: { sentiment, bodyLanguageTip, confidenceIndicator }
// ---------------------------------------------------------------------------
export const analyzeLive = onRequest(
  {
    secrets: ['GEMINI_API_KEY'],
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (req, res) => {
    if (setCors(req, res)) return;
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }
    if (!await verifyAppCheck(req, res)) return;

    const user = await verifyAuth(req, res);
    if (!user) return;
    if (!await checkRateLimit(user.uid, 'gemini_requests', res)) return;

    try {
      const { answerSnippet } = req.body as { answerSnippet: string };
      if (!answerSnippet) {
        res.status(400).json({ error: 'answerSnippet is required' });
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze this interview answer snippet and return feedback JSON.\nAnswer: "${answerSnippet.slice(0, 400)}"`,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const raw = JSON.parse(response.text || '{}');

      // Validate and return expected shape
      if (
        typeof raw.sentiment === 'string' &&
        typeof raw.bodyLanguageTip === 'string' &&
        typeof raw.confidenceIndicator === 'number'
      ) {
        res.json(raw);
      } else {
        res.json({ sentiment: 'Neutral', bodyLanguageTip: 'Stay focused', confidenceIndicator: 70 });
      }
    } catch (err: any) {
      console.error('analyzeLive error:', err);
      // Non-critical — return a safe default rather than 500
      res.json({ sentiment: 'Neutral', bodyLanguageTip: 'Stay focused', confidenceIndicator: 70 });
    }
  }
);

// ---------------------------------------------------------------------------
// generateQuestions — Gemini question generation
// Receives: { config: InterviewConfig, count: number }
// Returns: { questions: InterviewQuestion[] }
// ---------------------------------------------------------------------------
export const generateQuestions = onRequest(
  {
    secrets: ['GEMINI_API_KEY'],
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (req, res) => {
    if (setCors(req, res)) return;
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }
    if (!await verifyAppCheck(req, res)) return;

    const user = await verifyAuth(req, res);
    if (!user) return;
    if (!await checkRateLimit(user.uid, 'gemini_requests', res)) return;

    const { config, count: rawCount } = req.body as {
      config: { jobTitle: string; level: string; mode: string; company?: string };
      count?: number;
    };
    const count: number = rawCount ?? 3;

    if (!config || !config.jobTitle) {
      res.status(400).json({ error: 'config with jobTitle is required' });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = `You are a recruiter at ${config.company || 'a top-tier firm'}.
Generate ${count} distinct ${config.level} interview questions for a ${config.jobTitle} position.
The interview mode is ${config.mode}.

Make sure questions progressively increase in difficulty.
Each question should cover a different aspect of the role.

For each question provide:
1. The question text.
2. 3 short 'Pro Tips' for the candidate.
3. A suggested time limit in seconds (typically 60-120).

Respond with valid JSON only. Schema:
{
  "questions": [
    { "question": string, "tips": [string, string, string], "timeLimit": number }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const result = JSON.parse(response.text || '{}');
      res.json({ questions: result.questions || [] });
    } catch (err: any) {
      console.error('generateQuestions error:', err);
      res.status(500).json({
        questions: [
          { question: 'Tell me about your background and what brings you to this role.', tips: ['Be concise', 'Highlight relevant experience', 'Show enthusiasm'], timeLimit: 90 },
          { question: 'Describe a challenging project you worked on and how you overcame obstacles.', tips: ['Use the STAR method', 'Be specific about your contribution', 'Quantify results'], timeLimit: 120 },
          { question: 'Where do you see yourself in five years?', tips: ['Be realistic', 'Show ambition', 'Connect to company goals'], timeLimit: 90 },
        ].slice(0, count),
      });
    }
  }
);

// ---------------------------------------------------------------------------
// processInterviewEvaluation — Firestore-triggered background function
//
// Trigger: onCreate on users/{uid}/interviews/{sessionId}
// When a new interview document is created with status "processing", this
// function reads the transcript, calls Gemini for evaluation, and writes
// results back into the same document (merging metrics, strengths, etc.)
// and sets status to "complete".
// ---------------------------------------------------------------------------
export const processInterviewEvaluation = onDocumentCreated(
  {
    document: 'users/{uid}/interviews/{sessionId}',
    secrets: ['GEMINI_API_KEY'],
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async (event) => {
    const snap = event.data;
    console.log('processInterviewEvaluation triggered, snap exists:', !!snap);
    if (!snap) return;

    const data = snap.data() as Record<string, any>;
    console.log('document status:', data.status, 'uid:', event.params.uid);

    // Only process documents that were created with status "processing"
    if (data.status !== 'processing') {
      console.log('Skipping — status is not processing');
      return;
    }

    const uid: string = event.params.uid;
    const sessionId: string = event.params.sessionId;
    const db = getFirestore();
    const docRef = db.doc(`users/${uid}/interviews/${sessionId}`);

    try {
      const transcript: string = data.transcript ?? '';
      const config = data.config ?? {};
      console.log('Starting evaluation, transcript length:', transcript.length);

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = `You are a professional interview coach. Evaluate this ${config.level ?? ''} ${config.jobTitle ?? ''} interview (${config.mode ?? ''} mode).

Transcript:
"${transcript}"

Score the candidate 0-100 in each category. If the transcript is empty or very short, provide fair baseline scores around 50.

Categories:
- communication: clarity of expression, vocabulary richness, articulation in the transcript
- confidence: assertiveness, self-assurance, absence of hedging language ("I think maybe...", "I'm not sure but...")
- technicalAccuracy: correctness of domain knowledge and facts stated
- bodyLanguage: infer from verbal delivery — use of filler words, hesitation, pacing, energy conveyed through word choice
- answerStructure: use of frameworks (STAR, etc.), logical flow, completeness
- clarity: conciseness, avoiding rambling, getting to the point
- overall: weighted average across all categories

Also provide:
- strengths: exactly 3 specific things the candidate did well
- improvementAreas: exactly 3 specific areas that need work
- suggestions: exactly 3 actionable recommendations the candidate can practice before their next interview

Respond with valid JSON only. Schema:
{
  "metrics": { "communication": number, "confidence": number, "technicalAccuracy": number, "bodyLanguage": number, "answerStructure": number, "clarity": number, "overall": number },
  "strengths": [string, string, string],
  "improvementAreas": [string, string, string],
  "suggestions": [string, string, string]
}`;

      console.log('Calling Gemini for evaluation...');
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      console.log('Gemini responded, response text length:', response.text?.length);

      const evaluation = JSON.parse(response.text || '{}');

      await docRef.set(
        {
          status: 'complete',
          metrics: evaluation.metrics ?? { communication: 50, confidence: 50, technicalAccuracy: 50, bodyLanguage: 50, answerStructure: 50, clarity: 50, overall: 50 },
          strengths: evaluation.strengths ?? [],
          improvementAreas: evaluation.improvementAreas ?? [],
          suggestions: evaluation.suggestions ?? ['Keep practising!', 'Review your answers.', 'Try again soon.'],
          evaluatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`Evaluation complete for ${uid}/${sessionId}`);
    } catch (err) {
      console.error(`Evaluation failed for ${uid}/${sessionId}:`, err);
      // Mark as failed so the frontend can show a fallback instead of spinning forever
      await docRef.set(
        {
          status: 'failed',
          metrics: { communication: 50, confidence: 50, technicalAccuracy: 50, bodyLanguage: 50, answerStructure: 50, clarity: 50, overall: 50 },
          strengths: ['You completed the interview session.', 'You engaged with the question prompts.', 'You showed up and practised.'],
          improvementAreas: ['Provide more specific examples.', 'Work on answer structure.', 'Practice speaking with confidence.'],
          suggestions: ['Try again with a stable connection.', 'Use the STAR method for behavioural answers.', 'Focus on clear, concise communication.'],
        },
        { merge: true }
      );
    }
  }
);

// ---------------------------------------------------------------------------
// generateDailyAnalytics — scheduled daily at 02:00 UTC
//
// Aggregates cross-user metrics server-side and writes to:
//   admin/analytics/daily/{YYYY-MM-DD}
//
// This removes the need for collectionGroup queries from the frontend and
// keeps expensive reads on the server, not the client.
// ---------------------------------------------------------------------------

const ADMIN_UID = 'gTcIsKmAyyWhQfg1eCAb3ZxKFqj2';

const PLAN_REVENUE_MAP: Record<string, number> = {
  starter: 0,
  professional: 19,
  premium: 49,
};

async function runDailyAnalytics() {
    const db = getFirestore();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    try {
      // ── 1. Plan distribution + total users ──────────────────────────────
      // Get all users from the top-level users collection
      const usersSnap = await db.collection('users').get();
      const planCounts: Record<string, number> = { starter: 0, professional: 0, premium: 0 };
      const uids = new Set<string>();

      for (const userDoc of usersSnap.docs) {
        uids.add(userDoc.id);
        // Try to read their plan doc — defaults to starter if missing
        const planDoc = await db.doc(`users/${userDoc.id}/profile/plan`).get();
        const plan = (planDoc.exists && (planDoc.data()?.plan as string)) || 'starter';
        planCounts[plan] = (planCounts[plan] ?? 0) + 1;
      }

      // ── 2. Interviews this month ─────────────────────────────────────────
      const thisMonthSnap = await db
        .collectionGroup('interviews')
        .where('createdAt', '>=', Timestamp.fromDate(startOfMonth))
        .get();

      const lastMonthSnap = await db
        .collectionGroup('interviews')
        .where('createdAt', '>=', Timestamp.fromDate(startOfLastMonth))
        .where('createdAt', '<=', Timestamp.fromDate(endOfLastMonth))
        .get();

      const activeWeekSnap = await db
        .collectionGroup('interviews')
        .where('createdAt', '>=', Timestamp.fromDate(startOfWeek))
        .get();

      // ── 3. Aggregate scores, job titles, weekly trend ────────────────────
      const jobTitleMap: Record<string, number> = {};
      let totalScore = 0;
      let scoreCount = 0;
      const weeklyMap: Record<string, number> = {};
      const thisMonthUids = new Set<string>();
      const activeWeekUids = new Set<string>();

      for (const d of thisMonthSnap.docs) {
        const data = d.data();
        const uid = d.ref.parent.parent!.id;
        thisMonthUids.add(uid);

        const title: string = data.config?.jobTitle ?? 'Unknown';
        jobTitleMap[title] = (jobTitleMap[title] ?? 0) + 1;

        if (data.metrics?.overall) {
          totalScore += data.metrics.overall;
          scoreCount++;
        }

        if (data.createdAt?.toDate) {
          const d2: Date = data.createdAt.toDate();
          const weekNum = Math.floor((d2.getDate() - 1) / 7) + 1;
          const key = `Wk ${weekNum}`;
          weeklyMap[key] = (weeklyMap[key] ?? 0) + 1;
        }
      }

      for (const d of activeWeekSnap.docs) {
        activeWeekUids.add(d.ref.parent.parent!.id);
      }

      // ── 4. Churn risk ─────────────────────────────────────────────────────
      const lastMonthUids = new Set(lastMonthSnap.docs.map((d) => d.ref.parent.parent!.id));
      const churnRisk = [...lastMonthUids].filter((uid) => !thisMonthUids.has(uid)).length;

      // ── 5. Revenue ────────────────────────────────────────────────────────
      let estimatedMonthlyRevenue = 0;
      for (const [plan, count] of Object.entries(planCounts)) {
        estimatedMonthlyRevenue += count * (PLAN_REVENUE_MAP[plan] ?? 0);
      }
      const estimatedMonthlyCost = Math.round(thisMonthSnap.size * 0.12 * 100) / 100;

      // ── 6. Top job titles ─────────────────────────────────────────────────
      const topJobTitles = Object.entries(jobTitleMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([title, count]) => ({ title, count }));

      const weeklySessionTrend = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'].map((w) => ({
        week: w,
        sessions: weeklyMap[w] ?? 0,
      }));

      // ── 7. Write aggregated doc ───────────────────────────────────────────
      const analyticsDoc = {
        date: dateStr,
        generatedAt: FieldValue.serverTimestamp(),
        totalUsers: uids.size,
        activeUsersThisWeek: activeWeekUids.size,
        planCounts: {
          starter: planCounts.starter ?? 0,
          professional: planCounts.professional ?? 0,
          premium: planCounts.premium ?? 0,
        },
        sessionsThisMonth: thisMonthSnap.size,
        sessionsLastMonth: lastMonthSnap.size,
        avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
        churnRisk,
        estimatedMonthlyRevenue,
        estimatedMonthlyCost,
        estimatedProfit: Math.max(0, estimatedMonthlyRevenue - estimatedMonthlyCost),
        topJobTitles,
        weeklySessionTrend,
        adminUid: ADMIN_UID,
      };

      await db.doc(`admin/analytics/daily/${dateStr}`).set(analyticsDoc);

      // Also update a "latest" convenience doc so the dashboard can read one doc
      await db.doc('admin/analytics').set(
        { latest: analyticsDoc, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      console.log(`Daily analytics generated for ${dateStr}: ${uids.size} users, ${thisMonthSnap.size} sessions this month`);
    } catch (err) {
      console.error('generateDailyAnalytics failed:', err);
      throw err;
    }
}

export const generateDailyAnalytics = onSchedule(
  { schedule: '0 2 * * *', timeZone: 'UTC', timeoutSeconds: 300, memory: '512MiB' },
  async () => { await runDailyAnalytics(); }
);

// Admin-only HTTP endpoint to trigger analytics on demand
export const triggerAnalytics = onRequest({ timeoutSeconds: 300, memory: '512MiB' }, async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  const user = await verifyAuth(req, res);
  if (!user) return;
  if (user.uid !== ADMIN_UID) { res.status(403).json({ error: 'Admin only' }); return; }
  try {
    await runDailyAnalytics();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Analytics generation failed' });
  }
});
