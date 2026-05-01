import { InterviewResult } from '../../core/domain/interview';

export interface InterviewHistoryPort {
  saveInterview(result: InterviewResult): Promise<void>;
  getHistory(uid: string): Promise<InterviewResult[]>;
  clearHistory(): Promise<void>;
}
