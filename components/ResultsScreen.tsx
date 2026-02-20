import React, { useEffect, useState } from 'react';
import { InterviewResult } from '../types';

interface ResultsScreenProps {
  result: InterviewResult;
  onDone: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, onDone }) => {
  const [showScores, setShowScores] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowScores(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="bg-white dark:bg-slate-800 rounded-[56px] p-8 md:p-16 shadow-2xl shadow-blue-100/50 dark:shadow-none border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-700">
        <div className="text-center mb-16">
          <div
            className={`w-32 h-32 bg-blue-600 text-white rounded-[40px] flex items-center justify-center mx-auto mb-8 text-5xl font-black shadow-2xl shadow-blue-200 transition-all duration-1000 transform ${showScores ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
          >
            {result.metrics.overall}
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
            Well Done!
          </h2>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">
            Targeting: {result.config.jobTitle}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-16">
          {[
            { label: 'Comm.', value: result.metrics.communication, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Confidence', value: result.metrics.confidence, color: 'text-green-600', bg: 'bg-green-50' },
            {
              label: 'Technical',
              value: result.metrics.technicalAccuracy,
              color: 'text-indigo-600',
              bg: 'bg-indigo-50'
            },
            { label: 'Visuals', value: result.metrics.bodyLanguage, color: 'text-orange-600', bg: 'bg-orange-50' }
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`p-6 rounded-[32px] text-center transition-all duration-700 delay-[${i * 100}ms] ${showScores ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} ${stat.bg}`}
            >
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">{stat.label}</p>
              <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-16">
          <h3 className="text-2xl font-black mb-8 flex items-center text-slate-800 dark:text-white">
            <span className="w-10 h-10 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            Growth Roadmap
          </h3>
          <div className="space-y-5">
            {result.suggestions.map((s, i) => (
              <div
                key={i}
                className={`flex items-start p-6 bg-white dark:bg-slate-700 rounded-[24px] border border-slate-100 dark:border-slate-600 shadow-sm hover:border-blue-100 dark:hover:border-blue-800 transition-all duration-700 delay-[${(i + 4) * 100}ms] ${showScores ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}
              >
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0 mr-5 font-black text-slate-400">
                  {i + 1}
                </div>
                <p className="text-slate-700 dark:text-slate-200 font-bold leading-relaxed pt-2">{s}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onDone}
          className="w-full py-6 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-[24px] font-black text-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-2xl shadow-slate-200 dark:shadow-none active:scale-[0.98]"
        >
          View Performance Dashboard
        </button>
      </div>
    </div>
  );
};
