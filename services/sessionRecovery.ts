import { InterviewConfig, InterviewQuestion, QuestionResponse } from '../types';

const STORAGE_KEY = 'mockmentor-session-recovery';

export interface RecoverableSession {
  config: InterviewConfig;
  questions: InterviewQuestion[];
  currentQuestionIndex: number;
  questionResponses: QuestionResponse[];
  transcription: string[];
  sessionStartTime: number;
  savedAt: number;
}

export const sessionRecovery = {
  save(data: RecoverableSession): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // sessionStorage full or unavailable - silently ignore
    }
  },

  load(): RecoverableSession | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data: RecoverableSession = JSON.parse(raw);
      // Discard sessions older than 1 hour
      if (Date.now() - data.savedAt > 60 * 60 * 1000) {
        this.clear();
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },

  clear(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // silently ignore
    }
  },

  exists(): boolean {
    return this.load() !== null;
  }
};
