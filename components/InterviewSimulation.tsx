import React, { useEffect, useRef, useState, useCallback } from 'react';
import { InterviewConfig, LiveAnalysis, InterviewResult, InterviewQuestion, QuestionResponse } from '../types';
import { generateQuestions } from '../services/geminiService';
import { fetchTTSBuffer as apiFetchTTSBuffer, transcribeAudio as apiTranscribeAudio, streamInterviewResponse, analyzeLive, analyzeInterview } from '../services/aiApi';
import { VideoCapture } from './VideoCapture';
import { FeedbackDisplay } from './FeedbackDisplay';
import { sessionRecovery } from '../services/sessionRecovery';
import { db, auth } from '../services/firebase';
import { collection, doc, addDoc, writeBatch, Timestamp } from 'firebase/firestore';

interface InterviewSimulationProps {
  config: InterviewConfig;
  onFinish: (result: InterviewResult) => void;
  onError: (msg: string) => void;
  questionTimeLimitCap?: number;
}

type SimulationState = 'generating' | 'preparation' | 'active' | 'analyzing';
type MicState = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';

const LOADING_MESSAGES = [
  'Evaluating your communication style...',
  'Analyzing technical keyword density...',
  'Reviewing body language and eye contact...',
  'Calculating confidence metrics...',
  'Summarizing actionable improvement steps...',
  'Finalizing your professional growth roadmap...'
];

// Build the conversation-aware system prompt for Gemini
const buildSystemPrompt = (config: InterviewConfig, question: InterviewQuestion, questionIndex: number, totalQuestions: number) =>
  `You are a professional interview coach conducting a mock ${config.mode} interview for a ${config.level} ${config.jobTitle} position${config.company ? ` at ${config.company}` : ''}.

CURRENT QUESTION: "${question.question}"
QUESTION ${questionIndex + 1} OF ${totalQuestions}${totalQuestions === 1 ? ' (this is the only question)' : questionIndex === totalQuestions - 1 ? ' (this is the last question)' : ''}.

CONVERSATION RULES:
1. On the VERY FIRST turn, clearly ask the candidate the question above.
2. LISTEN FULLY — after the candidate answers, respond in exactly this two-part structure:
   a. REFLECTION — one sentence acknowledging what they said. Be specific to their answer.
   b. FOLLOW-UP — one targeted follow-up question OR a brief closing remark if no follow-up is needed.
3. Keep your entire response under 3 sentences. Do not over-explain.
4. Do NOT ask multiple questions at once.
5. Do NOT repeat the original question unless the candidate asks.
6. NEVER mention moving to another question or suggest there are more questions unless the session explicitly has multiple questions.

TONE: Professional, encouraging, concise. You are a human interviewer — warm but focused.`;

export const InterviewSimulation: React.FC<InterviewSimulationProps> = ({ config, onFinish, onError, questionTimeLimitCap }) => {
  const [simState, setSimState] = useState<SimulationState>('generating');
  const [activeQuestion, setActiveQuestion] = useState<InterviewQuestion | null>(null);
  const [micState, setMicState] = useState<MicState>('idle');
  const [isPaused, setIsPaused] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [mobileTranscriptOpen, setMobileTranscriptOpen] = useState(false);
  const [liveAnalysis, setLiveAnalysis] = useState<LiveAnalysis>({
    sentiment: 'Focused',
    bodyLanguageTip: 'Maintain eye contact with the camera',
    confidenceIndicator: 100
  });

  // Turn budget — limits API calls per question (1 answer + follow-ups)
  const MAX_TURNS_PER_QUESTION = 4;
  const [turnsUsed, setTurnsUsed] = useState(0);
  const turnsUsedRef = useRef(0);
  const turnBudgetExhausted = turnsUsed >= MAX_TURNS_PER_QUESTION;

  const questionTimerRef = useRef<number | null>(null);

  // Answer countdown timer
  const [answerTimeLeft, setAnswerTimeLeft] = useState<number | null>(null);
  const answerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update live analysis after each user turn (fire-and-forget, non-blocking)
  const updateLiveAnalysis = useCallback(async (userText: string) => {
    const data = await analyzeLive(userText);
    setLiveAnalysis(data);
  }, []);

  const clearAnswerTimer = useCallback(() => {
    if (answerTimerRef.current) {
      clearInterval(answerTimerRef.current);
      answerTimerRef.current = null;
    }
    setAnswerTimeLeft(null);
  }, []);

  const startAnswerTimer = useCallback((limitSeconds: number, onExpire: () => void) => {
    clearAnswerTimer();
    setAnswerTimeLeft(limitSeconds);
    let remaining = limitSeconds;
    answerTimerRef.current = setInterval(() => {
      remaining -= 1;
      setAnswerTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(answerTimerRef.current!);
        answerTimerRef.current = null;
        setAnswerTimeLeft(null);
        onExpire();
      }
    }, 1000);
  }, [clearAnswerTimer]);

  // Multi-question state
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionResponses, setQuestionResponses] = useState<QuestionResponse[]>([]);
  const questionStartTimeRef = useRef<number>(0);
  const sessionStartTimeRef = useRef<number | null>(null);

  // Conversation history for Gemini multi-turn
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'model'; text: string }>>([]);
  const firstTurnRef = useRef(true);

  // Media refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const preAcquiredStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);

  // Audio playback
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Session ID for Firestore
  const sessionIdRef = useRef<string>('');
  const interviewFinishedRef = useRef(false);
  const isPausedRef = useRef(false);

  // Transcript batch-write buffer
  type TranscriptLine = { role: 'user' | 'ai'; text: string; timestamp: Timestamp; seq: number };
  const transcriptBufferRef = useRef<TranscriptLine[]>([]);
  const transcriptSeqRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const FLUSH_BATCH_SIZE = 8;
  const FLUSH_INTERVAL_MS = 5000;

  // Rotate loading messages
  useEffect(() => {
    if (simState === 'generating' || simState === 'analyzing') {
      const interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [simState]);

  // Flush buffered transcript lines to Firestore using a batch write
  const flushTranscriptBuffer = useCallback(() => {
    const user = auth.currentUser;
    if (!user || !sessionIdRef.current) return;
    const lines = transcriptBufferRef.current.splice(0); // drain buffer atomically
    if (lines.length === 0) return;

    const colRef = collection(db, 'users', user.uid, 'sessions', sessionIdRef.current, 'transcript');
    const batch = writeBatch(db);
    lines.forEach((line) => {
      batch.set(doc(colRef), { role: line.role, text: line.text, timestamp: line.timestamp, seq: line.seq });
    });
    batch.commit().catch(() => {});
  }, []);

  // Buffer a transcript line; flush when batch size is reached
  const persistTranscriptLine = useCallback((role: 'user' | 'ai', text: string) => {
    const user = auth.currentUser;
    if (!user || !sessionIdRef.current) return;

    transcriptBufferRef.current.push({
      role,
      text,
      timestamp: Timestamp.now(),
      seq: transcriptSeqRef.current++,
    });

    // Flush immediately if batch size reached; otherwise (re)start the timer
    if (transcriptBufferRef.current.length >= FLUSH_BATCH_SIZE) {
      if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
      flushTranscriptBuffer();
    } else {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(flushTranscriptBuffer, FLUSH_INTERVAL_MS);
    }
  }, [flushTranscriptBuffer]);

  // Stop any currently playing AI audio
  const stopAIAudio = useCallback(() => {
    if (currentAudioSourceRef.current) {
      try { currentAudioSourceRef.current.stop(); } catch { /* already stopped */ }
      currentAudioSourceRef.current = null;
    }
    setIsAISpeaking(false);
  }, []);

  // Play audio buffer returned from OpenAI TTS
  const playAudioBuffer = useCallback(async (arrayBuffer: ArrayBuffer): Promise<void> => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    const decoded = await ctx.decodeAudioData(arrayBuffer);
    const src = ctx.createBufferSource();
    src.buffer = decoded;
    src.connect(ctx.destination);
    currentAudioSourceRef.current = src;
    setIsAISpeaking(true);

    return new Promise((resolve) => {
      src.onended = () => {
        currentAudioSourceRef.current = null;
        setIsAISpeaking(false);
        resolve();
      };
      src.start(0);
    });
  }, []);

  // Fetch a single TTS chunk for a piece of text (via Cloud Function)
  const fetchTTSBuffer = useCallback(async (text: string): Promise<ArrayBuffer | null> => {
    return apiFetchTTSBuffer(text);
  }, []);

  // Split text into sentences, fetch TTS in parallel, play sequentially for near-instant start
  const speakText = useCallback(async (text: string): Promise<void> => {
    // Split on sentence boundaries, keeping punctuation
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (sentences.length === 0) return;

    // Kick off all fetches immediately in parallel
    const fetchPromises = sentences.map((s) => fetchTTSBuffer(s));

    // Play first sentence as soon as it arrives, then play the rest in order
    for (let i = 0; i < fetchPromises.length; i++) {
      const buffer = await fetchPromises[i];
      if (!buffer) continue;
      await playAudioBuffer(buffer);
    }
  }, [fetchTTSBuffer, playAudioBuffer]);

  // Stream Gemini response via Cloud Function, fire TTS per sentence as they complete
  const getAIResponseAndSpeak = useCallback(async (
    userText: string,
    onTextReady: (text: string) => void
  ): Promise<string> => {
    conversationHistoryRef.current.push({ role: 'user', text: userText });

    const systemPrompt = activeQuestion
      ? buildSystemPrompt(config, activeQuestion, currentQuestionIndex, questions.length)
      : undefined;

    let buffer = '';
    const sentenceEnd = /[.!?]/;
    const ttsQueue: Promise<ArrayBuffer | null>[] = [];

    setMicState('speaking');

    const fullText = await streamInterviewResponse(
      conversationHistoryRef.current,
      systemPrompt,
      (piece) => {
        buffer += piece;
        // When we have a complete sentence, kick off TTS fetch immediately
        const lastEnd = Math.max(
          buffer.lastIndexOf('.'),
          buffer.lastIndexOf('!'),
          buffer.lastIndexOf('?')
        );
        if (lastEnd !== -1 && sentenceEnd.test(buffer[lastEnd])) {
          const sentence = buffer.slice(0, lastEnd + 1).trim();
          buffer = buffer.slice(lastEnd + 1);
          if (sentence) ttsQueue.push(fetchTTSBuffer(sentence));
        }
      }
    );

    // Flush any remaining text
    if (buffer.trim()) ttsQueue.push(fetchTTSBuffer(buffer.trim()));

    conversationHistoryRef.current.push({ role: 'model', text: fullText });

    // Update transcript text immediately — before audio plays
    onTextReady(fullText);

    // Play all TTS chunks in order (each was already fetching in parallel)
    for (const fetchPromise of ttsQueue) {
      const buf = await fetchPromise;
      if (buf) await playAudioBuffer(buf);
    }

    return fullText;
  }, [config, activeQuestion, currentQuestionIndex, questions.length, fetchTTSBuffer, playAudioBuffer]);

  // Transcribe audio blob via Whisper Cloud Function
  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    return apiTranscribeAudio(audioBlob);
  }, []);

  // Stop recording, transcribe, get AI response, speak it
  const stopRecordingAndProcess = useCallback(async () => {
    if (!isRecordingRef.current || !mediaRecorderRef.current) {
      console.warn('stopRecordingAndProcess: no active recording');
      return;
    }

    clearAnswerTimer();

    const mr = mediaRecorderRef.current;
    // Capture mimeType NOW before stopping
    const recorderMime = mr.mimeType || 'audio/webm';

    // Check budget before processing
    if (turnsUsedRef.current >= MAX_TURNS_PER_QUESTION) {
      setMicState('idle');
      return;
    }

    setMicState('processing');
    isRecordingRef.current = false;

    // Stop and wait for the final ondataavailable + onstop
    await new Promise<void>((resolve) => {
      mr.onstop = () => resolve();
      if (mr.state !== 'inactive') mr.stop();
      else resolve();
    });

    const chunks = [...audioChunksRef.current];
    audioChunksRef.current = [];

    console.log(`Recorded ${chunks.length} chunks, mime: ${recorderMime}, total bytes: ${chunks.reduce((s, c) => s + c.size, 0)}`);

    if (chunks.length === 0) {
      console.warn('No audio chunks recorded');
      setMicState('idle');
      return;
    }

    const audioBlob = new Blob(chunks, { type: recorderMime });

    if (audioBlob.size < 500) {
      console.warn('Audio blob too small, likely silence:', audioBlob.size);
      setMicState('idle');
      return;
    }

    try {
      // 1. Whisper STT
      const userText = await transcribeAudio(audioBlob);
      console.log('Whisper result:', userText);
      if (!userText) {
        setMicState('idle');
        return;
      }

      turnsUsedRef.current += 1;
      setTurnsUsed(turnsUsedRef.current);
      setTranscription((p) => [...p, `User: ${userText}`]);
      persistTranscriptLine('user', userText);

      // Fire live analysis update in background (non-blocking)
      updateLiveAnalysis(userText);

      // 2. Gemini streams response + TTS fires per sentence as they arrive
      // onTextReady fires as soon as full text is known (before audio finishes)
      const aiText = await getAIResponseAndSpeak(userText, (text) => {
        setTranscription((p) => [...p, `AI: ${text}`]);
        persistTranscriptLine('ai', text);
      });
      if (!aiText) {
        setMicState('idle');
        return;
      }
      setMicState('idle');
    } catch (e) {
      console.error('Pipeline error:', e);
      setMicState('error');
      setTimeout(() => setMicState('idle'), 2000);
    }
  }, [transcribeAudio, getAIResponseAndSpeak, persistTranscriptLine, updateLiveAnalysis]);

  // Start mic recording
  const startRecording = useCallback(() => {
    if (!streamRef.current || isRecordingRef.current || isPausedRef.current) {
      console.warn('startRecording blocked:', {
        hasStream: !!streamRef.current,
        isRecording: isRecordingRef.current,
        isPaused: isPausedRef.current
      });
      return;
    }
    if (isAISpeaking) stopAIAudio();

    // Use audio-only stream for MediaRecorder to avoid MIME type issues
    const audioTracks = streamRef.current.getAudioTracks();
    if (audioTracks.length === 0) {
      console.error('No audio tracks available');
      setMicState('error');
      setTimeout(() => setMicState('idle'), 2000);
      return;
    }
    const audioStream = new MediaStream(audioTracks);

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    try {
      const mr = mimeType
        ? new MediaRecorder(audioStream, { mimeType })
        : new MediaRecorder(audioStream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        setMicState('error');
        setTimeout(() => setMicState('idle'), 2000);
      };
      mediaRecorderRef.current = mr;
      mr.start(250);
      isRecordingRef.current = true;
      setMicState('recording');
      // Start countdown — auto-stop when time runs out
      if (questionTimeLimitCap && questionTimeLimitCap > 0) {
        startAnswerTimer(questionTimeLimitCap, () => {
          if (isRecordingRef.current) stopRecordingAndProcess();
        });
      }
    } catch (e) {
      console.error('Failed to start MediaRecorder:', e);
      setMicState('error');
      setTimeout(() => setMicState('idle'), 2000);
    }
  }, [isAISpeaking, stopAIAudio, questionTimeLimitCap, startAnswerTimer, stopRecordingAndProcess]);

  const stopQuestionTimer = useCallback(() => {
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopQuestionTimer();
    stopAIAudio();
    if (mediaRecorderRef.current && isRecordingRef.current) {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
    isRecordingRef.current = false;
    if (preAcquiredStreamRef.current) {
      preAcquiredStreamRef.current.getTracks().forEach((t) => t.stop());
      preAcquiredStreamRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    // Final flush — write any remaining buffered transcript lines
    if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
    flushTranscriptBuffer();
    clearAnswerTimer();
    setMicState('idle');
  }, [stopQuestionTimer, stopAIAudio, flushTranscriptBuffer, clearAnswerTimer]);

  useEffect(() => cleanup, [cleanup]);


  // Generate questions + acquire media in parallel
  useEffect(() => {
    const init = async () => {
      try {
        const count = config.questionCount || 1;
        const streamPromise = navigator.mediaDevices?.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: true
        })
          .catch(() => navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false
          }))
          .catch(() => null);

        const [generatedQuestions, preStream] = await Promise.all([
          generateQuestions(config, count),
          streamPromise
        ]);

        if (preStream) preAcquiredStreamRef.current = preStream;
        setQuestions(generatedQuestions);
        setActiveQuestion(generatedQuestions[0]);
        setCurrentQuestionIndex(0);
        setSimState('preparation');
      } catch {
        onError('Failed to generate questions. Please check your connection.');
      }
    };
    init();
  }, [config, onError]);

  // Auto-save session state every 10s
  useEffect(() => {
    if (simState !== 'active' && simState !== 'preparation') return;
    const interval = setInterval(() => {
      sessionRecovery.save({
        config,
        questions,
        currentQuestionIndex,
        questionResponses,
        transcription,
        sessionStartTime: sessionStartTimeRef.current || Date.now(),
        savedAt: Date.now()
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [simState, config, questions, currentQuestionIndex, questionResponses, transcription]);

  const startActiveSession = useCallback(async () => {
    setSimState('active');
    sessionStartTimeRef.current = sessionStartTimeRef.current || Date.now();
    questionStartTimeRef.current = Date.now();
    sessionIdRef.current = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    conversationHistoryRef.current = [];
    firstTurnRef.current = true;
    interviewFinishedRef.current = false;
    turnsUsedRef.current = 0;
    setTurnsUsed(0);

    // Acquire or reuse media stream
    let stream: MediaStream;
    if (streamRef.current?.getAudioTracks().some((t) => t.readyState === 'live')) {
      stream = streamRef.current;
    } else if (preAcquiredStreamRef.current?.getAudioTracks().some((t) => t.readyState === 'live')) {
      stream = preAcquiredStreamRef.current;
      preAcquiredStreamRef.current = null;
    } else {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: true
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false
          });
        } catch {
          onError('Microphone access denied. Check browser permissions.');
          return;
        }
      }
    }

    streamRef.current = stream;

    // Attach camera — use requestAnimationFrame to ensure the video element is mounted
    if (stream.getVideoTracks().length > 0) {
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    }

    audioCtxRef.current = new AudioContext();

    // AI speaks the question first — timer starts only after AI finishes
    if (activeQuestion) {
      const openingText = activeQuestion.question;
      conversationHistoryRef.current.push({ role: 'model', text: openingText });
      setTranscription((p) => [...p, `AI: ${openingText}`]);
      persistTranscriptLine('ai', openingText);
      setMicState('speaking');
      try {
        await speakText(openingText);
      } catch (e) {
        console.error('TTS opening failed:', e);
      }
      setMicState('idle');
    }
  }, [activeQuestion, currentQuestionIndex, questions.length, speakText, persistTranscriptLine, onError]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      isPausedRef.current = next;
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
      }
      if (next && isRecordingRef.current) {
        stopRecordingAndProcess();
      }
      return next;
    });
  }, [stopRecordingAndProcess]);

  const saveCurrentQuestionResponse = () => {
    if (activeQuestion) {
      const response: QuestionResponse = {
        question: activeQuestion,
        transcription: transcription.join('\n'),
        startTime: questionStartTimeRef.current,
        endTime: Date.now()
      };
      setQuestionResponses((prev) => [...prev, response]);
      return response;
    }
    return null;
  };

  const handleNextQuestion = async () => {
    const currentResponse = saveCurrentQuestionResponse();
    stopQuestionTimer();
    interviewFinishedRef.current = true;

    if (isRecordingRef.current) {
      try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
      isRecordingRef.current = false;
    }
    stopAIAudio();

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      // Reset per-question state for the next question
      conversationHistoryRef.current = [];
      firstTurnRef.current = true;
      turnsUsedRef.current = 0;
      setTurnsUsed(0);
      setCurrentQuestionIndex(nextIndex);
      setActiveQuestion(questions[nextIndex]);
      setTranscription([]);
      interviewFinishedRef.current = false;
      setSimState('preparation');
    }
  };

  const handleFinish = async () => {
    interviewFinishedRef.current = true;
    stopQuestionTimer();

    if (isRecordingRef.current) {
      try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
      isRecordingRef.current = false;
    }
    stopAIAudio();

    const currentResponse = saveCurrentQuestionResponse();
    const allResponses = currentResponse ? [...questionResponses, currentResponse] : questionResponses;

    setSimState('analyzing');
    sessionRecovery.clear();

    const sessionDuration = sessionStartTimeRef.current
      ? Math.round((Date.now() - sessionStartTimeRef.current) / 1000)
      : 0;

    const fullTranscription = allResponses
      .map((r, i) => `--- Question ${i + 1}: ${r.question.question} ---\n${r.transcription}`)
      .join('\n\n');

    const sessionId = Math.random().toString(36).substr(2, 9);
    const user = auth.currentUser;

    // Call analyzeInterview Cloud Function directly — avoids Firestore trigger race condition
    let evaluation = { metrics: { communication: 65, confidence: 65, technicalAccuracy: 65, bodyLanguage: 65, answerStructure: 65, clarity: 65, overall: 65 }, strengths: [] as string[], improvementAreas: [] as string[], suggestions: [] as string[] };
    try {
      evaluation = await analyzeInterview(config, fullTranscription);
    } catch (err) {
      console.error('Evaluation failed:', err);
    }

    const result = {
      id: sessionId,
      date: new Date().toISOString(),
      config,
      metrics: evaluation.metrics,
      suggestions: evaluation.suggestions,
      strengths: evaluation.strengths,
      improvementAreas: evaluation.improvementAreas,
      transcription: fullTranscription,
      duration: sessionDuration,
      questions: allResponses,
      status: 'complete',
    };

    // Save completed result to Firestore
    if (user) {
      const interviewRef = collection(db, 'users', user.uid, 'interviews');
      try {
        const docRef = await addDoc(interviewRef, {
          ...result,
          createdAt: Timestamp.now(),
        });
        cleanup();
        onFinish({ ...result, id: docRef.id } as any);
      } catch (err) {
        console.error('Failed to save interview to Firestore:', err);
        cleanup();
        onFinish(result as any);
      }
    } else {
      cleanup();
      onFinish(result as any);
    }
  };

  // ─── Loading / Analyzing screen ───────────────────────────────────────────
  if (simState === 'generating' || simState === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 px-4" role="status" aria-live="polite">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-slate-100 dark:border-slate-700 rounded-full" />
          <div className="absolute top-0 left-0 w-24 h-24 border-8 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-center max-w-sm px-6">
          <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">
            {simState === 'generating' ? 'Setting the Stage' : 'Deep Analysis'}
          </h2>
          <p className="text-slate-500 font-bold min-h-[1.5em] transition-all duration-500 animate-pulse">
            {simState === 'generating' ? `Tailoring for ${config.jobTitle}...` : LOADING_MESSAGES[loadingMsgIdx]}
          </p>
        </div>
      </div>
    );
  }

  // ─── Preparation screen ────────────────────────────────────────────────────
  if (simState === 'preparation') {
    const isMultiQuestion = questions.length > 1;
    return (
      <div className="max-w-3xl mx-auto py-12 px-6">
        <div className="bg-white dark:bg-slate-800 rounded-[48px] p-8 md:p-14 shadow-2xl border border-slate-100 dark:border-slate-700 text-center relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-50 dark:bg-blue-950 rounded-full opacity-50" />
          <div className="relative z-10">
            {isMultiQuestion && (
              <div className="mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {questions.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-3 h-3 rounded-full transition-all ${
                        idx < currentQuestionIndex
                          ? 'bg-green-500'
                          : idx === currentQuestionIndex
                            ? 'bg-blue-600 scale-125'
                            : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm font-bold text-slate-500">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
            )}
            <div className="w-20 h-20 bg-blue-600 text-white rounded-[24px] flex items-center justify-center mx-auto mb-10 shadow-xl shadow-blue-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h2 className="text-[10px] uppercase font-black text-slate-400 tracking-[0.3em] mb-4">Prompt Card</h2>
            <p className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white mb-12 leading-[1.2]">
              "{activeQuestion?.question}"
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12 text-left">
              {activeQuestion?.tips.map((tip, i) => (
                <div
                  key={i}
                  className="p-5 bg-slate-50 dark:bg-slate-700 rounded-2xl flex items-start border border-slate-100 dark:border-slate-600 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mr-4 mt-1.5" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{tip}</p>
                </div>
              ))}
            </div>
            <button
              onClick={startActiveSession}
              aria-label={`Start interview for question ${currentQuestionIndex + 1}`}
              className="w-full md:w-auto px-16 py-5 bg-blue-600 text-white rounded-[24px] font-black text-xl shadow-2xl shadow-blue-200 hover:scale-105 transition-all active:scale-95"
            >
              Start Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active interview screen ───────────────────────────────────────────────
  const isLastQuestion = currentQuestionIndex >= questions.length - 1;
  const hasMultipleQuestions = questions.length > 1;

  const micLabel = micState === 'recording'
    ? 'Recording — click to send'
    : micState === 'processing'
      ? 'Processing...'
      : micState === 'speaking'
        ? 'AI Speaking...'
        : micState === 'error'
          ? 'Error — try again'
          : isPaused
            ? 'Paused'
            : turnBudgetExhausted
              ? 'Turn limit reached'
              : 'Click mic to answer';

  const micHint = micState === 'recording'
    ? 'Speak your answer, then click Stop'
    : micState === 'processing'
      ? 'Transcribing & generating response...'
      : micState === 'speaking'
        ? 'AI interviewer is speaking'
        : turnBudgetExhausted
          ? 'Max turns used — click Finish & Analyze when ready'
          : `Turn ${turnsUsed + 1} of ${MAX_TURNS_PER_QUESTION} — press mic to answer`;

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-3 md:p-6 min-h-[calc(100vh-80px)] overflow-x-hidden">
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {hasMultipleQuestions && (
          <div className="glass p-4 rounded-2xl flex items-center justify-center gap-4 border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              {questions.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    idx < currentQuestionIndex
                      ? 'bg-green-500'
                      : idx === currentQuestionIndex
                        ? 'bg-blue-600 scale-125'
                        : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-bold text-slate-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>
        )}

        <div className="relative flex-1 min-h-[300px]">
          <VideoCapture ref={videoRef} className="h-full" />
          <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6">
            <FeedbackDisplay analysis={liveAnalysis} />
          </div>
        </div>

        {/* Controls bar */}
        <div
          className="glass p-5 rounded-[32px] flex items-center justify-between border-slate-200 shadow-sm"
          role="toolbar"
          aria-label="Recording controls"
        >
          <div className="flex items-center space-x-4 px-2">
            {/* Mic button */}
            <button
              disabled={micState === 'processing' || micState === 'speaking' || isPaused || (turnBudgetExhausted && micState !== 'recording')}
              onClick={micState === 'recording' ? stopRecordingAndProcess : startRecording}
              aria-label={micState === 'recording' ? 'Stop recording and send' : turnBudgetExhausted ? 'Turn limit reached' : 'Start recording your answer'}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 disabled:opacity-40 ${
                micState === 'recording'
                  ? 'bg-red-500 text-white animate-pulse shadow-red-200'
                  : micState === 'processing'
                    ? 'bg-yellow-400 text-white'
                    : micState === 'speaking'
                      ? 'bg-blue-400 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
              }`}
            >
              {micState === 'recording' ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : micState === 'processing' ? (
                <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>

            <div className="hidden sm:block">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Interview Mode</p>
              <p className="font-black text-slate-800 dark:text-white text-lg" aria-live="polite">
                {micLabel}
              </p>
              <p className="text-xs font-bold text-slate-500">{micHint}</p>
            </div>

            {/* Answer countdown timer */}
            {answerTimeLeft !== null && (
              <div
                className={`hidden sm:flex flex-col items-center px-4 py-2 rounded-xl border ${
                  answerTimeLeft <= 10
                    ? 'border-red-400 bg-red-50 dark:bg-red-950/30'
                    : answerTimeLeft <= 30
                      ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30'
                      : 'border-blue-300 bg-blue-50 dark:bg-blue-950/30'
                }`}
                aria-live="polite"
              >
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Time Left</p>
                <p className={`text-base font-black tabular-nums ${answerTimeLeft <= 10 ? 'text-red-500 animate-pulse' : answerTimeLeft <= 30 ? 'text-yellow-600' : 'text-blue-600'}`}>
                  {Math.floor(answerTimeLeft / 60)}:{String(answerTimeLeft % 60).padStart(2, '0')}
                </p>
              </div>
            )}

            {/* Turns counter */}
            <div
              className={`hidden sm:flex flex-col items-center px-4 py-2 rounded-xl border ${
                turnBudgetExhausted
                  ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/30'
                  : turnsUsed >= MAX_TURNS_PER_QUESTION - 1
                    ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
              }`}
              aria-live="polite"
            >
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Turns</p>
              <p className={`text-base font-black tabular-nums ${turnBudgetExhausted ? 'text-orange-500' : 'text-slate-800 dark:text-white'}`}>
                {turnsUsed}/{MAX_TURNS_PER_QUESTION}
              </p>
            </div>

          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={togglePause}
              aria-label={isPaused ? 'Resume interview' : 'Pause interview'}
              className={`px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] active:scale-95 transition-all ${
                isPaused
                  ? 'bg-green-500 text-white hover:bg-green-600 shadow-xl shadow-green-100'
                  : 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-xl shadow-yellow-100'
              }`}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
            {hasMultipleQuestions && !isLastQuestion && (
              <button
                onClick={handleNextQuestion}
                aria-label={`Move to question ${currentQuestionIndex + 2}`}
                className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 uppercase text-xs tracking-[0.2em] active:scale-95"
              >
                Next Question →
              </button>
            )}
            <button
              onClick={handleFinish}
              aria-label={isLastQuestion || !hasMultipleQuestions ? 'Finish interview' : 'End interview early'}
              className="px-10 py-4 bg-red-500 text-white rounded-2xl font-black hover:bg-red-600 transition-all shadow-xl shadow-red-100 uppercase text-xs tracking-[0.2em] active:scale-95"
            >
              {isLastQuestion || !hasMultipleQuestions ? 'Finish & Analyze' : 'End Early'}
            </button>
          </div>
        </div>
      </div>

      {/* Transcript panel — desktop sidebar */}
      <aside
        className="hidden lg:flex w-96 bg-white dark:bg-slate-800 rounded-[40px] p-8 shadow-sm border border-slate-200 dark:border-slate-700 flex-col min-h-0"
        aria-label="Live transcript"
      >
        <h3 className="font-black text-slate-900 dark:text-white mb-8 uppercase text-[10px] tracking-[0.3em]">
          Session Transcript
        </h3>
        <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar" aria-live="polite" aria-relevant="additions">
          {transcription.map((line, idx) => (
            <div key={idx} className={`p-4 rounded-[20px] text-sm font-medium animate-in fade-in slide-in-from-right-2 duration-300 ${
              line.startsWith('AI:') ? 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-blue-900/30'
            }`}>
              <div className="text-[10px] font-black uppercase opacity-60 mb-1">{line.split(': ')[0]}</div>
              {line.replace(/^(AI|User): /, '')}
            </div>
          ))}
          {transcription.length === 0 && (
            <div className="text-center py-12 text-slate-300 dark:text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <p className="font-bold text-xs">AI will ask the question when you start...</p>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile transcript drawer */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileTranscriptOpen((p) => !p)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-full shadow-xl text-xs font-black uppercase tracking-widest"
          aria-label="Toggle transcript"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
          </svg>
          Transcript {transcription.length > 0 && `(${transcription.length})`}
        </button>

        {mobileTranscriptOpen && (
          <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" onClick={() => setMobileTranscriptOpen(false)}>
            <div
              className="bg-white dark:bg-slate-800 rounded-t-3xl p-6 max-h-[60vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-[0.3em]">Session Transcript</h3>
                <button onClick={() => setMobileTranscriptOpen(false)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto space-y-4 flex-1" aria-live="polite">
                {transcription.map((line, idx) => (
                  <div key={idx} className={`p-3 rounded-2xl text-sm font-medium ${
                    line.startsWith('AI:') ? 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-blue-600 text-white'
                  }`}>
                    <div className="text-[10px] font-black uppercase opacity-60 mb-1">{line.split(': ')[0]}</div>
                    {line.replace(/^(AI|User): /, '')}
                  </div>
                ))}
                {transcription.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-8">No transcript yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
