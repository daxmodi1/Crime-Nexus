import React from 'react';
import { Loader, Database } from 'lucide-react';

const ProcessingView = ({ loadingProgress }) => {
  const steps = [
    { progress: 0, label: 'Preparing files', desc: 'Validating evidence...' },
    { progress: 25, label: 'Indexing content', desc: 'Extracting text from documents...' },
    { progress: 50, label: 'Building vector database', desc: 'Creating embeddings...' },
    { progress: 75, label: 'Finalizing storage', desc: 'Storing in ChromaDB...' },
    { progress: 100, label: 'Ready for analysis', desc: 'Investigation loaded!' }
  ];

  const currentStep = steps.find((s, i) => i === Math.floor(loadingProgress / 25)) || steps[steps.length - 1];

  return (
    <div className="min-h-screen bg-[#f6f7ed] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-[#1f1f1f] animate-pulse">
              <Database size={36} className="text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-semibold text-[#1f1f1f] tracking-tight">Processing Evidence</h2>
          <p className="text-[#71717a] text-sm">Building forensic database...</p>
        </div>

        {/* Progress section */}
        <div className="space-y-4">
          {/* Percentage */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-[#a1a19b] uppercase tracking-wider">Status</span>
            <span className="text-2xl font-semibold text-[#1f1f1f] font-mono tracking-tight">{loadingProgress}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-[#e8e8e4] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#1f1f1f] rounded-full transition-all duration-300" 
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>

          {/* Current step info */}
          <div className="pt-4 space-y-2 bg-white rounded-2xl p-4 border border-[#e8e8e4] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2">
              <Loader size={15} className="text-[#1f1f1f] animate-spin" />
              <span className="text-sm font-semibold text-[#1f1f1f]">{currentStep.label}</span>
            </div>
            <p className="text-xs text-[#a1a19b] ml-6">{currentStep.desc}</p>
          </div>
        </div>

        {/* Timeline steps */}
        <div className="space-y-2.5">
          {steps.map((step, idx) => {
            const isCompleted = loadingProgress >= step.progress;
            
            return (
              <div key={idx} className={`flex items-center gap-3 text-xs transition-all ${
                isCompleted ? 'opacity-100' : 'opacity-40'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${
                  isCompleted 
                    ? 'bg-[#1f1f1f]' 
                    : 'bg-[#d4d4cf]'
                }`} />
                <span className={`${isCompleted ? 'text-[#1f1f1f] font-medium' : 'text-[#a1a19b]'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Estimated time */}
        <div className="text-center text-xs text-[#a1a19b] font-mono">
          {loadingProgress < 100 ? 'Processing...' : 'Complete! Redirecting...'}
        </div>
      </div>
    </div>
  );
};

export default ProcessingView;
