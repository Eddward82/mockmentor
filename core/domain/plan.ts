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
    sessionLimit: 2,          // 2 sessions/month — ~$0.36 API cost worst-case (3q×~$0.18), loss-leader for free tier
    isLifetimeLimit: false,
    maxQuestionsPerSession: 3,
    questionTimeLimitCap: 90,
    maxAudioMinutesPerMonth: 15,
    label: 'Starter'
  },
  professional: {
    sessionLimit: 20,         // 20 sessions/month — ~$4 API cost vs $19 revenue (79% margin)
    isLifetimeLimit: false,
    maxQuestionsPerSession: 5,
    questionTimeLimitCap: 120,
    maxAudioMinutesPerMonth: 120,
    label: 'Professional'
  },
  premium: {
    sessionLimit: 60,         // 60 sessions/month soft cap — ~$24 API cost vs $49 revenue (51% margin)
    isLifetimeLimit: false,
    maxQuestionsPerSession: 10,
    questionTimeLimitCap: 180,
    maxAudioMinutesPerMonth: 600,
    label: 'Premium'
  }
};
