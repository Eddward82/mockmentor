import { InterviewResult } from '../../core/domain/interview';
import { PLAN_LIMITS, UserPlan } from '../../core/domain/plan';

export type StartInterviewDecision =
  | { allowed: true }
  | { allowed: false; reason: 'session_limit_reached' | 'audio_limit_reached' };

const getStartOfMonth = (now = new Date()): Date => {
  const start = new Date(now);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const interviewFlowService = {
  canStartInterview(plan: UserPlan, history: InterviewResult[], now = new Date()): StartInterviewDecision {
    const limits = PLAN_LIMITS[plan];
    const startOfMonth = getStartOfMonth(now);
    const monthlyHistory = history.filter((item) => new Date(item.date) >= startOfMonth);

    if (limits.sessionLimit !== null && monthlyHistory.length >= limits.sessionLimit) {
      return { allowed: false, reason: 'session_limit_reached' };
    }

    const audioUsedMinutes = monthlyHistory.reduce((sum, item) => sum + (item.duration ?? 0), 0) / 60;
    if (audioUsedMinutes >= limits.maxAudioMinutesPerMonth) {
      return { allowed: false, reason: 'audio_limit_reached' };
    }

    return { allowed: true };
  }
};
