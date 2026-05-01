import React, { useState } from 'react';
import { LiveAnalysis } from '../types';

interface FeedbackDisplayProps {
  analysis: LiveAnalysis;
}

export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ analysis }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="glass border-white/20 text-white backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer select-none"
      onClick={() => setExpanded((v) => !v)}
      title={expanded ? 'Click to collapse' : 'Click to expand'}
    >
      {/* Slim bar — always visible */}
      <div className="flex items-center gap-3 px-4 py-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-white/50 shrink-0">Live</span>
        <span className="text-xs font-bold truncate flex-1">{analysis.bodyLanguageTip}</span>
        <span className="px-2 py-0.5 bg-white/15 rounded-full text-[10px] font-black shrink-0">{analysis.sentiment}</span>
        <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden shrink-0">
          <div
            className="h-full bg-blue-400 transition-all duration-500"
            style={{ width: `${analysis.confidenceIndicator}%` }}
          />
        </div>
        <span className="text-[10px] font-black text-blue-300 shrink-0">{analysis.confidenceIndicator}%</span>
        <svg
          className={`w-3 h-3 text-white/40 shrink-0 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded detail — shown on click */}
      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-white/10">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-[9px] uppercase font-black text-white/50 tracking-widest mb-0.5">Live Coaching</p>
              <p className="font-bold text-sm leading-snug">{analysis.bodyLanguageTip}</p>
            </div>
            <div className="text-right ml-4 shrink-0">
              <p className="text-[9px] uppercase font-black text-white/50 mb-0.5">Sentiment</p>
              <span className="px-2.5 py-1 bg-white/20 rounded-lg font-bold text-xs">{analysis.sentiment}</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-[9px] font-black uppercase text-white/50 mb-1">
              <span>Confidence</span>
              <span>{analysis.confidenceIndicator}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 transition-all duration-500 shadow-[0_0_10px_rgba(96,165,250,0.5)]"
                style={{ width: `${analysis.confidenceIndicator}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
