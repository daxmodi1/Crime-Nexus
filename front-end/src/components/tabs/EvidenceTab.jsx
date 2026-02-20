import React, { useState, useEffect, useCallback } from 'react';
import { Camera, FileText, MessageSquare, FolderOpen, AlertCircle, Zap, RefreshCw } from 'lucide-react';
import { getSessionFiles, detectAnomalies, getAnomalies } from '../../utils/api';
import RelevanceBar from '../ui/RelevanceBar';
import { AnomalyBadge, AnomalyDetailPanel } from '../ui/AnomalyBadge';

// ── File type helpers ─────────────────────────────────────────────────────────

const getFileTypeInfo = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  const typeMap = {
    pdf:  { type: 'Document',     icon: FileText,      color: 'text-blue-400'   },
    docx: { type: 'Document',     icon: FileText,      color: 'text-blue-400'   },
    doc:  { type: 'Document',     icon: FileText,      color: 'text-blue-400'   },
    pptx: { type: 'Presentation', icon: FileText,      color: 'text-orange-400' },
    ppt:  { type: 'Presentation', icon: FileText,      color: 'text-orange-400' },
    txt:  { type: 'Text',         icon: FileText,      color: 'text-zinc-400'   },
    log:  { type: 'Log',          icon: FileText,      color: 'text-green-400'  },
    csv:  { type: 'Data',         icon: FileText,      color: 'text-yellow-400' },
    json: { type: 'Data',         icon: FileText,      color: 'text-yellow-400' },
    mp4:  { type: 'Video',        icon: Camera,        color: 'text-purple-400' },
    avi:  { type: 'Video',        icon: Camera,        color: 'text-purple-400' },
    wav:  { type: 'Audio',        icon: MessageSquare, color: 'text-yellow-400' },
    mp3:  { type: 'Audio',        icon: MessageSquare, color: 'text-yellow-400' },
    png:  { type: 'Image',        icon: Camera,        color: 'text-pink-400'   },
    jpg:  { type: 'Image',        icon: Camera,        color: 'text-pink-400'   },
    jpeg: { type: 'Image',        icon: Camera,        color: 'text-pink-400'   },
  };
  return typeMap[ext] || { type: 'File', icon: FileText, color: 'text-zinc-400' };
};

// ── EvidenceTab ───────────────────────────────────────────────────────────────

const EvidenceTab = ({ sessionId }) => {
  const [evidence,     setEvidence]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [anomalyData,  setAnomalyData]  = useState({});   // filename → DocumentAnomaly
  const [detecting,    setDetecting]    = useState(false);
  const [detectionRan, setDetectionRan] = useState(false); // did detection ever complete?
  const [expandedRows, setExpandedRows] = useState(new Set());

  // ── Fetch evidence file list ───────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId) return;

    const fetchFiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSessionFiles(sessionId);
        if (data.files && data.files.length > 0) {
          const formatted = data.files.map((f, idx) => ({
            id: idx + 1,
            name: f,
            location: 'Uploaded Evidence',
            ...getFileTypeInfo(f),
            relevance: Math.floor(Math.random() * 30) + 70, // placeholder
            size: 'N/A',
          }));
          setEvidence(formatted);
        } else {
          setEvidence([]);
        }
      } catch (err) {
        console.error('Error fetching files:', err);
        setError('Failed to load evidence files');
        setEvidence([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [sessionId]);

  // ── Load cached anomaly results on session change ─────────────────────────

  useEffect(() => {
    if (!sessionId) return;
    setAnomalyData({});
    setExpandedRows(new Set());
    setDetectionRan(false);

    const fetchCachedAnomalies = async () => {
      try {
        const data = await getAnomalies(sessionId);
        if (data.cached && data.document_anomalies?.length > 0) {
          const map = {};
          data.document_anomalies.forEach(a => { map[a.filename] = a; });
          setAnomalyData(map);
          setDetectionRan(true);
        }
      } catch {
        // silently skip — user can trigger detection manually
      }
    };

    fetchCachedAnomalies();
  }, [sessionId]);

  // ── Run anomaly detection ─────────────────────────────────────────────────

  const handleDetectAnomalies = useCallback(async () => {
    if (!sessionId || detecting) return;
    setDetecting(true);
    setError(null);
    try {
      console.log('[EvidenceTab] Sending detect-anomalies request for session:', sessionId);
      const result = await detectAnomalies(sessionId);
      console.log('[EvidenceTab] Detect-anomalies response:', result);

      if (result.success === false) {
        setError(`Anomaly detection failed: ${result.message || 'Unknown error'}`);
        return;
      }

      const anomalies = result.document_anomalies || [];
      if (anomalies.length > 0) {
        const map = {};
        anomalies.forEach(a => { map[a.filename] = a; });
        setAnomalyData(map);
        setExpandedRows(new Set());
      }
      setDetectionRan(true);
    } catch (err) {
      console.error('[EvidenceTab] Anomaly detection error:', err);
      setError(`Anomaly detection failed: ${err.message}`);
    } finally {
      setDetecting(false);
    }
  }, [sessionId, detecting]);

  // ── Toggle expanded flag panel ────────────────────────────────────────────

  const toggleRow = useCallback((filename) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  }, []);

  // ── Summary counts ────────────────────────────────────────────────────────

  const highCount     = Object.values(anomalyData).filter(a => a.severity === 'high').length;
  const moderateCount = Object.values(anomalyData).filter(a => a.severity === 'moderate').length;
  const hasAnomalies  = Object.keys(anomalyData).length > 0;

  // ── Empty / loading / error states ───────────────────────────────────────

  if (!sessionId) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
        <FolderOpen size={48} className="text-zinc-600 mb-4" />
        <h3 className="text-zinc-400 font-medium mb-2">No Session Active</h3>
        <p className="text-zinc-500 text-sm">Open a case to view evidence files.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h3 className="text-red-400 font-medium mb-2">Error</h3>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  if (evidence.length === 0) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
        <FolderOpen size={48} className="text-zinc-600 mb-4" />
        <h3 className="text-zinc-400 font-medium mb-2">No Evidence Files</h3>
        <p className="text-zinc-500 text-sm">Upload evidence files to begin your investigation.</p>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-mono text-zinc-500">EVIDENCE FILES</h3>
          <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
            {evidence.length} files
          </span>
          {hasAnomalies && (
            <div className="flex items-center gap-2">
              {highCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded border bg-red-500/10 border-red-500/30 text-red-400">
                  {highCount} high anomaly
                </span>
              )}
              {moderateCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded border bg-amber-500/10 border-amber-500/30 text-amber-400">
                  {moderateCount} moderate
                </span>
              )}
              {highCount === 0 && moderateCount === 0 && detectionRan && (
                <span className="text-xs px-2 py-0.5 rounded border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                  All clear
                </span>
              )}
            </div>
          )}
          {!hasAnomalies && detectionRan && (
            <span className="text-xs px-2 py-0.5 rounded border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
              All clear
            </span>
          )}
        </div>

        <button
          onClick={handleDetectAnomalies}
          disabled={detecting}
          className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded border border-amber-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Run LLM anomaly detection across all documents using timeline + graph context"
        >
          {detecting
            ? <RefreshCw size={12} className="animate-spin" />
            : <Zap size={12} />}
          {detecting ? 'Detecting…' : hasAnomalies || detectionRan ? 'Re-detect Anomalies' : 'Detect Anomalies'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent pb-2">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-500 uppercase font-mono text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Evidence Name</th>
                <th className="px-6 py-4 font-medium">Location / Source</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium w-44">Case Relevance</th>
                <th className="px-6 py-4 font-medium w-36" title="0-100. Green=low, Amber=moderate, Red=high. Click score to expand details.">
                  Anomaly Score
                </th>
                <th className="px-6 py-4 font-medium text-right">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {evidence.map((file) => {
                const IconComponent = file.icon;
                const anomaly       = anomalyData[file.name] || null;
                const isExpanded    = expandedRows.has(file.name);
                const isExpandable  = anomaly && (anomaly.severity === 'moderate' || anomaly.severity === 'high' || Object.values(anomaly.category_scores || {}).some(v => v > 0));

                return (
                  <React.Fragment key={file.id}>
                    <tr className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-zinc-200 flex items-center gap-3">
                        <IconComponent size={16} className={file.color} />
                        {file.name}
                      </td>
                      <td
                        className="px-6 py-4 text-zinc-500 font-mono text-xs truncate max-w-[150px]"
                        title={file.location}
                      >
                        {file.location}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 border border-zinc-700">
                          {file.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <RelevanceBar score={file.relevance} />
                      </td>
              <td className="px-6 py-4">
                        {detecting ? (
                          <span className="text-xs text-zinc-600 animate-pulse font-mono">analysing…</span>
                        ) : (
                          <AnomalyBadge
                            score={anomaly?.anomaly_score ?? null}
                            severity={anomaly?.severity ?? null}
                            onClick={isExpandable ? () => toggleRow(file.name) : undefined}
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-400 font-mono text-xs">
                        {file.size}
                      </td>
                    </tr>

                    {/* Expanded flag detail panel */}
                    {isExpandable && isExpanded && (
                      <tr>
                        <td colSpan={6} className="px-6 pb-5 bg-zinc-900/60">
                          <AnomalyDetailPanel anomaly={anomaly} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {hasAnomalies && (highCount > 0 || moderateCount > 0) && (
        <p className="text-xs text-zinc-600 text-right">
          Click a{' '}
          <span className="text-amber-500">moderate</span> or{' '}
          <span className="text-red-500">high</span>{' '}
          anomaly badge to expand evidence flags.
        </p>
      )}
    </div>
  );
};

export default EvidenceTab;
