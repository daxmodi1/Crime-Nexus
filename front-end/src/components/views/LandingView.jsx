import React from 'react';
import { FolderOpen, Dna, Briefcase, Trash2 } from 'lucide-react';

const LandingView = ({ savedCases, onUpload, onOpenCase, onDeleteCase }) => {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-900 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-900 rounded-full blur-[128px]"></div>
      </div>

      <div className="z-10 text-center space-y-8 max-w-4xl w-full">
        <div className="flex flex-col items-center gap-4 animate-fade-in-up">
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-sm">
            <Dna size={64} className="text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-linear-to-r from-zinc-100 to-zinc-500 tracking-tighter">
            CRIME<span className="text-cyan-500">NEXUS</span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-lg mx-auto">
            AI-Augmented Crime Scene Investigation. Process evidence, correlate suspects, and reconstruct events.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Upload Section */}
          <div 
            className="w-full h-80 border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-4 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-cyan-500/50 transition-all cursor-pointer group backdrop-blur-sm relative overflow-hidden"
            onClick={onUpload}
          >
            <div className="absolute inset-0 bg-linear-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
            <div className="p-4 rounded-full bg-zinc-800 group-hover:scale-110 transition-transform duration-300 relative z-10">
              <FolderOpen size={32} className="text-zinc-400 group-hover:text-cyan-400" />
            </div>
            <div className="text-center relative z-10">
              <p className="text-zinc-200 font-medium text-lg">New Investigation</p>
              <p className="text-zinc-500 text-sm mt-1">Load Case Folder / Evidence Dump</p>
            </div>
          </div>

          {/* Existing Cases Section */}
          <div className="w-full h-80 border border-zinc-800 rounded-3xl flex flex-col bg-zinc-900/20 backdrop-blur-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-2">
              <Briefcase size={18} className="text-zinc-400"/>
              <span className="text-zinc-300 font-medium">Recent Cases</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800">
              {savedCases.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2">
                  <Briefcase size={24} className="opacity-50"/>
                  <span className="text-sm">No recent cases found</span>
                </div>
              ) : (
                savedCases.map((c) => (
                  <div 
                    key={c.id} 
                    onClick={() => onOpenCase(c)}
                    className="group p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-800/80 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-cyan-500">{c.id}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          c.status === 'Open' ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-zinc-700 text-zinc-500 bg-zinc-800'
                        }`}>{c.status}</span>
                      </div>
                      <h4 className="text-sm font-medium text-zinc-200 group-hover:text-cyan-400 transition-colors">{c.title}</h4>
                      <span className="text-xs text-zinc-500">{c.date}</span>
                    </div>
                    <button 
                      onClick={(e) => onDeleteCase(e, c.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-colors"
                      title="Delete Case Archive"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4 text-xs text-zinc-600 font-mono">
          <span>v3.2.0-CSI</span>
          <span>•</span>
          <span>SECURE STORAGE</span>
          <span>•</span>
          <span>LOCAL ACCESS ONLY</span>
        </div>
      </div>
    </div>
  );
};

export default LandingView;
