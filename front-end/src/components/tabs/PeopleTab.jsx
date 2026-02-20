import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Users, RefreshCw, Network, List, AlertCircle, Scan, AlertTriangle, ShieldAlert } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import { extractEntities, getSessionGraph, getAnomalies } from '../../utils/api';

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
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[500px]">
        <div className="p-4 rounded-full bg-zinc-800/50 mb-4">
          <Users size={48} className="text-zinc-600" />
        </div>
        <h3 className="text-zinc-400 font-medium text-lg mb-2">No Session Active</h3>
        <p className="text-zinc-500 text-sm max-w-md">
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
          <h3 className="text-sm font-mono text-zinc-500">KNOWLEDGE GRAPH</h3>
          <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
            {graphData.nodes.length} entities, {graphData.links.length} relationships
          </span>
        </div>
        
        <div className="flex gap-2">
          {/* Extract Entities Button */}
          <button 
            onClick={handleExtractEntities}
            disabled={extracting}
            className="text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-3 py-1.5 rounded border border-purple-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded border border-zinc-700 flex items-center gap-2"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          
          {/* View Toggle */}
          <div className="flex bg-zinc-800 rounded border border-zinc-700">
            <button 
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1.5 text-xs flex items-center gap-1 ${viewMode === 'graph' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400'}`}
            >
              <Network size={12} /> Graph
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs flex items-center gap-1 ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400'}`}
            >
              <List size={12} /> List
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 flex items-center justify-center min-h-[500px]">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw size={32} className="text-cyan-500 animate-spin" />
            <span className="text-zinc-400">Loading graph data...</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && graphData.nodes.length === 0 && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[500px]">
          <div className="p-4 rounded-full bg-zinc-800/50 mb-4">
            <Network size={48} className="text-zinc-600" />
          </div>
          <h3 className="text-zinc-400 font-medium text-lg mb-2">No Entities Extracted</h3>
          <p className="text-zinc-500 text-sm max-w-md mb-6">
            Click "Extract from Evidence" to use AI to automatically identify people, organizations, locations, and relationships from your documents.
          </p>
          <button 
            onClick={handleExtractEntities}
            disabled={extracting}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {extracting ? <RefreshCw size={14} className="animate-spin" /> : <Scan size={14} />}
            {extracting ? 'Extracting...' : 'Extract Entities from Evidence'}
          </button>
        </div>
      )}

      {/* Graph View */}
      {!loading && graphData.nodes.length > 0 && viewMode === 'graph' && (
        <div ref={containerRef} className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden relative" style={{ height: '600px' }}>
          <ForceGraph2D
            ref={graphRef}
            width={containerSize.width}
            height={containerSize.height}
            graphData={graphData}
            nodeLabel={node => `${node.name}${node.description ? `\n${node.description}` : ''}`}
            nodeColor={getNodeColor}
            nodeRelSize={6}
            linkLabel={link => link.relationship}
            linkColor={() => '#4b5563'}
            linkWidth={1.5}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            backgroundColor="#09090b"
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label      = node.name;
              const fontSize   = 12 / globalScale;
              const nodeRadius = node.val || 5;
              ctx.font = `${fontSize}px Sans-Serif`;

              // Draw anomaly glow ring for moderate / high anomaly nodes
              const nodeAnomaly = personAnomalyMap[node.name?.toLowerCase()];
              if (nodeAnomaly && nodeAnomaly.severity !== 'low') {
                const ringColor = nodeAnomaly.severity === 'high'
                  ? 'rgba(239, 68, 68, 0.55)'    // red-500 glow
                  : 'rgba(245, 158, 11, 0.45)';   // amber-500 glow
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
              ctx.fillStyle    = '#d4d4d8';
              ctx.fillText(label, node.x, node.y + nodeRadius + 2);
            }}
          />
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-zinc-900/90 border border-zinc-700 rounded-lg p-3">
            <div className="text-xs text-zinc-400 mb-2 font-medium">Entity Types</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-zinc-400">Person</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                <span className="text-zinc-400">Organization</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-zinc-400">Location</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-zinc-400">Event</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                <span className="text-zinc-400">Vehicle</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-zinc-400">Weapon</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                <span className="text-zinc-400">Document</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-pink-500"></span>
                <span className="text-zinc-400">Phone</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List View - Shows all entities from graph */}
      {!loading && graphData.nodes.length > 0 && viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {graphData.nodes.map((entity, idx) => (
            <div 
              key={idx} 
              className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl hover:bg-zinc-900 hover:border-cyan-500/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: getNodeColor(entity) + '30', color: getNodeColor(entity) }}
                  >
                    {entity.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="text-zinc-100 font-medium">{entity.name}</h3>
                    <span 
                      className="text-xs px-2 py-0.5 rounded capitalize"
                      style={{ 
                        backgroundColor: getNodeColor(entity) + '20',
                        color: getNodeColor(entity)
                      }}
                    >
                      {entity.type || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Anomaly badge for person nodes */}
              {entity.type?.toLowerCase() === 'person' &&
                personAnomalyMap[entity.name?.toLowerCase()] &&
                personAnomalyMap[entity.name?.toLowerCase()].severity !== 'low' && (() => {
                  const pa      = personAnomalyMap[entity.name.toLowerCase()];
                  const isHigh  = pa.severity === 'high';
                  return (
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-mono mb-3 ${
                      isHigh
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}>
                      {isHigh ? <ShieldAlert size={11} /> : <AlertTriangle size={11} />}
                      Anomaly Score: {pa.score}/100
                    </div>
                  );
                })()}

              {entity.description && (
                <p className="text-zinc-400 text-sm mb-3">{entity.description}</p>
              )}
              
              {/* Show relationships for this entity */}
              {graphData.links.filter(l => l.source === entity.id || l.source?.id === entity.id).length > 0 && (
                <div className="border-t border-zinc-800 pt-3 mt-3">
                  <div className="text-xs text-zinc-500 mb-2">Relationships</div>
                  <div className="flex flex-wrap gap-1">
                    {graphData.links
                      .filter(l => l.source === entity.id || l.source?.id === entity.id)
                      .map((rel, i) => (
                        <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
                          {rel.relationship} → {typeof rel.target === 'string' ? rel.target : rel.target?.id}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PeopleTab;
