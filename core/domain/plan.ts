export type UserPlan = 'starter' | 'professional' | 'premium';

export interface PlanLimits {
  sessionLimit: number | null;
  isLifetimeLimit: boolean;
  maxQuestionsPerSession: number;
  questionTimeLimitCap: number;
  maxAudioMinutesPerMonth: number;
  label: string;
}

export const PLAN_LIMITS: Record<UserPlan, PlanLimits> = {
  starter: {
    sessionLimit: 5,
    isLifetimeLimit: false,
    maxQuestionsPerSession: 3,
    questionTimeLimitCap: 90,
    maxAudioMinutesPerMonth: 15,
    label: 'Starter'
  },
  professional: {
    sessionLimit: 20,
    isLifetimeLimit: false,
    maxQuestionsPerSession: 5,
    questionTimeLimitCap: 120,
    maxAudioMinutesPerMonth: 120,
    label: 'Professional'
  },
  premium: {
    sessionLimit: null,
    isLifetimeLimit: false,
    maxQuestionsPerSession: 10,
    questionTimeLimitCap: 180,
    maxAudioMinutesPerMonth: 600,
    label: 'Premium'
  }
};
