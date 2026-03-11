import React, { useEffect, useState } from 'react';
import { InterviewResult } from '../types';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from 'recharts';

interface ResultsScreenProps {
  result: InterviewResult;
  onDone: () => void;
}

const scoreColor = (v: number) =>
  v >= 80 ? 'bg-green-500' : v >= 60 ? 'bg-blue-500' : v >= 40 ? 'bg-yellow-500' : 'bg-red-500';

const scoreTextColor = (v: number) =>
  v >= 80 ? 'text-green-600' : v >= 60 ? 'text-blue-600' : v >= 40 ? 'text-yellow-600' : 'text-red-600';

const ScoreBar: React.FC<{ label: string; value: number; show: boolean; delay: number }> = ({ label, value, show, delay }) => (
  <div
    className={`transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
    style={{ transitionDelay: `${delay}ms` }}
  >
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{label}</span>
      <span className={`text-sm font-black tabular-nums ${scoreTextColor(value)}`}>{value}</span>
    </div>
    <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 ${scoreColor(value)}`}
        style={{ width: show ? `${value}%` : '0%', transitionDelay: `${delay + 100}ms` }}
      />
    </div>
  </div>
);

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, onDone }) => {
  const [showScores, setShowScores] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowScores(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const m = result.metrics;

  const radarData = [
    { subject: 'Comm.', A: m.communication },
    { subject: 'Confidence', A: m.confidence },
    { subject: 'Technical', A: m.technicalAccuracy },
    { subject: 'Structure', A: m.answerStructure ?? 0 },
    { subject: 'Clarity', A: m.clarity ?? 0 },
    { subject: 'Body Lang.', A: m.bodyLanguage },
  ];

  const scoreBars = [
    { label: 'Communication',    value: m.communication },
    { label: 'Confidence',       value: m.confidence },
    { label: 'Technical Accuracy', value: m.technicalAccuracy },
    { label: 'Answer Structure', value: m.answerStructure ?? 0 },
    { label: 'Clarity',          value: m.clarity ?? 0 },
    { label: 'Body Language',    value: m.bodyLanguage },
  ];

  const strengths       = result.strengths       ?? [];
  const improvementAreas = result.improvementAreas ?? [];
  const suggestions     = result.suggestions      ?? [];

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 md:px-6 space-y-6">

      {/* Overall score hero */}
      <div className="bg-white dark:bg-slate-800 rounded-[48px] p-8 md:p-12 shadow-2xl shadow-blue-100/40 dark:shadow-none border border-slate-100 dark:border-slate-700 text-center animate-in zoom-in-95 duration-700">
        <div
          className={`w-28 h-28 bg-blue-600 text-white rounded-[32px] flex items-center justify-center mx-auto mb-6 text-5xl font-black shadow-2xl shadow-blue-200 transition-all duration-700 ${showScores ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
        >
          {m.overall}
        </div>
        <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Well Done!</h2>
        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Targeting: {result.config.jobTitle}</p>
      </div>

      {/* Scorecard grid + radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Score bars */}
        <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 border border-slate-100 dark:border-slate-700 shadow-sm space-y-5">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Scorecard</h3>
          {scoreBars.map((bar, i) => (
            <ScoreBar key={bar.label} label={bar.label} value={bar.value} show={showScores} delay={i * 80} />
          ))}
        </div>

        {/* Radar chart */}
        <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Skill Radar</h3>
          <div className="flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                <Radar name="Score" dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.45} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Strengths + Improvement Areas side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {strengths.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">
              <span className="w-7 h-7 bg-green-100 dark:bg-green-950 text-green-600 rounded-xl flex items-center justify-center text-base">✓</span>
              Strengths
            </h3>
            <ul className="space-y-4">
              {strengths.map((s, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-3 transition-all duration-700 ${showScores ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                  style={{ transitionDelay: `${i * 100 + 200}ms` }}
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-2" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed">{s}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {improvementAreas.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">
              <span className="w-7 h-7 bg-yellow-100 dark:bg-yellow-950 text-yellow-600 rounded-xl flex items-center justify-center text-base">↑</span>
              Improvement Areas
            </h3>
            <ul className="space-y-4">
              {improvementAreas.map((s, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-3 transition-all duration-700 ${showScores ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
                  style={{ transitionDelay: `${i * 100 + 200}ms` }}
                >
                  <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0 mt-2" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed">{s}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Growth roadmap (improvement plan) */}
      {suggestions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="flex items-center gap-3 font-black text-slate-800 dark:text-white mb-6 text-lg">
            <span className="w-9 h-9 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-2xl flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            Growth Roadmap
          </h3>
          <div className="space-y-4">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className={`flex items-start p-5 bg-slate-50 dark:bg-slate-700 rounded-[20px] border border-slate-100 dark:border-slate-600 transition-all duration-700 ${showScores ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
                style={{ transitionDelay: `${(i + 4) * 100}ms` }}
              >
                <div className="w-9 h-9 bg-white dark:bg-slate-600 rounded-full border border-slate-200 dark:border-slate-500 flex items-center justify-center flex-shrink-0 mr-4 font-black text-slate-400 text-sm">
                  {i + 1}
                </div>
                <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed pt-1.5">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onDone}
        className="w-full py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-[24px] font-black text-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-2xl shadow-slate-200 dark:shadow-none active:scale-[0.98]"
      >
        View Performance Dashboard
      </button>
    </div>
  );
};
