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
  questionCount?: number;
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
  suggestions: string[];
  strengths?: string[];
  improvementAreas?: string[];
  transcription: string;
  duration?: number;
  questions?: QuestionResponse[];
}

export interface LiveAnalysis {
  sentiment: string;
  bodyLanguageTip: string;
  confidenceIndicator: number;
}

export interface UserPreferences {
  jobTitle: string;
  level: ExperienceLevel;
  mode: InterviewMode;
  defaultQuestionCount: number;
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
  ONBOARDING = 'onboarding',
  ADMIN = 'admin',
  EMAIL_VERIFICATION = 'email-verification'
}
