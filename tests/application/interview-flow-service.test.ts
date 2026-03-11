import { describe, expect, it } from 'vitest';
import { interviewFlowService } from '../../application/services/interview-flow-service';
import { InterviewResult, ExperienceLevel, InterviewMode } from '../../core/domain/interview';

const makeResult = (overrides: Partial<InterviewResult> = {}): InterviewResult => ({
  id: '1',
  date: new Date().toISOString(),
  config: { jobTitle: 'Engineer', level: ExperienceLevel.MID, mode: InterviewMode.BEHAVIORAL },
  metrics: {
    communication: 70,
    confidence: 70,
    technicalAccuracy: 70,
    bodyLanguage: 70,
    answerStructure: 70,
    clarity: 70,
    overall: 70
  },
  suggestions: [],
  transcription: '',
  duration: 300,
  ...overrides
});

describe('interviewFlowService', () => {
  it('allows session when under limits', () => {
    const decision = interviewFlowService.canStartInterview('starter', [makeResult()]);
    expect(decision).toEqual({ allowed: true });
  });

  it('blocks when monthly session limit reached', () => {
    const history = Array.from({ length: 5 }).map((_, i) => makeResult({ id: `${i}` }));
    const decision = interviewFlowService.canStartInterview('starter', history);
    expect(decision).toEqual({ allowed: false, reason: 'session_limit_reached' });
  });

  it('blocks when monthly audio minutes are exceeded', () => {
    const history = [makeResult({ duration: 15 * 60 })];
    const decision = interviewFlowService.canStartInterview('starter', history);
    expect(decision).toEqual({ allowed: false, reason: 'audio_limit_reached' });
  });
});
