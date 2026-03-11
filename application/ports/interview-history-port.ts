import { InterviewResult } from '../../core/domain/interview';

export interface InterviewHistoryPort {
  saveInterview(result: InterviewResult): Promise<void>;
  getHistory(): Promise<InterviewResult[]>;
  clearHistory(): Promise<void>;
}
