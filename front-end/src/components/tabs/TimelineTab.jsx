import React, { useState, useEffect } from 'react';
import { FileText, Filter, RefreshCw, Clock, AlertCircle, Zap, Users, X } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const TimelineTab = ({ sessionId }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, filesProcessed: 0 });
  const [infoBanner, setInfoBanner] = useState(null);            // info text about auto-extraction
  const [filterEntity, setFilterEntity] = useState(null);        // currently filtered entity name
  const [knownActors, setKnownActors] = useState([]);            // unique actors across all events

  // Derive unique actors whenever full timeline changes
  const deriveActors = (events) => {
    const set = new Set();
    events.forEach(e => (e.actors || []).forEach(a => set.add(a)));
    setKnownActors([...set].sort());
  };

  // Fetch cached timeline on load
  const fetchTimeline = async () => {
    if (!sessionId) {
      setError('No session available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = filterEntity
        ? `${API_BASE}/sessions/${sessionId}/timeline?entity=${encodeURIComponent(filterEntity)}`
        : `${API_BASE}/sessions/${sessionId}/timeline`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Timeline endpoint not available');
      }
      const data = await response.json();

      if (data.timeline && data.timeline.length > 0) {
        const formattedTimeline = data.timeline.map((event, idx) => ({
          id: idx + 1,
          timestamp: event.timestamp || 'Unknown',
          event: event.event,
          type: event.type || 'info',
          sourceFile: event.source_file || 'Unknown',
          actors: event.actors || [],
          artifacts: event.artifacts || [],
          confidence: event.confidence || 'medium'
        }));
        setTimeline(formattedTimeline);
        setStats({ 
          total: data.total_events || formattedTimeline.length,
          filesProcessed: data.files_processed || 0
        });
        // Only rebuild actor list from the unfiltered set
        if (!filterEntity) deriveActors(formattedTimeline);
      } else {
        setTimeline([]);
        setStats({ total: 0, filesProcessed: 0 });
      }
    } catch (err) {
      console.error('Timeline fetch error:', err);
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  };

  // Extract new timeline from documents
  const extractTimeline = async () => {
    if (!sessionId) return;

    setExtracting(true);
    setError(null);
    setInfoBanner(null);
    setFilterEntity(null); // reset filter on fresh extraction

    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/extract-timeline`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to extract timeline');
      }
      
      const data = await response.json();

      // Show info banner if entities were auto-extracted
      if (data.entities_auto_extracted) {
        setInfoBanner('Entity graph was automatically generated to provide context for timeline extraction.');
      }

      if (data.success && data.timeline && data.timeline.length > 0) {
        const formattedTimeline = data.timeline.map((event, idx) => ({
          id: idx + 1,
          timestamp: event.timestamp || 'Unknown',
          event: event.event,
          type: event.type || 'info',
          sourceFile: event.source_file || 'Unknown',
          actors: event.actors || [],
          artifacts: event.artifacts || [],
          confidence: event.confidence || 'medium'
        }));
        setTimeline(formattedTimeline);
        setStats({ 
          total: data.total_events || formattedTimeline.length,
          filesProcessed: data.files_processed || 0
        });
        deriveActors(formattedTimeline);
      } else if (data.message) {
        setError(data.message);
        setTimeline([]);
      }
    } catch (err) {
      console.error('Timeline extraction error:', err);
      setError('Failed to extract timeline from documents');
    } finally {
      setExtracting(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchTimeline();
    }
  }, [sessionId, filterEntity]);

  // Show empty state when no timeline data
  if (timeline.length === 0 && !loading && !extracting) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-[13px] font-semibold text-[#71717a] uppercase tracking-wider">Incident Log (Local Time)</h3>
          <button 
            onClick={extractTimeline}
            disabled={extracting || !sessionId}
            className="text-xs bg-white hover:bg-[#f4f4f4] text-[#1f1f1f] px-3.5 py-2 rounded-xl border border-[#e8e8e4] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            {extracting ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
            {extracting ? 'Extracting...' : 'Extract Timeline from Evidence'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2 text-yellow-400 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        
        <div className="bg-white border border-[#e8e8e4] rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[400px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="p-4 rounded-2xl bg-[#f4f4f4] mb-4">
            <Clock size={44} className="text-[#d4d4cf]" />
          </div>
          <h3 className="text-[#71717a] font-medium text-lg mb-2">No Timeline Events</h3>
          <p className="text-[#a1a19b] text-sm max-w-md">
            Upload evidence files and click "Extract Timeline from Evidence" to automatically identify temporal events from your documents.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pl-4 md:pl-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-[13px] font-semibold text-[#71717a] uppercase tracking-wider">
            {filterEntity ? `Timeline — ${filterEntity}` : 'Incident Log (Local Time)'}
          </h3>
          <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full border border-emerald-200">
            {stats.total} events
          </span>
          {filterEntity && (
            <button
              onClick={() => setFilterEntity(null)}
              className="text-xs bg-purple-50 text-purple-600 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1 hover:bg-purple-100"
            >
              <X size={10} /> Clear filter
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={extractTimeline}
            disabled={extracting || !sessionId}
            className="text-xs bg-white hover:bg-[#f4f4f4] text-[#1f1f1f] px-3.5 py-2 rounded-xl border border-[#e8e8e4] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            {extracting ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <Zap size={12} />
            )}
            {extracting ? 'Extracting...' : 'Re-Extract Timeline'}
          </button>
          {/* Entity filter dropdown */}
          {knownActors.length > 0 && (
            <select
              value={filterEntity || ''}
              onChange={e => setFilterEntity(e.target.value || null)}
              className="text-xs bg-white hover:bg-[#f4f4f4] px-3.5 py-2 rounded-xl border border-[#e8e8e4] text-[#1f1f1f] appearance-none cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <option value="">All Entities</option>
              {knownActors.map(actor => (
                <option key={actor} value={actor}>{actor}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Info banner (e.g., entities auto-extracted) */}
      {infoBanner && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-blue-600 text-sm">
          <div className="flex items-center gap-2">
            <Users size={16} />
            {infoBanner}
          </div>
          <button onClick={() => setInfoBanner(null)} className="hover:text-blue-300">
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-600 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Loading State */}
      {(loading || extracting) && (
        <div className="bg-white border border-[#e8e8e4] rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[300px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <RefreshCw size={40} className="text-[#1f1f1f] animate-spin mb-4" />
          <h3 className="text-[#71717a] font-medium text-lg mb-2">
            {extracting ? 'Extracting Timeline Events...' : 'Loading Timeline...'}
          </h3>
          <p className="text-[#a1a19b] text-sm">
            {extracting ? 'Analyzing documents for temporal events using AI' : 'Fetching cached timeline data'}
          </p>
        </div>
      )}
      
      {!loading && !extracting && (
      <div className="relative">
        {/* Vertical Connector Line */}
        <div className="absolute top-3 bottom-8 w-px bg-[#e8e8e4] 
                        left-4 
                        md:left-42"></div>

        <div className="space-y-8">
          {timeline.map((item) => (
            <div key={item.id} className="relative pl-12 md:pl-0 md:flex group">
              
              {/* Date/Time Column */}
              <div className="mb-2 md:mb-0 md:w-36 md:text-right shrink-0 flex flex-col justify-start md:pt-1 md:pr-4">
                <span className="font-mono text-xs text-[#a1a19b] block">
                  {item.timestamp.split(' ')[0]}
                </span>
                <span className="font-mono text-sm font-semibold text-[#1f1f1f]">
                  {item.timestamp.split(' ')[1] || item.timestamp.split('T')[1]?.slice(0,8) || ''}
                </span>
              </div>

              {/* Dot Column - Centered on the Line */}
              <div className="absolute left-4 top-2 -translate-x-1/2 
                              md:relative md:left-auto md:top-auto md:translate-x-0
                              md:w-12 md:flex md:justify-center md:pt-2">
                 <div className={`w-3 h-3 rounded-full border-2 bg-white transition-all duration-300 group-hover:scale-125 z-10
                   ${item.type === 'critical' ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)] bg-red-50' : 
                     item.type === 'warning' ? 'border-amber-500 bg-amber-50' : 
                     item.type === 'success' ? 'border-emerald-500 bg-emerald-50' : 'border-[#1f1f1f] bg-[#1f1f1f]'}
                 `}></div>
              </div>

              {/* Content Column */}
              <div className="flex-1">
                <div className="bg-white p-4 rounded-2xl border border-[#e8e8e4] hover:border-[#d4d4cf] transition-all relative shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  {/* Triangle Pointer for Desktop */}
                  <div className="hidden md:block absolute top-3.5 -left-1.5 w-3 h-3 bg-white border-l border-b border-[#e8e8e4] transform rotate-45 group-hover:border-[#d4d4cf] transition-colors"></div>

                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase
                      ${item.type === 'critical' ? 'bg-red-500/10 text-red-400' : 
                        item.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400' : 
                        item.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                        'bg-blue-500/10 text-blue-400'}
                    `}>{item.type}</span>
                    {/* Confidence Badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded
                      ${item.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-400' : 
                        item.confidence === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-zinc-700/50 text-zinc-400'}
                    `}>
                      {item.confidence} confidence
                    </span>
                  </div>
                  
                  <p className="text-[#1f1f1f] font-medium text-lg mb-2">{item.event}</p>
                  
                  {/* Show actors if available */}
                  {item.actors && item.actors.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {item.actors.map((actor, i) => (
                        <span key={i} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-lg border border-purple-200">
                          {actor}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Show artifacts if available */}
                  {item.artifacts && item.artifacts.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {item.artifacts.map((artifact, i) => (
                        <span key={i} className="text-xs font-mono bg-[#f4f4f4] text-[#1f1f1f] px-2 py-0.5 rounded-lg border border-[#e8e8e4]">
                          {artifact}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs text-[#a1a19b] bg-[#f6f7ed] p-2 rounded-xl border border-[#e8e8e4]">
                     <FileText size={12} className="text-[#71717a]"/>
                     <span className="font-mono">Source: {item.sourceFile}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
};

export default TimelineTab;
