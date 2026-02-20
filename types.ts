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
  overall: number;
}

export interface InterviewResult {
  id: string;
  date: string;
  config: InterviewConfig;
  metrics: FeedbackMetrics;
  suggestions: string[];
  transcription: string;
  duration?: number; // Session duration in seconds
  questions?: QuestionResponse[]; // Array of all questions and responses
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
  sessionLimit: number;
  isLifetimeLimit: boolean;
  maxQuestionsPerSession: number;
  questionTimeLimitCap: number; // Max seconds allowed per question answer
  label: string;
}

export const PLAN_LIMITS: Record<UserPlan, PlanLimits> = {
  starter:      { sessionLimit: 3,  isLifetimeLimit: true,  maxQuestionsPerSession: 1, questionTimeLimitCap: 90,  label: 'Starter' },
  professional: { sessionLimit: 8,  isLifetimeLimit: false, maxQuestionsPerSession: 3, questionTimeLimitCap: 120, label: 'Professional' },
  premium:      { sessionLimit: 20, isLifetimeLimit: false, maxQuestionsPerSession: 5, questionTimeLimitCap: 180, label: 'Premium' },
};
