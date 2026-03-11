import React, { useEffect, useRef, useState, useCallback } from 'react';
import { InterviewConfig, LiveAnalysis, InterviewResult, InterviewQuestion, QuestionResponse } from '../types';
import { ANALYTICS_FUNCTION_DECLARATION, generateInterviewSummary, generateQuestions } from '../services/geminiService';
import { decode, encode, decodeAudioData, blobToBase64 } from '../utils/audio-utils';
import { GoogleGenAI, Modality, LiveServerMessage, StartSensitivity, EndSensitivity, ActivityHandling } from '@google/genai';
import { VideoCapture } from './VideoCapture';
import { FeedbackDisplay } from './FeedbackDisplay';
import { sessionRecovery } from '../services/sessionRecovery';
import { db, auth } from '../services/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { emitLiveSessionEvent } from '../utils/live-session-observability';

interface InterviewSimulationProps {
  config: InterviewConfig;
  onFinish: (result: InterviewResult) => void;
  onError: (msg: string) => void;
  questionTimeLimitCap?: number;
}

type SimulationState = 'generating' | 'preparation' | 'active' | 'analyzing';
type ConnectionState = 'connecting' | 'open' | 'degraded' | 'reconnecting' | 'closed';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const geminiModel = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

const LOADING_MESSAGES = [
  'Evaluating your communication style...',
  'Analyzing technical keyword density...',
  'Reviewing body language and eye contact...',
  'Calculating confidence metrics...',
  'Summarizing actionable improvement steps...',
  'Finalizing your professional growth roadmap...'
];

export const InterviewSimulation: React.FC<InterviewSimulationProps> = ({ config, onFinish, onError, questionTimeLimitCap }) => {
  const [simState, setSimState] = useState<SimulationState>('generating');
  const [activeQuestion, setActiveQuestion] = useState<InterviewQuestion | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('closed');
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [liveAnalysis, setLiveAnalysis] = useState<LiveAnalysis>({
    sentiment: 'Focused',
    bodyLanguageTip: 'Adjusting camera...',
    confidenceIndicator: 100
  });

  // Per-question timer state
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState<number | null>(null);
  const [showQuestionTimeWarning, setShowQuestionTimeWarning] = useState(false);
  const questionTimerRef = useRef<number | null>(null);
  const autoAdvanceCalledRef = useRef(false);

  // Multi-question state
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionResponses, setQuestionResponses] = useState<QuestionResponse[]>([]);
  const questionStartTimeRef = useRef<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const sessionRef = useRef<any | null>(null);
  const sessionOpenRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const preAcquiredStreamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const videoTrackRecoveryAttemptedRef = useRef(false);
  const sessionStartTimeRef = useRef<number | null>(null);
  // Track whether AI is currently speaking to mute mic input during playback
  const isAISpeakingRef = useRef(false);
  const aiPlaybackEndTimerRef = useRef<number | null>(null);
  // Heartbeat: periodic no-op send to keep the Gemini session alive
  const heartbeatIntervalRef = useRef<number | null>(null);
  // Audio queue: buffer PCM chunks and flush every 150ms to smooth network jitter
  const audioQueueRef = useRef<string[]>([]);
  const audioFlushIntervalRef = useRef<number | null>(null);
  // Session ID for Firestore transcript persistence (one per question)
  const sessionIdRef = useRef<string>('');
  // Prevent reconnect attempts after intentional close
  const interviewFinishedRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const startLiveSessionRef = useRef<(isReconnect?: boolean) => void>(() => {});

  const buildEventContext = useCallback(() => ({
    sessionId: sessionIdRef.current,
    questionIndex: currentQuestionIndex,
    elapsedMs: sessionStartTimeRef.current ? Date.now() - sessionStartTimeRef.current : undefined,
  }), [currentQuestionIndex]);

  const setConnectionStateWithEvent = useCallback((nextState: ConnectionState, reason?: string) => {
    setConnectionState(nextState);
    emitLiveSessionEvent('transport_state_change', {
      ...buildEventContext(),
      state: nextState,
      reason,
    });
  }, [buildEventContext]);

  // Persist a single transcript message to Firestore (fire-and-forget, never throws)
  const persistTranscriptLine = useCallback((role: 'user' | 'ai', text: string) => {
    const user = auth.currentUser;
    if (!user || !sessionIdRef.current) return;
    const colRef = collection(db, 'users', user.uid, 'sessions', sessionIdRef.current, 'transcript');
    addDoc(colRef, { role, text, timestamp: Timestamp.now() }).catch(() => {
      emitLiveSessionEvent('transcript_persist_failure', { ...buildEventContext(), role });
    });
  }, [buildEventContext]);

  const stopQuestionTimer = useCallback(() => {
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    if (aiPlaybackEndTimerRef.current) clearTimeout(aiPlaybackEndTimerRef.current);
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    if (audioFlushIntervalRef.current) clearInterval(audioFlushIntervalRef.current);
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (preAcquiredStreamRef.current) preAcquiredStreamRef.current.getTracks().forEach((t) => t.stop());
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    sourcesRef.current.forEach((s) => { try { s.stop(); } catch { /* ignore */ } });
    sourcesRef.current.clear();
    audioQueueRef.current = [];
    isAISpeakingRef.current = false;
    setConnectionState('closed');
  }, []);

  // Rotate loading messages
  useEffect(() => {
    if (simState === 'generating' || simState === 'analyzing') {
      const interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [simState]);

  const startQuestionTimer = useCallback((question: InterviewQuestion, isLastQuestion: boolean) => {
    stopQuestionTimer();
    autoAdvanceCalledRef.current = false;
    setShowQuestionTimeWarning(false);

    const limit = questionTimeLimitCap != null
      ? Math.min(question.timeLimit, questionTimeLimitCap)
      : question.timeLimit;

    setQuestionTimeRemaining(limit);

    questionTimerRef.current = window.setInterval(() => {
      setQuestionTimeRemaining((prev: number | null) => {
        if (prev == null) return prev;
        if (isPausedRef.current) return prev;
        const next = prev - 1;
        if (next <= 30) setShowQuestionTimeWarning(true);
        if (next <= 0 && !autoAdvanceCalledRef.current) {
          autoAdvanceCalledRef.current = true;
          clearInterval(questionTimerRef.current!);
          questionTimerRef.current = null;
          if (isLastQuestion) {
            setTimeout(() => handleFinish(), 0);
          } else {
            setTimeout(() => handleNextQuestion(), 0);
          }
        }
        return next;
      });
    }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionTimeLimitCap, stopQuestionTimer]);

  useEffect(() => {
    const init = async () => {
      try {
        const count = config.questionCount || 1;

        // Acquire media stream with echo cancellation in parallel with question generation
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
      } catch (e) {
        onError('Failed to generate questions. Please check your connection.');
      }
    };
    init();
  }, [config, onError]);

  const scheduleReconnect = useCallback((reason: string) => {
    if (interviewFinishedRef.current) return;
    const maxAttempts = 5;
    if (reconnectAttemptRef.current >= maxAttempts) {
      setConnectionStateWithEvent('closed', 'reconnect_exhausted');
      onError('Connection was lost and could not be restored. Please restart the interview session.');
      return;
    }
    reconnectAttemptRef.current += 1;
    const jitter = Math.floor(Math.random() * 300);
    const delay = Math.min(1000 * (2 ** (reconnectAttemptRef.current - 1)) + jitter, 10000);
    setConnectionStateWithEvent('reconnecting', reason);
    emitLiveSessionEvent('reconnect_attempt', {
      ...buildEventContext(),
      reason,
      attempt: reconnectAttemptRef.current,
      delayMs: delay,
    });
    reconnectTimerRef.current = window.setTimeout(() => {
      if (!interviewFinishedRef.current) startLiveSessionRef.current(true);
    }, delay);
  }, [buildEventContext, onError, setConnectionStateWithEvent]);

  const startLiveSession = async (isReconnect = false) => {
    setSimState('active');
    setIsConnecting(true);
    setConnectionStateWithEvent(isReconnect ? 'reconnecting' : 'connecting', isReconnect ? 'retry' : 'initial_connect');
    sessionStartTimeRef.current = sessionStartTimeRef.current || Date.now();
    if (!isReconnect) {
      questionStartTimeRef.current = Date.now();
    }
    const isLast = currentQuestionIndex >= questions.length - 1;
    if (!isReconnect && activeQuestion) startQuestionTimer(activeQuestion, isLast);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onError('Camera/Microphone not available. Make sure you are using HTTPS or localhost.');
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        onError('Gemini API key is missing. Add GEMINI_API_KEY to your .env.local file.');
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      // Reuse pre-acquired stream or acquire with echo cancellation
      let stream: MediaStream;
      if (streamRef.current && streamRef.current.getAudioTracks().some((track) => track.readyState === 'live')) {
        stream = streamRef.current;
      } else if (preAcquiredStreamRef.current) {
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
      const hasVideo = stream.getVideoTracks().length > 0;
      if (videoRef.current && hasVideo) {
        videoRef.current.srcObject = stream;
        // Improve camera reliability across browsers/devices by explicitly playing.
        videoRef.current.play().catch(() => { /* autoplay policies may block, user interaction usually follows */ });
      }

      const [videoTrack] = stream.getVideoTracks();
      if (videoTrack) {
        videoTrackRecoveryAttemptedRef.current = false;
        const recoverVideoTrack = async () => {
          if (videoTrackRecoveryAttemptedRef.current || interviewFinishedRef.current) return;
          videoTrackRecoveryAttemptedRef.current = true;
          emitLiveSessionEvent('camera_recovery_attempt', buildEventContext());
          try {
            const refreshed = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const [freshTrack] = refreshed.getVideoTracks();
            if (!freshTrack || !streamRef.current) return;
            streamRef.current.removeTrack(videoTrack);
            streamRef.current.addTrack(freshTrack);
            if (videoRef.current) {
              videoRef.current.srcObject = streamRef.current;
              videoRef.current.play().catch(() => { /* best effort */ });
            }
            emitLiveSessionEvent('camera_recovery_success', buildEventContext());
          } catch {
            emitLiveSessionEvent('camera_recovery_failure', buildEventContext());
            onError('Camera feed was interrupted. Please verify camera permissions and device availability.');
          }
        };
        videoTrack.onended = recoverVideoTrack;
        videoTrack.onmute = recoverVideoTrack;
      }

      const inputAudioCtx = new AudioContext({ sampleRate: 16000 });
      const outputAudioCtx = new AudioContext({ sampleRate: 24000 });

      sessionOpenRef.current = false;
      sessionRef.current = null;
      isAISpeakingRef.current = false;
      interviewFinishedRef.current = false;
      if (!isReconnect || !sessionIdRef.current) {
        // New session ID for Firestore transcript bucket
        sessionIdRef.current = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      }

      const sessionPromise = ai.live.connect({
        model: geminiModel,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: `You are a professional interview coach conducting a mock interview session.

CURRENT QUESTION: "${activeQuestion?.question}"

CONVERSATION RULES:
1. Start by clearly asking the candidate the question above.
2. LISTEN FULLY — do NOT interrupt or speak while the candidate is answering. Wait for a clear, complete pause before responding.
3. After the candidate finishes their answer, ALWAYS respond in exactly this two-part structure:
   a. REFLECTION — one sentence acknowledging what they said. Be specific to their answer, not generic. Examples: "That's a strong example of handling ambiguity under pressure." / "I like how you tied the outcome back to business impact."
   b. FOLLOW-UP — either one targeted follow-up question about their answer, OR a brief closing remark if the answer was complete and no follow-up is needed.
4. Keep the entire response under 3 sentences. Do not over-explain or give coaching feedback mid-session.
5. Do NOT ask multiple questions at once. One follow-up maximum.
6. Do NOT repeat the original question unless the candidate explicitly asks.
7. Occasionally call the 'updateAnalytics' tool to provide feedback scores, but do this silently without narrating it.

EXAMPLE RESPONSE AFTER AN ANSWER:
"That's a great example of taking ownership in a difficult situation. What was the biggest obstacle you had to overcome during that project?"

TONE: Professional, encouraging, concise. You are a human interviewer — warm but focused.`,
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,
              startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
              endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
              prefixPaddingMs: 40,
              silenceDurationMs: 3500,
            },
            // Prevent AI from cutting in while user is speaking
            activityHandling: ActivityHandling.NO_INTERRUPTION,
          },
          tools: [{ functionDeclarations: [ANALYTICS_FUNCTION_DECLARATION] }],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            sessionOpenRef.current = true;
            reconnectAttemptRef.current = 0;
            sessionPromise.then((s) => { sessionRef.current = s; });
            setIsConnecting(false);
            setConnectionStateWithEvent('open', isReconnect ? 'reconnected' : 'opened');

            // --- Audio queue: buffer PCM chunks, flush every 150ms ---
            const source = inputAudioCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isPausedRef.current || isAISpeakingRef.current || !sessionOpenRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              audioQueueRef.current.push(encode(new Uint8Array(int16.buffer)));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioCtx.destination);

            // Flush audio queue every 150ms — sends chunks in order, absorbs jitter
            audioFlushIntervalRef.current = window.setInterval(() => {
              if (!sessionOpenRef.current || !sessionRef.current || audioQueueRef.current.length === 0) return;
              while (audioQueueRef.current.length > 0) {
                const chunk = audioQueueRef.current.shift()!;
                try {
                  sessionRef.current.sendRealtimeInput({ media: { data: chunk, mimeType: 'audio/pcm;rate=16000' } });
                } catch {
                  emitLiveSessionEvent('realtime_send_failure', buildEventContext());
                  audioQueueRef.current = [];
                  setConnectionStateWithEvent('degraded', 'audio_send_failed');
                  break;
                }
              }
            }, 150);

            // --- Heartbeat: send a silent audio frame every 20s to keep session alive ---
            heartbeatIntervalRef.current = window.setInterval(() => {
              if (!sessionOpenRef.current || !sessionRef.current) return;
              // 1 frame of silence (256 zero samples) encoded as base64 PCM
              const silence = encode(new Uint8Array(512)); // 256 int16 = 512 bytes of zeros
              try {
                sessionRef.current.sendRealtimeInput({ media: { data: silence, mimeType: 'audio/pcm;rate=16000' } });
              } catch {
                emitLiveSessionEvent('heartbeat_failure', buildEventContext());
                setConnectionStateWithEvent('degraded', 'heartbeat_failed');
              }
            }, 20000);

            if (!hasVideo) return;
            frameIntervalRef.current = window.setInterval(() => {
              if (isPausedRef.current || !sessionOpenRef.current || !sessionRef.current) return;
              if (videoRef.current && canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx?.drawImage(videoRef.current, 0, 0, 320, 240);
                canvasRef.current.toBlob(
                  async (blob) => {
                    if (blob && sessionOpenRef.current && sessionRef.current) {
                      const data = await blobToBase64(blob);
                      try {
                        sessionRef.current.sendRealtimeInput({ media: { data, mimeType: 'image/jpeg' } });
                      } catch {
                        emitLiveSessionEvent('realtime_send_failure', { ...buildEventContext(), mediaType: 'image/jpeg' });
                      }
                    }
                  },
                  'image/jpeg',
                  0.6
                );
              }
            }, 1000);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle transcriptions — persist each line to Firestore as it arrives
            const outText = message.serverContent?.outputTranscription?.text;
            const inText = message.serverContent?.inputTranscription?.text;
            if (outText) {
              setTranscription((p: string[]) => [...p, `AI: ${outText}`]);
              persistTranscriptLine('ai', outText);
            }
            if (inText) {
              setTranscription((p: string[]) => [...p, `User: ${inText}`]);
              persistTranscriptLine('user', inText);
            }

            // Process audio parts — mark AI as speaking while audio plays
            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                const audio = part.inlineData.data;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioCtx.currentTime);
                const buf = await decodeAudioData(decode(audio), outputAudioCtx, 24000, 1);
                const src = outputAudioCtx.createBufferSource();
                src.buffer = buf;
                src.connect(outputAudioCtx.destination);
                src.start(nextStartTimeRef.current);
                isAISpeakingRef.current = true;
                if (aiPlaybackEndTimerRef.current) clearTimeout(aiPlaybackEndTimerRef.current);
                const playbackDuration = (nextStartTimeRef.current + buf.duration - outputAudioCtx.currentTime) * 1000;
                aiPlaybackEndTimerRef.current = window.setTimeout(() => {
                  isAISpeakingRef.current = false;
                }, playbackDuration + 300);
                nextStartTimeRef.current += buf.duration;
                sourcesRef.current.add(src);
              }
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'updateAnalytics') {
                  setLiveAnalysis(fc.args as any);
                  if (sessionOpenRef.current && sessionRef.current) {
                    try {
                      sessionRef.current.sendToolResponse({
                        functionResponses: { id: fc.id, name: fc.name, response: { status: 'ok' } }
                      });
                    } catch { /* session closed */ }
                  }
                }
              }
            }
          },
          onerror: (e: any) => {
            setConnectionStateWithEvent('degraded', 'socket_error');
            console.error('Gemini Live error:', e);
          },
          onclose: (e: any) => {
            sessionOpenRef.current = false;
            sessionRef.current = null;
            isAISpeakingRef.current = false;
            audioQueueRef.current = [];
            if (heartbeatIntervalRef.current) { clearInterval(heartbeatIntervalRef.current); heartbeatIntervalRef.current = null; }
            if (audioFlushIntervalRef.current) { clearInterval(audioFlushIntervalRef.current); audioFlushIntervalRef.current = null; }
            setConnectionStateWithEvent('closed', e?.reason || 'socket_closed');
            console.warn('Gemini Live closed — code:', e?.code, 'reason:', e?.reason);
            // Reconnect only if the interview is still in progress and close was unexpected
            if (!interviewFinishedRef.current && e?.code !== 1000) {
              scheduleReconnect(e?.reason || `code_${e?.code || 'unknown'}`);
            }
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      setConnectionStateWithEvent('degraded', 'connect_failed');
      console.error('Live session error:', err);
      const message = err instanceof Error ? err.message : String(err);
      onError(`Failed to start AI session: ${message}`);
    }
  };

  startLiveSessionRef.current = startLiveSession;

  useEffect(() => cleanup, [cleanup]);

  // Auto-save session state every 10 seconds
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

  const clearRecoveryOnFinish = useCallback(() => {
    sessionRecovery.clear();
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      isPausedRef.current = next;
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
      }
      return next;
    });
  }, []);

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
    setQuestionTimeRemaining(null);
    setShowQuestionTimeWarning(false);
    autoAdvanceCalledRef.current = false;

    interviewFinishedRef.current = true; // prevent reconnect on intentional close
    sessionOpenRef.current = false;
    if (sessionRef.current) { try { sessionRef.current.close(); } catch { /* ignore */ } sessionRef.current = null; }
    sessionPromiseRef.current = null;
    cleanup();

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setActiveQuestion(questions[nextIndex]);
      setTranscription([]);
      setSimState('preparation');
    }
  };

  const handleFinish = async () => {
    interviewFinishedRef.current = true; // prevent reconnect on intentional close
    stopQuestionTimer();
    const currentResponse = saveCurrentQuestionResponse();
    const allResponses = currentResponse ? [...questionResponses, currentResponse] : questionResponses;

    setSimState('analyzing');
    setIsConnecting(true);
    clearRecoveryOnFinish();
    const sessionDuration = sessionStartTimeRef.current
      ? Math.round((Date.now() - sessionStartTimeRef.current) / 1000)
      : 0;

    const fullTranscription = allResponses
      .map((r, i) => `--- Question ${i + 1}: ${r.question.question} ---\n${r.transcription}`)
      .join('\n\n');

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timed out')), 30000)
      );
      const summary = await Promise.race([generateInterviewSummary(config, fullTranscription), timeout]);
      cleanup();
      if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then((s) => { try { s.close(); } catch { /* ignore */ } });
      }
      onFinish({
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        config,
        metrics: summary.metrics!,
        suggestions: summary.suggestions!,
        strengths: summary.strengths,
        improvementAreas: summary.improvementAreas,
        transcription: fullTranscription,
        duration: sessionDuration,
        questions: allResponses
      });
    } catch (e) {
      console.error('Analysis error:', e);
      cleanup();
      onFinish({
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        config,
        metrics: { communication: 65, confidence: 65, technicalAccuracy: 65, bodyLanguage: 65, answerStructure: 65, clarity: 65, overall: 65 },
        suggestions: ['Summary generation failed, but your effort was noted!', 'Practice more to refine results.', 'Try again with a stable internet connection.'],
        strengths: [],
        improvementAreas: [],
        transcription: fullTranscription,
        duration: sessionDuration,
        questions: allResponses
      });
    }
  };

  if (simState === 'generating' || simState === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-8" role="status" aria-live="polite">
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
              onClick={startLiveSession}
              aria-label={`Start recording answer for question ${currentQuestionIndex + 1}`}
              className="w-full md:w-auto px-16 py-5 bg-blue-600 text-white rounded-[24px] font-black text-xl shadow-2xl shadow-blue-200 hover:scale-105 transition-all active:scale-95"
            >
              Start Recording
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLastQuestion = currentQuestionIndex >= questions.length - 1;
  const hasMultipleQuestions = questions.length > 1;

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6 h-[calc(100vh-80px)] overflow-hidden">
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
          <canvas ref={canvasRef} className="hidden" width="320" height="240" />
          <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6">
            <FeedbackDisplay analysis={liveAnalysis} />
          </div>
        </div>
        {showQuestionTimeWarning && questionTimeRemaining != null && questionTimeRemaining > 0 && (
          <div
            className="bg-red-500 text-white px-6 py-3 rounded-2xl flex items-center gap-3 animate-pulse"
            role="alert"
            aria-live="assertive"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-black">
              {questionTimeRemaining <= 10
                ? `Time's up in ${questionTimeRemaining}s...`
                : `${questionTimeRemaining}s remaining — wrap up your answer!`}
            </p>
          </div>
        )}
        <div
          className="glass p-5 rounded-[32px] flex items-center justify-between border-slate-200 shadow-sm"
          role="toolbar"
          aria-label="Recording controls"
        >
          <div className="flex items-center space-x-4 px-2">
            <div className="relative" aria-hidden="true">
              <div
                className={`w-12 h-12 rounded-full ${isPaused ? 'bg-yellow-100' : 'bg-blue-100'} flex items-center justify-center`}
              >
                {!isPaused && <div className="w-4 h-4 bg-blue-600 rounded-full animate-ping opacity-75 absolute" />}
                <div className={`w-4 h-4 ${isPaused ? 'bg-yellow-500' : 'bg-blue-600'} rounded-full relative`} />
              </div>
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Simulation Mode</p>
              <p className="font-black text-slate-800 dark:text-white text-lg" aria-live="polite">
                {isConnecting ? 'Establishing...' : isPaused ? 'Paused' : 'Recording Active'}
              </p>
              <p className="text-xs font-bold text-slate-500">Transport: {connectionState}</p>
            </div>
            {questionTimeRemaining != null && (
              <div
                className={`hidden sm:flex flex-col items-center px-4 py-2 rounded-xl border ${
                  questionTimeRemaining <= 30
                    ? 'border-red-300 bg-red-50 dark:bg-red-950/30'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                }`}
                aria-live="polite"
                aria-label={`Time remaining: ${questionTimeRemaining}s`}
              >
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Time Left</p>
                <p className={`text-base font-black tabular-nums ${questionTimeRemaining <= 30 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                  {questionTimeRemaining}s
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              disabled={isConnecting}
              onClick={togglePause}
              aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
              className={`px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] active:scale-95 disabled:opacity-50 transition-all ${
                isPaused
                  ? 'bg-green-500 text-white hover:bg-green-600 shadow-xl shadow-green-100 dark:shadow-green-900/30'
                  : 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-xl shadow-yellow-100 dark:shadow-yellow-900/30'
              }`}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
            {hasMultipleQuestions && !isLastQuestion && (
              <button
                disabled={isConnecting}
                onClick={handleNextQuestion}
                aria-label={`Move to question ${currentQuestionIndex + 2} of ${questions.length}`}
                className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 uppercase text-xs tracking-[0.2em] active:scale-95 disabled:opacity-50"
              >
                Next Question →
              </button>
            )}
            <button
              disabled={isConnecting}
              onClick={handleFinish}
              aria-label={
                isLastQuestion || !hasMultipleQuestions
                  ? 'Finish interview and analyze results'
                  : 'End interview early and analyze results'
              }
              className="px-10 py-4 bg-red-500 text-white rounded-2xl font-black hover:bg-red-600 transition-all shadow-xl shadow-red-100 uppercase text-xs tracking-[0.2em] active:scale-95 disabled:opacity-50"
            >
              {isLastQuestion || !hasMultipleQuestions ? 'Finish & Analyze' : 'End Early'}
            </button>
          </div>
        </div>
      </div>
      <aside
        className="hidden lg:flex w-96 bg-white dark:bg-slate-800 rounded-[40px] p-8 shadow-sm border border-slate-200 dark:border-slate-700 flex-col min-h-0"
        aria-label="Live transcript"
      >
        <h3 className="font-black text-slate-900 dark:text-white mb-8 uppercase text-[10px] tracking-[0.3em]">
          Session Transcript
        </h3>
        <div
          className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar"
          aria-live="polite"
          aria-relevant="additions"
        >
          {transcription.map((line, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-[20px] text-sm font-medium animate-in fade-in slide-in-from-right-2 duration-300 ${line.startsWith('AI:') ? 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-blue-900/30'}`}
            >
              <div className="text-[10px] font-black uppercase opacity-60 mb-1">{line.split(': ')[0]}</div>
              {line.replace(/^(AI|User): /, '')}
            </div>
          ))}
          {transcription.length === 0 && (
            <div className="text-center py-12 text-slate-300 dark:text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              <p className="font-bold text-xs">Waiting for speech...</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
