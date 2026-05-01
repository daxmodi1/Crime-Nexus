import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Users, RefreshCw, Network, List, AlertCircle, Scan, AlertTriangle, ShieldAlert, ChevronDown, ChevronUp, Flag, X, Clock, FileText } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import { extractEntities, getSessionGraph, getAnomalies, getEntityTimeline } from '../../utils/api';

/* ── Severity style helpers ── */
const severityConfig = {
  critical: { bg: 'bg-red-50',         border: 'border-red-200',        text: 'text-red-600',    barColor: 'bg-red-500',      icon: ShieldAlert },
  high:     { bg: 'bg-orange-50',      border: 'border-orange-200',     text: 'text-orange-600', barColor: 'bg-orange-500',   icon: ShieldAlert },
  moderate: { bg: 'bg-amber-50',       border: 'border-amber-200',      text: 'text-amber-600',  barColor: 'bg-amber-500',    icon: AlertTriangle },
  low:      { bg: 'bg-emerald-50',     border: 'border-emerald-200',    text: 'text-emerald-600',barColor: 'bg-emerald-500',  icon: Flag },
  normal:   { bg: 'bg-[#f4f4f4]',      border: 'border-[#e8e8e4]',      text: 'text-[#71717a]',  barColor: 'bg-[#a1a19b]',    icon: Flag },
};

const getSeverityStyle = (severity) => severityConfig[severity] || severityConfig.normal;


/* ── EntityCard (list-view) ── */
const EntityCard = ({ entity, relationships, getNodeColor, onViewTimeline, timelineData }) => {
  const [expanded, setExpanded] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const anomaly   = entity.anomaly || { score: 0, severity: 'normal', triggered_flags: [], summary: '' };
  const style     = getSeverityStyle(anomaly.severity);
  const IconComp  = style.icon;

  const handleTimelineClick = () => {
    if (!showTimeline && onViewTimeline) {
      onViewTimeline(entity.name);
    }
    setShowTimeline(prev => !prev);
  };

  const tl = timelineData || { loading: false, error: null, events: [] };

  return (
    <div className="bg-white border border-[#e8e8e4] rounded-2xl hover:bg-[#f6f7ed] hover:border-[#d4d4cf] transition-all overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* ── Top section ── */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
              style={{ backgroundColor: getNodeColor(entity) + '30', color: getNodeColor(entity) }}
            >
              {entity.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h3 className="text-[#1f1f1f] font-medium">{entity.name}</h3>
              <span
                className="text-xs px-2 py-0.5 rounded capitalize"
                style={{ backgroundColor: getNodeColor(entity) + '20', color: getNodeColor(entity) }}
              >
                {entity.type || 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Anomaly score badge ── */}
        <button
          onClick={() => setExpanded(prev => !prev)}
          className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded border text-xs font-mono cursor-pointer transition-colors ${style.bg} ${style.border} ${style.text}`}
        >
          <div className="flex items-center gap-1.5">
            <IconComp size={12} />
            <span>Anomaly: {anomaly.score}/100</span>
            <span className="capitalize opacity-75">({anomaly.severity})</span>
          </div>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {/* ── Expandable anomaly details ── */}
        {expanded && (
          <div className={`mt-2 rounded border p-3 text-xs space-y-2 ${style.bg} ${style.border}`}>
            {/* Score bar */}
            <div>
              <div className="flex justify-between text-[#a1a19b] mb-1">
                <span>Score</span>
                <span className={style.text}>{anomaly.score}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#e8e8e4] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${style.barColor}`}
                  style={{ width: `${anomaly.score}%` }}
                />
              </div>
            </div>

            {/* Triggered flags */}
            {anomaly.triggered_flags?.length > 0 && (
              <div>
                <div className="text-[#a1a19b] mb-1">Triggered Flags</div>
                <ul className="space-y-1">
                  {anomaly.triggered_flags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[#3a3a3a]">
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${style.barColor}`} />
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary */}
            {anomaly.summary && (
              <div>
                <div className="text-[#a1a19b] mb-1">Summary</div>
                <p className="text-[#3a3a3a] leading-relaxed">{anomaly.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Description ── */}
        {entity.description && (
          <p className="text-[#71717a] text-sm mt-3">{entity.description}</p>
        )}
      </div>

      {/* ── Relationships ── */}
      {relationships.length > 0 && (
        <div className="border-t border-[#e8e8e4] px-5 py-3">
          <div className="text-xs text-[#a1a19b] mb-2">Relationships</div>
          <div className="flex flex-wrap gap-1">
            {relationships.map((rel, i) => (
              <span key={i} className="text-xs bg-[#f4f4f4] text-[#3a3a3a] px-2 py-1 rounded-lg border border-[#e8e8e4]">
                {rel.relationship} → {typeof rel.target === 'string' ? rel.target : rel.target?.id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── View Timeline button ── */}
      <div className="border-t border-[#e8e8e4] px-5 py-3">
        <button
          onClick={handleTimelineClick}
          className="w-full text-xs flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#e8e8e4] bg-white hover:bg-[#f4f4f4] text-[#1f1f1f] transition-colors"
        >
          <Clock size={12} />
          {showTimeline ? 'Hide Timeline' : 'View Timeline'}
        </button>
      </div>

      {/* ── Inline timeline panel ── */}
      {showTimeline && (
        <div className="border-t border-[#e8e8e4] px-4 py-3 max-h-72 overflow-y-auto space-y-2 bg-[#f6f7ed]/50">
          {tl.loading && (
            <div className="flex items-center justify-center py-4 gap-2 text-[#a1a19b] text-xs">
              <RefreshCw size={12} className="animate-spin" /> Loading timeline...
            </div>
          )}
          {tl.error && (
            <div className="text-xs text-amber-600 text-center py-3">{tl.error}</div>
          )}
          {!tl.loading && !tl.error && tl.events.length === 0 && (
            <div className="text-xs text-[#a1a19b] text-center py-3">No timeline events for this entity.</div>
          )}
          {!tl.loading && tl.events.length > 0 && (
            <>
              <div className="text-[10px] text-[#a1a19b] font-mono">{tl.events.length} event{tl.events.length !== 1 ? 's' : ''}</div>
              {tl.events.map((item, i) => (
                <div key={i} className="bg-white border border-[#e8e8e4] rounded-xl p-2.5 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase
                      ${item.type === 'critical' ? 'bg-red-500/10 text-red-400' :
                        item.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                        item.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                        'bg-blue-500/10 text-blue-400'}
                    `}>{item.type}</span>
                    <span className="text-[10px] font-mono text-[#a1a19b]">{item.timestamp}</span>
                  </div>
                  <p className="text-[#1f1f1f] leading-relaxed mb-1">{item.event}</p>
                  {item.actors && item.actors.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.actors.map((a, j) => (
                        <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded ${
                          a.toLowerCase() === entity.name?.toLowerCase()
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                            : 'bg-purple-500/10 text-purple-400'
                        }`}>{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};


const PeopleTab = ({ sessionId }) => {
  const [graphData,        setGraphData]        = useState({ nodes: [], links: [] });
  const [loading,          setLoading]          = useState(false);
  const [extracting,       setExtracting]       = useState(false);
  const [error,            setError]            = useState(null);
  const [viewMode,         setViewMode]         = useState('graph'); // 'graph' or 'list'
  const [personAnomalyMap, setPersonAnomalyMap] = useState({});      // personName.lower -> {score, severity}
  const graphRef = useRef();
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const resizeObserverRef = useRef(null);

  // Entity timeline side-panel state (graph view)
  const [selectedNode, setSelectedNode]           = useState(null);   // node object
  const [entityTimeline, setEntityTimeline]       = useState([]);     // filtered events
  const [entityTimelineLoading, setEntityTimelineLoading] = useState(false);
  const [entityTimelineError, setEntityTimelineError]     = useState(null);

  // Entity timeline state for list view – keyed by entity name
  const [listTimelines, setListTimelines] = useState({});

  // Called when user clicks a node in the graph
  const handleNodeClick = useCallback(async (node) => {
    if (!sessionId || !node) return;
    setSelectedNode(node);
    setEntityTimeline([]);
    setEntityTimelineLoading(true);
    setEntityTimelineError(null);

    try {
      const data = await getEntityTimeline(sessionId, node.name);
      if (data.timeline && data.timeline.length > 0) {
        setEntityTimeline(data.timeline.map((evt, i) => ({
          id: i + 1,
          timestamp: evt.timestamp || 'Unknown',
          event: evt.event,
          type: evt.type || 'info',
          sourceFile: evt.source_file || 'Unknown',
          actors: evt.actors || [],
          artifacts: evt.artifacts || [],
          confidence: evt.confidence || 'medium',
        })));
      } else {
        setEntityTimeline([]);
      }
    } catch (err) {
      console.error('Entity timeline error:', err);
      setEntityTimelineError('Timeline not yet extracted. Generate a timeline first from the Timeline tab.');
    } finally {
      setEntityTimelineLoading(false);
    }
  }, [sessionId]);

  // Called when user clicks "View Timeline" on an EntityCard in list view
  const handleListViewTimeline = useCallback(async (entityName) => {
    if (!sessionId || !entityName) return;
    // Mark loading for this specific entity
    setListTimelines(prev => ({
      ...prev,
      [entityName]: { loading: true, error: null, events: [] }
    }));
    try {
      const data = await getEntityTimeline(sessionId, entityName);
      const events = (data.timeline || []).map((evt, i) => ({
        id: i + 1,
        timestamp: evt.timestamp || 'Unknown',
        event: evt.event,
        type: evt.type || 'info',
        actors: evt.actors || [],
      }));
      setListTimelines(prev => ({
        ...prev,
        [entityName]: { loading: false, error: null, events }
      }));
    } catch (err) {
      console.error('List-view entity timeline error:', err);
      setListTimelines(prev => ({
        ...prev,
        [entityName]: { loading: false, error: 'Timeline not yet extracted. Generate a timeline first.', events: [] }
      }));
    }
  }, [sessionId]);

  const containerRef = useCallback(node => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
    if (!node) return;
    const { width, height } = node.getBoundingClientRect();
    setContainerSize({ width, height });
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(node);
    resizeObserverRef.current = observer;
  }, []);

  const fetchGraphData = useCallback(async () => {
    if (!sessionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const graphRes = await getSessionGraph(sessionId);
      
      if (graphRes.nodes && graphRes.edges) {
        // Transform to react-force-graph format
        const nodes = graphRes.nodes.map(n => ({
          id: n.id,
          name: n.name,
          type: n.type,
          description: n.description,
          anomaly: n.anomaly || null,
          val: n.type === 'person' ? 10 : 6 // Size nodes by type
        }));
        
        const links = graphRes.edges.map(e => ({
          source: e.source,
          target: e.target,
          relationship: e.relationship
        }));
        
        setGraphData({ nodes, links });
      }
    } catch (err) {
      console.error('Error fetching graph data:', err);
      setError('Failed to load graph data');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Fetch cached anomaly data to colour nodes and decorate cards
  useEffect(() => {
    if (!sessionId) return;
    setPersonAnomalyMap({});

    const fetchPersonAnomalies = async () => {
      try {
        const data = await getAnomalies(sessionId);
        if (data.cached && data.person_anomalies?.length > 0) {
          const map = {};
          data.person_anomalies.forEach(p => {
            map[p.person_name.toLowerCase()] = { score: p.anomaly_score, severity: p.severity };
          });
          setPersonAnomalyMap(map);
        }
      } catch {
        // silently skip — anomaly tab will show hint to run detection
      }
    };

    fetchPersonAnomalies();
  }, [sessionId]);

  const handleExtractEntities = async () => {
    if (!sessionId) return;
    
    setExtracting(true);
    setError(null);
    
    try {
      const result = await extractEntities(sessionId);
      
      if (result.success) {
        // Refresh the data after extraction
        await fetchGraphData();
      } else {
        setError(result.message || 'Extraction failed');
      }
    } catch (err) {
      console.error('Extraction error:', err);
      setError('Failed to extract entities from evidence');
    } finally {
      setExtracting(false);
    }
  };

  // Node color based on type
  const getNodeColor = (node) => {
    const anomalyInfo = node.anomaly || personAnomalyMap[node.name?.toLowerCase()];
    if (anomalyInfo?.severity === 'critical' || anomalyInfo?.severity === 'high') return '#ef4444';
    if (anomalyInfo?.severity === 'moderate') return '#f59e0b';

    const typeColors = {
      person: '#3b82f6',       // blue
      organization: '#8b5cf6', // purple
      location: '#10b981',     // green
      event: '#f59e0b',        // amber
      vehicle: '#06b6d4',      // cyan
      weapon: '#ef4444',       // red
      document: '#6b7280',     // gray
      evidence: '#6b7280',     // gray
      phone: '#ec4899',        // pink
      email: '#84cc16',        // lime
      account: '#f97316',      // orange
      device: '#14b8a6',       // teal
      date: '#a855f7',         // purple
      money: '#eab308',        // yellow
      unknown: '#71717a'       // zinc
    };
    
    return typeColors[node.type?.toLowerCase()] || typeColors.unknown;
  };

  // Empty state - no session
  if (!sessionId) {
    return (
      <div className="bg-white border border-[#e8e8e4] rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[500px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="p-4 rounded-2xl bg-[#f4f4f4] mb-4">
          <Users size={44} className="text-[#d4d4cf]" />
        </div>
        <h3 className="text-[#71717a] font-medium text-lg mb-2">No Session Active</h3>
        <p className="text-[#a1a19b] text-sm max-w-md">
          Open a case to view and extract entities from evidence.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-[13px] font-semibold text-[#71717a] uppercase tracking-wider">Knowledge Graph</h3>
          <span className="text-xs bg-[#f4f4f4] px-2.5 py-0.5 rounded-full text-[#71717a] border border-[#e8e8e4]">
            {graphData.nodes.length} entities, {graphData.links.length} relationships
          </span>
        </div>
        
        <div className="flex gap-2">
          {/* Extract Entities Button */}
          <button 
            onClick={handleExtractEntities}
            disabled={extracting}
            className="text-xs bg-white hover:bg-[#f4f4f4] text-[#1f1f1f] px-3.5 py-2 rounded-xl border border-[#e8e8e4] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            {extracting ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <Scan size={12} />
            )}
            {extracting ? 'Extracting...' : 'Extract from Evidence'}
          </button>
          
          {/* Refresh Button */}
          <button 
            onClick={fetchGraphData}
            disabled={loading}
            className="text-xs bg-white hover:bg-[#f4f4f4] text-[#1f1f1f] px-3.5 py-2 rounded-xl border border-[#e8e8e4] flex items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          
          {/* View Toggle */}
          <div className="flex bg-[#f4f4f4] rounded-xl border border-[#e8e8e4]">
            <button 
              onClick={() => setViewMode('graph')}
              className={`px-3.5 py-2 text-xs flex items-center gap-1 rounded-xl transition-all border-0 ${viewMode === 'graph' ? 'bg-[#1f1f1f] text-white shadow-sm' : 'text-[#71717a] bg-transparent'}`}
            >
              <Network size={12} /> Graph
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`px-3.5 py-2 text-xs flex items-center gap-1 rounded-xl transition-all border-0 ${viewMode === 'list' ? 'bg-[#1f1f1f] text-white shadow-sm' : 'text-[#71717a] bg-transparent'}`}
            >
              <List size={12} /> List
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white border border-[#e8e8e4] rounded-2xl p-12 flex items-center justify-center min-h-[500px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw size={28} className="text-[#1f1f1f] animate-spin" />
            <span className="text-[#a1a19b]">Loading graph data...</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && graphData.nodes.length === 0 && (
        <div className="bg-white border border-[#e8e8e4] rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[500px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="p-4 rounded-2xl bg-[#f4f4f4] mb-4">
            <Network size={44} className="text-[#d4d4cf]" />
          </div>
          <h3 className="text-[#71717a] font-medium text-lg mb-2">No Entities Extracted</h3>
          <p className="text-[#a1a19b] text-sm max-w-md mb-6">
            Click "Extract from Evidence" to use AI to automatically identify people, organizations, locations, and relationships from your documents.
          </p>
          <button 
            onClick={handleExtractEntities}
            disabled={extracting}
            className="bg-[#1f1f1f] hover:bg-[#3a3a3a] text-white px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50 border-0"
          >
            {extracting ? <RefreshCw size={14} className="animate-spin" /> : <Scan size={14} />}
            {extracting ? 'Extracting...' : 'Extract Entities from Evidence'}
          </button>
        </div>
      )}

      {/* Graph View */}
      {!loading && graphData.nodes.length > 0 && viewMode === 'graph' && (
        <div className="flex gap-0 relative">
          {/* Graph container — shrinks when panel is open */}
          <div
            ref={containerRef}
            className="bg-white border border-[#e8e8e4] rounded-2xl overflow-hidden relative transition-all duration-300 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            style={{ height: '600px', width: selectedNode ? '55%' : '100%' }}
          >
          <ForceGraph2D
            ref={graphRef}
            width={containerSize.width}
            height={containerSize.height}
            graphData={graphData}
            nodeLabel={node => `${node.name}${node.description ? `\n${node.description}` : ''}`}
            nodeColor={getNodeColor}
            nodeRelSize={6}
            onNodeClick={handleNodeClick}
            linkLabel={link => link.relationship}
            linkColor={() => '#d4d4cf'}
            linkWidth={1.5}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            backgroundColor="#ffffff"
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label      = node.name;
              const fontSize   = 12 / globalScale;
              const nodeRadius = node.val || 5;
              ctx.font = `${fontSize}px Sans-Serif`;

              // Selected node highlight ring
              if (selectedNode && node.id === selectedNode.id) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeRadius + 7, 0, 2 * Math.PI, false);
                ctx.strokeStyle = 'rgba(31, 31, 31, 0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
              }

              // Draw anomaly glow ring based on entity's own anomaly score
              const sev = node.anomaly?.severity;
              if (sev && sev !== 'normal' && sev !== 'low') {
                const ringColor = (sev === 'high' || sev === 'critical')
                  ? 'rgba(239, 68, 68, 0.55)'    // red glow
                  : 'rgba(245, 158, 11, 0.45)';   // amber glow
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeRadius + 5, 0, 2 * Math.PI, false);
                ctx.fillStyle = ringColor;
                ctx.fill();
              }

              // Draw node circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
              ctx.fillStyle = getNodeColor(node);
              ctx.fill();

              // Draw label below node
              ctx.textAlign    = 'center';
              ctx.textBaseline = 'top';
              ctx.fillStyle    = '#1f1f1f';
              ctx.fillText(label, node.x, node.y + nodeRadius + 2);
            }}
            nodePointerAreaPaint={(node, color, ctx) => {
              const nodeRadius = node.val || 5;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeRadius + 5, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
          />
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/95 border border-[#e8e8e4] rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="text-xs text-[#a1a19b] mb-2 font-medium">Entity Types</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-[#71717a]">Person</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                <span className="text-[#71717a]">Organization</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-[#71717a]">Location</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-[#71717a]">Event</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                <span className="text-[#71717a]">Vehicle</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-[#71717a]">Weapon</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                <span className="text-[#71717a]">Document</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-pink-500"></span>
                <span className="text-[#71717a]">Phone</span>
              </div>
            </div>
          </div>
          </div>

          {/* ── Entity Timeline Side Panel ── */}
          {selectedNode && (
            <div className="w-[45%] bg-white border border-[#e8e8e4] rounded-2xl ml-2 overflow-hidden flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ height: '600px' }}>
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e8e4] shrink-0">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: getNodeColor(selectedNode) + '30', color: getNodeColor(selectedNode) }}
                  >
                    {selectedNode.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h4 className="text-[#1f1f1f] text-sm font-medium leading-tight">{selectedNode.name}</h4>
                    <span className="text-[10px] text-[#a1a19b] capitalize">{selectedNode.type} timeline</span>
                  </div>
                </div>
                <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-[#f4f4f4] rounded-lg text-[#a1a19b] hover:text-[#1f1f1f] border-0 bg-transparent">
                  <X size={16} />
                </button>
              </div>

              {/* Panel body */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {entityTimelineLoading && (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <RefreshCw size={24} className="text-[#1f1f1f] animate-spin" />
                    <span className="text-[#a1a19b] text-xs">Loading timeline...</span>
                  </div>
                )}

                {entityTimelineError && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                    <AlertCircle size={24} className="text-yellow-500" />
                    <span className="text-[#71717a] text-xs">{entityTimelineError}</span>
                  </div>
                )}

                {!entityTimelineLoading && !entityTimelineError && entityTimeline.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                    <Clock size={24} className="text-[#d4d4cf]" />
                    <span className="text-[#a1a19b] text-xs">No timeline events found for {selectedNode.name}.</span>
                  </div>
                )}

                {!entityTimelineLoading && entityTimeline.length > 0 && (
                  <>
                    <div className="text-[10px] text-[#a1a19b] font-mono mb-1">
                      {entityTimeline.length} event{entityTimeline.length !== 1 ? 's' : ''}
                    </div>
                    {entityTimeline.map(item => (
                      <div key={item.id} className="bg-[#f6f7ed]/50 border border-[#e8e8e4] rounded-xl p-3 hover:border-[#d4d4cf] transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase
                            ${item.type === 'critical' ? 'bg-red-500/10 text-red-400' :
                              item.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                              item.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                              'bg-blue-500/10 text-blue-400'}
                          `}>{item.type}</span>
                          <span className="text-[10px] font-mono text-[#a1a19b]">{item.timestamp}</span>
                        </div>
                        <p className="text-[#1f1f1f] text-xs leading-relaxed mb-1.5">{item.event}</p>

                        {item.actors.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {item.actors.map((a, i) => (
                              <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${
                                a.toLowerCase() === selectedNode.name?.toLowerCase()
                                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                  : 'bg-purple-500/10 text-purple-400'
                              }`}>{a}</span>
                            ))}
                          </div>
                        )}

                        {item.artifacts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {item.artifacts.map((a, i) => (
                              <span key={i} className="text-[10px] font-mono bg-[#f4f4f4] text-[#1f1f1f] px-1.5 py-0.5 rounded-lg border border-[#e8e8e4]">{a}</span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-[10px] text-[#a1a19b]">
                          <FileText size={10} className="text-[#71717a]" />
                          <span className="font-mono">{item.sourceFile}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List View - Shows all entities from graph with anomaly details */}
      {!loading && graphData.nodes.length > 0 && viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {graphData.nodes.map((entity, idx) => (
            <EntityCard
              key={idx}
              entity={entity}
              relationships={graphData.links.filter(
                l => l.source === entity.id || l.source?.id === entity.id
              )}
              getNodeColor={getNodeColor}
              onViewTimeline={handleListViewTimeline}
              timelineData={listTimelines[entity.name]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PeopleTab;
