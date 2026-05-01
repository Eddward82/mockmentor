import React, { useState, useEffect, useRef } from 'react';
import { InterviewResult } from '../types';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { persistenceService } from '../services/persistenceService';
import { exportAsJSON, exportAsPDF } from '../utils/export-utils';

interface DashboardProps {
  history: InterviewResult[];
  onStartNew: () => void;
}

const formatDuration = (seconds?: number): string => {
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

export const Dashboard: React.FC<DashboardProps> = ({ history, onStartNew }) => {
  const [isResetting, setIsResetting] = useState(false);
  const [selectedSession, setSelectedSession] = useState<InterviewResult | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const latest = history[0];

  // Close modal on Escape key and manage focus
  useEffect(() => {
    if (!selectedSession) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedSession(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    modalRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedSession]);

  if (!latest) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-6 text-center">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 dark:text-white">No Interview History Yet</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
            Complete your first simulation to see detailed analytics and improvement tracks.
          </p>
          <button
            onClick={onStartNew}
            className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-all"
          >
            Start Your First Interview
          </button>
        </div>
      </div>
    );
  }

  const radarData = [
    { subject: 'Communication', A: latest.metrics.communication, fullMark: 100 },
    { subject: 'Confidence',    A: latest.metrics.confidence, fullMark: 100 },
    { subject: 'Technical',     A: latest.metrics.technicalAccuracy, fullMark: 100 },
    { subject: 'Structure',     A: latest.metrics.answerStructure ?? 0, fullMark: 100 },
    { subject: 'Clarity',       A: latest.metrics.clarity ?? 0, fullMark: 100 },
    { subject: 'Delivery', A: latest.metrics.bodyLanguage, fullMark: 100 },
  ];

  const trendData = [...history].reverse().map((h: InterviewResult) => ({
    date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: h.metrics.overall
  }));

  const avgScore = Math.round(
    history.reduce((acc: number, curr: InterviewResult) => acc + curr.metrics.overall, 0) / history.length
  );
  const improvement = history.length > 1 ? latest.metrics.overall - history[history.length - 1].metrics.overall : 0;

  const handleResetHistory = async () => {
    if (confirm('Are you sure? This will only clear your local cache. Cloud data requires account deletion.')) {
      setIsResetting(true);
      await persistenceService.clearHistory();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 md:py-10 px-4 md:px-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Progress Tracker</h2>
          <p className="text-slate-500 font-medium">Tracking {history.length} interview sessions</p>
        </div>
        <button
          onClick={onStartNew}
          className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 dark:shadow-blue-900/30 transition-all hover:scale-105"
        >
          New Practice Session
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-xs font-black uppercase text-slate-400 mb-1">Average Score</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{avgScore}%</span>
            <span className="text-sm font-bold text-slate-400 mb-1 pb-0.5">Global Avg.</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-xs font-black uppercase text-slate-400 mb-1">Total Time</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {Math.round(history.reduce((acc: number, curr: InterviewResult) => acc + (curr.duration || 300), 0) / 60)}
              m
            </span>
            <span className="text-sm font-bold text-slate-400 mb-1 pb-0.5">Practice Time</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-xs font-black uppercase text-slate-400 mb-1">Improvement</p>
          <div className="flex items-end gap-2">
            <span className={`text-3xl font-black ${improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {improvement >= 0 ? '+' : ''}
              {improvement}
            </span>
            <span className="text-sm font-bold text-slate-400 mb-1 pb-0.5">pts vs Start</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-xl font-bold mb-6">Latest Skill Breakdown</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                <Radar name="Score" dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-xl font-bold mb-6">Score Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                  labelStyle={{ fontWeight: 800, color: '#1e293b' }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#2563eb"
                  strokeWidth={4}
                  dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <h3 className="text-xl font-bold mb-6">Historical Sessions</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left py-4 px-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                  Job Role
                </th>
                <th className="text-left py-4 px-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                  Score
                </th>
                <th className="hidden sm:table-cell text-left py-4 px-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                  Date
                </th>
                <th className="text-right py-4 px-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {history.map((item: InterviewResult) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                  <td className="py-5 px-2">
                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                      {item.config.jobTitle}
                    </p>
                    <p className="text-xs font-medium text-slate-400">
                      {item.config.mode} • {item.config.level}
                    </p>
                  </td>
                  <td className="py-5 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${item.metrics.overall}%` }} />
                      </div>
                      <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                        {item.metrics.overall}%
                      </span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell py-5 px-2 text-sm font-medium text-slate-500">
                    <p>{new Date(item.date).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-400">{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {formatDuration(item.duration)}</p>
                  </td>
                  <td className="py-5 px-2 text-right">
                    <button
                      onClick={() => setSelectedSession(item)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-bold text-sm bg-blue-50 dark:bg-blue-950 px-4 py-2 rounded-xl"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production Privacy Controls */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h4 className="text-lg font-black mb-1">Privacy & Data Control</h4>
          <p className="text-slate-400 text-sm font-medium">
            Manage your data and cloud sync preferences according to our production security standards.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            disabled={isResetting}
            onClick={handleResetHistory}
            className="px-6 py-2 bg-white/10 hover:bg-red-500/20 text-red-400 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            {isResetting ? 'Processing...' : 'Clear Local Cache'}
          </button>
        </div>
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSession(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl outline-none mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 id="modal-title" className="text-xl font-black text-slate-900 dark:text-white">
                  {selectedSession.config.jobTitle}
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedSession.config.mode} • {selectedSession.config.level} •{' '}
                  {new Date(selectedSession.date).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                aria-label="Close session details"
                className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
              {/* Metrics Grid */}
              <div>
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">
                  Performance Metrics
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Communication',    value: selectedSession.metrics.communication },
                    { label: 'Confidence',        value: selectedSession.metrics.confidence },
                    { label: 'Technical',         value: selectedSession.metrics.technicalAccuracy },
                    { label: 'Delivery',          value: selectedSession.metrics.bodyLanguage },
                    { label: 'Answer Structure',  value: selectedSession.metrics.answerStructure ?? '—' },
                    { label: 'Clarity',           value: selectedSession.metrics.clarity ?? '—' },
                    { label: 'Overall',           value: selectedSession.metrics.overall },
                  ].map((metric) => (
                    <div key={metric.label} className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-4 text-center">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{metric.value}{typeof metric.value === 'number' ? '%' : ''}</p>
                      <p className="text-xs font-bold text-slate-500 mt-1">{metric.label}</p>
                    </div>
                  ))}
                </div>

                {/* Strengths */}
                {selectedSession.strengths && selectedSession.strengths.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-3">Strengths</p>
                    <ul className="space-y-2">
                      {selectedSession.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                          <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvement Areas */}
                {selectedSession.improvementAreas && selectedSession.improvementAreas.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-3">Improvement Areas</p>
                    <ul className="space-y-2">
                      {selectedSession.improvementAreas.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0 mt-1.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Duration */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-2xl">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-blue-600">Session Duration</p>
                  <p className="font-bold text-slate-900 dark:text-white">{formatDuration(selectedSession.duration)}</p>
                </div>
              </div>

              {/* Suggestions */}
              <div>
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">AI Suggestions</h4>
                <div className="space-y-3">
                  {selectedSession.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Questions Breakdown (for multi-question sessions) */}
              {selectedSession.questions && selectedSession.questions.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">
                    Questions & Responses ({selectedSession.questions.length})
                  </h4>
                  <div className="space-y-4">
                    {selectedSession.questions.map((qr, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-5 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-slate-900 dark:text-white">{qr.question.question}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              Duration: {Math.round((qr.endTime - qr.startTime) / 1000)}s
                            </p>
                          </div>
                        </div>
                        {qr.transcription && (
                          <div className="ml-11 bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-600">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Your Response</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                              {qr.transcription}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transcription (for single-question sessions or fallback) */}
              {selectedSession.transcription &&
                (!selectedSession.questions || selectedSession.questions.length === 0) && (
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">
                      Session Transcript
                    </h4>
                    <div className="bg-slate-900 rounded-2xl p-5 max-h-64 overflow-y-auto">
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                        {selectedSession.transcription || 'No transcription available.'}
                      </pre>
                    </div>
                  </div>
                )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => exportAsJSON(selectedSession)}
                className="flex-1 py-3 bg-slate-600 text-white rounded-2xl font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export JSON
              </button>
              <button
                onClick={() => exportAsPDF(selectedSession)}
                className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Export PDF
              </button>
              <button
                onClick={() => setSelectedSession(null)}
                className="flex-1 py-3 bg-slate-900 dark:bg-slate-600 text-white rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-slate-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
