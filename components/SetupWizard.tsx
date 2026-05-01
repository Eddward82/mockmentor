import React, { useState } from 'react';
import { InterviewConfig, InterviewMode, ExperienceLevel, UserPlan, UserPreferences } from '../types';

interface SetupWizardProps {
  onStart: (config: InterviewConfig) => void;
  maxQuestions?: number;
  userPlan?: UserPlan;
  defaultConfig?: Partial<UserPreferences>;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onStart, maxQuestions = 5, userPlan = 'starter', defaultConfig }) => {
  const [config, setConfig] = useState<InterviewConfig>({
    jobTitle: defaultConfig?.jobTitle ?? 'Software Engineer',
    level: defaultConfig?.level ?? ExperienceLevel.MID,
    mode: defaultConfig?.mode ?? InterviewMode.BEHAVIORAL,
    company: '',
    questionCount: Math.min(defaultConfig?.defaultQuestionCount ?? 3, maxQuestions)
  });

  return (
    <div className="max-w-2xl mx-auto py-6 md:py-12 px-4 md:px-6">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Configure Your Interview</h2>
        <p className="text-slate-500">Tailor the AI behavior to your target role and level.</p>
      </div>

      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 space-y-6 dark:border dark:border-slate-700"
        role="form"
        aria-label="Interview configuration"
      >
        <div>
          <label htmlFor="job-title" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Target Job Title
          </label>
          <input
            id="job-title"
            type="text"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="e.g. Senior Frontend Developer"
            value={config.jobTitle}
            onChange={(e) => setConfig({ ...config, jobTitle: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="exp-level" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Experience Level
            </label>
            <select
              id="exp-level"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={config.level}
              onChange={(e) => setConfig({ ...config, level: e.target.value as ExperienceLevel })}
            >
              {Object.values(ExperienceLevel).map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="interview-type"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
            >
              Interview Type
            </label>
            <select
              id="interview-type"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={config.mode}
              onChange={(e) => setConfig({ ...config, mode: e.target.value as InterviewMode })}
            >
              {Object.values(InterviewMode).map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="company" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Company (Optional)
            </label>
            <input
              id="company"
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Google, Amazon"
              value={config.company}
              onChange={(e) => setConfig({ ...config, company: e.target.value })}
            />
          </div>
          <div>
            <label
              htmlFor="question-count"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
            >
              Number of Questions
            </label>
            <select
              id="question-count"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={config.questionCount}
              onChange={(e) => setConfig({ ...config, questionCount: parseInt(e.target.value) })}
            >
              {[1, 2, 3, 4, 5]
                .filter((num) => num <= maxQuestions)
                .map((num) => (
                  <option key={num} value={num}>
                    {num} Question{num > 1 ? 's' : ''}
                  </option>
                ))}
            </select>
            {maxQuestions < 5 && (
              <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                Upgrade your plan to unlock more questions per session.
              </p>
            )}
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={() => onStart(config)}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transform transition-all active:scale-[0.98] shadow-lg shadow-blue-200"
          >
            Start Interview Session
          </button>
        </div>

        <p className="text-xs text-center text-slate-400">
          The AI will use Gemini 2.5 Flash for real-time low-latency communication.
        </p>
      </div>
    </div>
  );
};
