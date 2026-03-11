import { InterviewConfig, InterviewQuestion, QuestionResponse } from '../../core/domain/interview';

export interface RecoverableSession {
  config: InterviewConfig;
  questions: InterviewQuestion[];
  currentQuestionIndex: number;
  questionResponses: QuestionResponse[];
  transcription: string[];
  sessionStartTime: number;
  savedAt: number;
}

export interface SessionRecoveryPort {
  save(data: RecoverableSession): void;
  load(): RecoverableSession | null;
  clear(): void;
  exists(): boolean;
}
