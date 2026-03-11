export enum InterviewMode {
  BEHAVIORAL = 'Behavioral',
  TECHNICAL = 'Technical',
  CASE_STUDY = 'Case Study'
}

export enum ExperienceLevel {
  ENTRY = 'Entry Level',
  MID = 'Mid Level',
  SENIOR = 'Senior'
}

export interface InterviewConfig {
  jobTitle: string;
  level: ExperienceLevel;
  mode: InterviewMode;
  company?: string;
  questionCount?: number; // Number of questions per session (default 3)
}

export interface InterviewQuestion {
  question: string;
  tips: string[];
  timeLimit: number;
}

export interface QuestionResponse {
  question: InterviewQuestion;
  transcription: string;
  startTime: number;
  endTime: number;
}

export interface FeedbackMetrics {
  communication: number;
  confidence: number;
  technicalAccuracy: number;
  bodyLanguage: number;
  answerStructure: number;
  clarity: number;
  overall: number;
}

export interface InterviewResult {
  id: string;
  date: string;
  config: InterviewConfig;
  metrics: FeedbackMetrics;
  suggestions: string[];       // improvement plan (3 actionable steps)
  strengths?: string[];        // 3 things done well
  improvementAreas?: string[]; // 3 areas to work on
  transcription: string;
  duration?: number;
  questions?: QuestionResponse[];
}

export interface LiveAnalysis {
  sentiment: string;
  bodyLanguageTip: string;
  confidenceIndicator: number;
}

export enum AppView {
  HOME = 'home',
  SETUP = 'setup',
  SIMULATION = 'simulation',
  RESULTS = 'results',
  DASHBOARD = 'dashboard',
  SETTINGS = 'settings',
  TERMS = 'terms',
  PRIVACY = 'privacy',
}

export type UserPlan = 'starter' | 'professional' | 'premium';

export interface PlanLimits {
  sessionLimit: number | null; // null = unlimited
  isLifetimeLimit: boolean;
  maxQuestionsPerSession: number;
  questionTimeLimitCap: number; // Max seconds allowed per question answer
  maxAudioMinutesPerMonth: number;
  label: string;
}

export const PLAN_LIMITS: Record<UserPlan, PlanLimits> = {
  starter:      { sessionLimit: 5,    isLifetimeLimit: false, maxQuestionsPerSession: 3,  questionTimeLimitCap: 90,  maxAudioMinutesPerMonth: 15,  label: 'Starter' },
  professional: { sessionLimit: 20,   isLifetimeLimit: false, maxQuestionsPerSession: 5,  questionTimeLimitCap: 120, maxAudioMinutesPerMonth: 120, label: 'Professional' },
  premium:      { sessionLimit: null, isLifetimeLimit: false, maxQuestionsPerSession: 10, questionTimeLimitCap: 180, maxAudioMinutesPerMonth: 600, label: 'Premium' },
};
