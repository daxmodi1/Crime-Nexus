import React, { useState, useEffect } from 'react';
import { FileText, Filter, RefreshCw, Clock, AlertCircle, Zap, Users, X, GripVertical } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const TimelineTab = ({ sessionId, isNotesOpen, highlightTarget }) => {
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

  useEffect(() => {
    if (highlightTarget && highlightTarget.type === 'timeline_event' && timeline.length > 0) {
      const elementId = `timeline-${highlightTarget.timestamp}-${highlightTarget.title}`.replace(/[^a-zA-Z0-9_-]/g, '');
      const el = document.getElementById(elementId);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-yellow-400', 'ring-opacity-50');
          setTimeout(() => el.classList.remove('ring-4', 'ring-yellow-400', 'ring-opacity-50'), 3000);
        }, 100);
      }
    }
  }, [highlightTarget, timeline]);

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
          {timeline.map((item, idx) => (
            <div 
              key={item.id} 
              className="relative pl-12 md:pl-0 md:flex group rounded-2xl transition-all duration-700 ease-out animate-fade-in-up" 
              style={{ animationDelay: `${idx * 100}ms` }}
              id={`timeline-${item.timestamp}-${item.event}`.replace(/[^a-zA-Z0-9_-]/g, '')}
            >
              
              {/* Date/Time Column */}
              <div className="mb-2 md:mb-0 md:w-36 md:text-right shrink-0 flex flex-col justify-start md:pt-2 md:pr-6">
                <span className="font-mono text-[11px] uppercase tracking-widest text-[#a1a19b] block mb-1">
                  {item.timestamp.split(' ')[0]}
                </span>
                <span className="font-mono text-base font-bold bg-clip-text text-transparent bg-gradient-to-br from-[#1f1f1f] to-[#71717a]">
                  {item.timestamp.split(' ')[1] || item.timestamp.split('T')[1]?.slice(0,8) || ''}
                </span>
              </div>

              {/* Dot Column - Centered on the Line */}
              <div className="absolute left-4 top-3 -translate-x-1/2 
                              md:relative md:left-auto md:top-auto md:translate-x-0
                              md:w-12 md:flex md:justify-center md:pt-3 z-10">
                 <div className="relative">
                   <div className={`w-3.5 h-3.5 rounded-full border-2 bg-white transition-all duration-500 group-hover:scale-150 z-20 relative
                     ${item.type === 'critical' ? 'border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]' : 
                       item.type === 'warning' ? 'border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]' : 
                       item.type === 'success' ? 'border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 
                       'border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]'}
                   `}></div>
                   {/* Glowing pulse behind the dot */}
                   <div className={`absolute inset-0 rounded-full animate-ping opacity-75
                     ${item.type === 'critical' ? 'bg-red-400' : 
                       item.type === 'warning' ? 'bg-amber-400' : 
                       item.type === 'success' ? 'bg-emerald-400' : 
                       'bg-blue-400'}
                   `}></div>
                 </div>
              </div>

              {/* Content Column */}
              <div className="flex-1">
                <div 
                  className={`relative p-5 rounded-2xl transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-white border border-[#e8e8e4] overflow-hidden ${isNotesOpen ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  draggable={isNotesOpen}
                  onDragStart={(e) => {
                    if (!isNotesOpen) return;
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'timeline_event',
                      title: item.event,
                      timestamp: item.timestamp,
                      source: item.sourceFile
                    }));
                  }}
                >
                  {/* Subtle Gradient Overlay */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-br from-transparent to-white/50 ${
                     item.type === 'critical' ? 'via-red-50/30' : 
                     item.type === 'warning' ? 'via-amber-50/30' : 
                     item.type === 'success' ? 'via-emerald-50/30' : 
                     'via-blue-50/30'
                  }`}></div>

                  {isNotesOpen && (
                    <div className="absolute top-4 right-4 text-[#d4d4cf] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                      <GripVertical size={16} />
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm backdrop-blur-md
                      ${item.type === 'critical' ? 'bg-red-500 text-white border border-red-600/20' : 
                        item.type === 'warning' ? 'bg-amber-500 text-white border border-amber-600/20' : 
                        item.type === 'success' ? 'bg-emerald-500 text-white border border-emerald-600/20' :
                        'bg-blue-500 text-white border border-blue-600/20'}
                    `}>{item.type}</span>
                    
                    {/* Confidence Badge */}
                    <span className={`text-[10px] px-2.5 py-1 rounded-md font-medium border backdrop-blur-md
                      ${item.confidence === 'high' ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200' : 
                        item.confidence === 'medium' ? 'bg-amber-50/80 text-amber-700 border-amber-200' :
                        'bg-zinc-50/80 text-zinc-700 border-zinc-200'}
                    `}>
                      {item.confidence} confidence
                    </span>
                  </div>
                  
                  <p className="text-[#1f1f1f] font-semibold text-[17px] leading-relaxed mb-4 relative z-10 group-hover:text-blue-900 transition-colors duration-300">
                    {item.event}
                  </p>
                  
                  <div className="space-y-3 relative z-10">
                    {/* Show actors if available */}
                    {item.actors && item.actors.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <Users size={12} className="text-purple-400 mr-1" />
                        {item.actors.map((actor, i) => (
                          <span key={i} className="text-xs bg-gradient-to-r from-purple-50 to-fuchsia-50 text-purple-700 px-2.5 py-1 rounded-md border border-purple-100 font-medium hover:scale-105 transition-transform cursor-default shadow-sm">
                            {actor}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Show artifacts if available */}
                    {item.artifacts && item.artifacts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <Zap size={12} className="text-[#a1a19b] mr-1" />
                        {item.artifacts.map((artifact, i) => (
                          <span key={i} className="text-xs font-mono bg-[#f4f4f4] text-[#3a3a3a] px-2.5 py-1 rounded-md border border-[#e8e8e4] hover:bg-white hover:shadow-sm transition-all cursor-default">
                            {artifact}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex items-center gap-2 text-[11px] text-[#a1a19b] bg-[#fafafa] p-2.5 rounded-lg border border-[#e8e8e4] group-hover:border-blue-200 group-hover:bg-blue-50/50 transition-colors relative z-10">
                     <FileText size={12} className="text-[#71717a] group-hover:text-blue-500 transition-colors"/>
                     <span className="font-mono truncate">Evidence Source: <span className="text-[#3a3a3a] group-hover:text-blue-700 font-medium">{item.sourceFile}</span></span>
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
