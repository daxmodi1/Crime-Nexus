import React, { useState, useEffect } from 'react';
import { FileText, Filter, RefreshCw, Clock, AlertCircle } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const TimelineTab = ({ sessionId }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTimeline = async () => {
    if (!sessionId) {
      setError('No session available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/timeline`);
      if (!response.ok) {
        throw new Error('Timeline endpoint not available');
      }
      const data = await response.json();

      if (data.timeline && data.timeline.length > 0) {
        // Transform API data to match our UI format
        const formattedTimeline = data.timeline.map((event, idx) => ({
          id: idx + 1,
          timestamp: event.timestamp || 'Unknown',
          event: event.event,
          type: event.type || 'info',
          sourceFile: event.source_file || 'Unknown',
          actors: event.actors || [],
          artifacts: event.artifacts || []
        }));
        setTimeline(formattedTimeline);
      } else {
        setTimeline([]);
      }
    } catch (err) {
      console.error('Timeline fetch error:', err);
      setError('Timeline reconstruction not yet available. Use the AI Assistant to analyze temporal events in your evidence.');
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  };

  // Empty state - no data initially
  useEffect(() => {
    setTimeline([]);
  }, [sessionId]);

  // Show empty state when no timeline data
  if (timeline.length === 0 && !loading && !error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-mono text-zinc-500">INCIDENT LOG (LOCAL TIME)</h3>
          <button 
            onClick={fetchTimeline}
            disabled={loading || !sessionId}
            className="text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded border border-cyan-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Clock size={12} />
            Reconstruct Timeline
          </button>
        </div>
        
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
          <div className="p-4 rounded-full bg-zinc-800/50 mb-4">
            <Clock size={48} className="text-zinc-600" />
          </div>
          <h3 className="text-zinc-400 font-medium text-lg mb-2">No Timeline Events</h3>
          <p className="text-zinc-500 text-sm max-w-md">
            Upload evidence files and click "Reconstruct Timeline" to automatically extract temporal events, or ask the AI Assistant about the sequence of events.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pl-4 md:pl-0">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-mono text-zinc-500">INCIDENT LOG (LOCAL TIME)</h3>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchTimeline}
            disabled={loading || !sessionId}
            className="text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded border border-cyan-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <Clock size={12} />
            )}
            {loading ? 'Reconstructing...' : 'Reconstruct Timeline'}
          </button>
          <button className="text-xs bg-zinc-900 hover:bg-zinc-800 px-3 py-1 rounded border border-zinc-800 flex items-center gap-2">
            <Filter size={12} /> Filter Log
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2 text-yellow-400 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      
      <div className="relative">
        {/* Vertical Connector Line */}
        <div className="absolute top-3 bottom-8 w-px bg-zinc-800 
                        left-4 
                        md:left-42"></div>

        <div className="space-y-8">
          {timeline.map((item, idx) => (
            <div key={item.id} className="relative pl-12 md:pl-0 md:flex group">
              
              {/* Date/Time Column */}
              <div className="mb-2 md:mb-0 md:w-36 md:text-right shrink-0 flex flex-col justify-start md:pt-1 md:pr-4">
                <span className="font-mono text-xs text-zinc-500 block">
                  {item.timestamp.split(' ')[0]}
                </span>
                <span className="font-mono text-sm font-bold text-zinc-300">
                  {item.timestamp.split(' ')[1] || item.timestamp.split('T')[1]?.slice(0,8) || ''}
                </span>
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
                        item.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                        'bg-blue-500/10 text-blue-400'}
                    `}>{item.type}</span>
                  </div>
                  
                  <p className="text-zinc-100 font-medium text-lg mb-2">{item.event}</p>
                  
                  {/* Show actors if available */}
                  {item.actors && item.actors.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {item.actors.map((actor, i) => (
                        <span key={i} className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded">
                          {actor}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Show artifacts if available */}
                  {item.artifacts && item.artifacts.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {item.artifacts.map((artifact, i) => (
                        <span key={i} className="text-xs font-mono bg-zinc-800 text-cyan-400 px-2 py-0.5 rounded">
                          {artifact}
                        </span>
                      ))}
                    </div>
                  )}
                  
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
