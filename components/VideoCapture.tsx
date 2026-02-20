import React, { forwardRef } from 'react';

interface VideoCaptureProps {
  className?: string;
}

export const VideoCapture = forwardRef<HTMLVideoElement, VideoCaptureProps>(({ className }, ref) => {
  return (
    <div className={`relative bg-black rounded-3xl overflow-hidden shadow-2xl group ${className}`}>
      <video ref={ref} autoPlay muted playsInline className="w-full h-full object-cover" />
      <div className="absolute top-6 left-6 flex gap-2">
        <span className="px-3 py-1 bg-red-500 text-white text-[10px] font-black rounded-full animate-pulse uppercase tracking-wider">
          Recording
        </span>
      </div>
    </div>
  );
});
