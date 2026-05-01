import React, { useState } from 'react';
import { ExperienceLevel, InterviewMode, UserPreferences } from '../types';

interface OnboardingWizardProps {
  onComplete: (prefs: UserPreferences) => void;
}

const STEPS = ['welcome', 'role', 'howItWorks', 'plan', 'ready'] as const;
type Step = typeof STEPS[number];

const HOW_IT_WORKS = [
  {
    icon: '🤖',
    title: 'AI asks the question',
    desc: 'The AI interviewer speaks the question aloud and shows it on screen. Take a moment to think before answering.',
  },
  {
    icon: '🎙️',
    title: 'Press mic to answer',
    desc: 'Tap the microphone button to start recording your answer. Speak naturally — press Stop when you\'re done. Your speech is transcribed in real-time and used to generate your feedback report.',
  },
  {
    icon: '💬',
    title: 'AI responds & follows up',
    desc: 'The AI listens to your answer, acknowledges it, and asks a follow-up question. You get up to 4 turns per question.',
  },
  {
    icon: '📊',
    title: 'Get your score report',
    desc: 'Click "Finish & Analyze" at any time. You\'ll receive a full report with scores, strengths, and improvement tips.',
  },
];

const FEATURES = [
  { icon: '🎙️', title: 'AI Voice Interviewer', desc: 'Realistic interview conducted by an AI that listens and responds to you in real-time.' },
  { icon: '📊', title: 'Instant Feedback', desc: 'Get scored on communication, confidence, structure, and more after every session.' },
  { icon: '📈', title: 'Progress Tracking', desc: 'Your dashboard shows score trends and improvement over time.' },
  { icon: '🎯', title: 'Tailored Questions', desc: 'Questions are generated specifically for your role, level, and interview type.' },
];

const PLAN_HIGHLIGHTS = [
  { plan: 'Starter', price: 'Free', sessions: '2 sessions/month', questions: 'Up to 3 questions', color: 'slate' },
  { plan: 'Professional', price: '$19/mo', sessions: '20 sessions/month', questions: 'Up to 5 questions', color: 'blue' },
  { plan: 'Premium', price: '$49/mo', sessions: '60 sessions/month', questions: 'Up to 10 questions', color: 'indigo' },
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('welcome');
  const [jobTitle, setJobTitle] = useState('');
  const [level, setLevel] = useState<ExperienceLevel>(ExperienceLevel.MID);
  const [mode, setMode] = useState<InterviewMode>(InterviewMode.BEHAVIORAL);

  const stepIndex = STEPS.indexOf(step);

  const next = () => setStep(STEPS[stepIndex + 1]);

  const handleComplete = () => {
    onComplete({
      jobTitle: jobTitle.trim() || 'Software Engineer',
      level,
      mode,
      defaultQuestionCount: 3,
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="max-w-xl w-full">

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`rounded-full transition-all duration-300 ${
                i === stepIndex ? 'w-8 h-2.5 bg-blue-600' : i < stepIndex ? 'w-2.5 h-2.5 bg-blue-300' : 'w-2.5 h-2.5 bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Step: Welcome */}
        {step === 'welcome' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200 dark:shadow-blue-900">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
              Welcome to MockMentor
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 max-w-md mx-auto">
              Your AI-powered interview coach. Practice with a realistic AI interviewer and get instant, detailed feedback.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 text-left">
              {FEATURES.map((f) => (
                <div key={f.title} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 flex gap-4">
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white text-sm">{f.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={next}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-base hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-200 dark:shadow-blue-900"
            >
              Get Started →
            </button>
          </div>
        )}

        {/* Step: Role setup */}
        {step === 'role' && (
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2 text-center">
              Tell us about your goal
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-8 font-medium">
              We'll tailor your interview questions to your role.
            </p>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  What role are you practicing for?
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Software Engineer, Product Manager"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && jobTitle.trim() && next()}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Experience level</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(ExperienceLevel).map((lvl) => (
                    <button key={lvl} onClick={() => setLevel(lvl)}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all ${level === lvl ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Interview type</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(InterviewMode).map((m) => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all ${mode === m ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={next}
                disabled={!jobTitle.trim()}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-base hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-200 dark:shadow-blue-900 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step: How it works */}
        {step === 'howItWorks' && (
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2 text-center">
              How an interview works
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-8 font-medium">
              Here's what happens during a MockMentor session.
            </p>

            <div className="space-y-4 mb-8">
              {HOW_IT_WORKS.map((item, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-xl flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Step {i + 1}</span>
                    </div>
                    <p className="font-bold text-slate-800 dark:text-white text-sm">{item.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={next}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-base hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-200 dark:shadow-blue-900"
            >
              Got it →
            </button>
          </div>
        )}

        {/* Step: Plan intro */}
        {step === 'plan' && (
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2 text-center">
              You're on the Free plan
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-8 font-medium">
              Start practicing for free. Upgrade anytime for more sessions and features.
            </p>

            <div className="space-y-3 mb-8">
              {PLAN_HIGHLIGHTS.map((p) => (
                <div key={p.plan} className={`bg-white dark:bg-slate-800 rounded-2xl border-2 p-5 flex items-center justify-between ${
                  p.plan === 'Starter' ? 'border-blue-400' : 'border-slate-100 dark:border-slate-700'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-10 rounded-full ${p.color === 'indigo' ? 'bg-indigo-500' : p.color === 'blue' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                    <div>
                      <p className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                        {p.plan}
                        {p.plan === 'Starter' && <span className="text-[9px] bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Your Plan</span>}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{p.sessions} · {p.questions}</p>
                    </div>
                  </div>
                  <p className="font-black text-slate-700 dark:text-slate-300 text-sm">{p.price}</p>
                </div>
              ))}
            </div>

            <button
              onClick={next}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-base hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-200 dark:shadow-blue-900"
            >
              Continue with Free Plan →
            </button>
          </div>
        )}

        {/* Step: Ready */}
        {step === 'ready' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-500 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200 dark:shadow-green-900">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
              You're all set!
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-4">
              Ready to practice as a <span className="font-bold text-slate-700 dark:text-slate-300">{level} {jobTitle || 'professional'}</span>?
            </p>
            <p className="text-xs text-slate-400 mb-10">You can change your defaults anytime in Settings.</p>

            <button
              onClick={handleComplete}
              className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-base hover:bg-green-600 transition-all active:scale-[0.98] shadow-lg shadow-green-200 dark:shadow-green-900"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
