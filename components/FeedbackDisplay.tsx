import React from 'react';
import { LiveAnalysis } from '../types';

interface FeedbackDisplayProps {
  analysis: LiveAnalysis;
}

export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ analysis }) => {
  return (
    <div className="glass rounded-2xl p-5 border-white/30 text-white w-full backdrop-blur-xl">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-[10px] uppercase font-black text-white/60 tracking-tighter mb-1">Live Coaching</p>
          <p className="font-bold text-lg leading-tight">{analysis.bodyLanguageTip}</p>
        </div>
        <div className="text-right ml-4">
          <p className="text-[10px] uppercase font-black text-white/60 mb-1">Sentiment</p>
          <span className="px-3 py-1 bg-white/20 rounded-lg font-bold text-sm">{analysis.sentiment}</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[10px] font-black uppercase text-white/60 mb-1">
          <span>Confidence Meter</span>
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
  );
};
