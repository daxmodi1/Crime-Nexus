import React from 'react';

const ProcessingView = ({ loadingProgress }) => {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center z-50">
      <div className="w-64 space-y-6">
        <div className="flex justify-between text-cyan-400 font-mono text-sm">
          <span>PROCESSING EVIDENCE</span>
          <span>{loadingProgress}%</span>
        </div>
        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-cyan-500 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 font-mono">
            {loadingProgress < 30 && "> Indexing crime scene photos..."}
            {loadingProgress >= 30 && loadingProgress < 60 && "> Analyzing biometric markers..."}
            {loadingProgress >= 60 && loadingProgress < 90 && "> Cross-referencing criminal databases..."}
            {loadingProgress >= 90 && "> Generating AI insights..."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProcessingView;
