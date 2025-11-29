import React from 'react';
import { FileText, Filter } from 'lucide-react';
import { MOCK_TIMELINE } from '../../data/mockData';

const TimelineTab = () => {
  return (
    <div className="max-w-4xl mx-auto pl-4 md:pl-0">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-mono text-zinc-500">INCIDENT LOG (LOCAL TIME)</h3>
        <button className="text-xs bg-zinc-900 hover:bg-zinc-800 px-3 py-1 rounded border border-zinc-800 flex items-center gap-2">
          <Filter size={12} /> Filter Log
        </button>
      </div>
      
      <div className="relative">
        {/* Vertical Connector Line */}
        <div className="absolute top-3 bottom-8 w-px bg-zinc-800 
                        left-4 
                        md:left-42"></div>

        <div className="space-y-8">
          {MOCK_TIMELINE.map((item, idx) => (
            <div key={item.id} className="relative pl-12 md:pl-0 md:flex group">
              
              {/* Date/Time Column */}
              <div className="mb-2 md:mb-0 md:w-36 md:text-right shrink-0 flex flex-col justify-start md:pt-1 md:pr-4">
                <span className="font-mono text-xs text-zinc-500 block">{item.timestamp.split(' ')[0]}</span>
                <span className="font-mono text-sm font-bold text-zinc-300">{item.timestamp.split(' ')[1]}</span>
              </div>

              {/* Dot Column - Centered on the Line */}
              <div className="absolute left-4 top-2 -translate-x-1/2 
                              md:relative md:left-auto md:top-auto md:translate-x-0
                              md:w-12 md:flex md:justify-center md:pt-2">
                 <div className={`w-3 h-3 rounded-full border-2 bg-zinc-950 transition-all duration-300 group-hover:scale-125 z-10
                   ${item.type === 'critical' ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] bg-red-500/20' : 
                     item.type === 'warning' ? 'border-yellow-500 bg-yellow-500/20' : 
                     item.type === 'success' ? 'border-emerald-500 bg-emerald-500/20' : 'border-blue-500 bg-blue-500/20'}
                 `}></div>
              </div>

              {/* Content Column */}
              <div className="flex-1">
                <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50 hover:border-cyan-500/30 transition-all relative">
                  {/* Triangle Pointer for Desktop */}
                  <div className="hidden md:block absolute top-3.5 -left-1.5 w-3 h-3 bg-zinc-900 border-l border-b border-zinc-800/50 transform rotate-45 group-hover:border-cyan-500/30 transition-colors"></div>

                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider
                      ${item.type === 'critical' ? 'bg-red-500/10 text-red-400' : 
                        item.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400' : 
                        'bg-blue-500/10 text-blue-400'}
                    `}>{item.type}</span>
                  </div>
                  
                  <p className="text-zinc-100 font-medium text-lg mb-2">{item.event}</p>
                  
                  <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
                     <FileText size={12} className="text-cyan-500"/>
                     <span className="font-mono">Source: {item.sourceFile}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimelineTab;
