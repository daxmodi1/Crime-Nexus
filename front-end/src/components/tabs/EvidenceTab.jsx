import React, { useState, useEffect, useCallback } from 'react';
import { Camera, FileText, MessageSquare, FolderOpen, AlertCircle, Zap, RefreshCw } from 'lucide-react';
import { getSessionFiles, detectAnomalies, getAnomalies } from '../../utils/api';
import RelevanceBar from '../ui/RelevanceBar';
import { AnomalyBadge, AnomalyDetailPanel } from '../ui/AnomalyBadge';

// ── File type helpers ─────────────────────────────────────────────────────────

const getFileTypeInfo = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  const typeMap = {
    pdf:  { type: 'Document',     icon: FileText,      color: 'text-blue-500'   },
    docx: { type: 'Document',     icon: FileText,      color: 'text-blue-500'   },
    doc:  { type: 'Document',     icon: FileText,      color: 'text-blue-500'   },
    pptx: { type: 'Presentation', icon: FileText,      color: 'text-orange-500' },
    ppt:  { type: 'Presentation', icon: FileText,      color: 'text-orange-500' },
    txt:  { type: 'Text',         icon: FileText,      color: 'text-[#71717a]'  },
    log:  { type: 'Log',          icon: FileText,      color: 'text-emerald-500' },
    csv:  { type: 'Data',         icon: FileText,      color: 'text-amber-500'  },
    json: { type: 'Data',         icon: FileText,      color: 'text-amber-500'  },
    mp4:  { type: 'Video',        icon: Camera,        color: 'text-purple-500' },
    avi:  { type: 'Video',        icon: Camera,        color: 'text-purple-500' },
    wav:  { type: 'Audio',        icon: MessageSquare, color: 'text-amber-500'  },
    mp3:  { type: 'Audio',        icon: MessageSquare, color: 'text-amber-500'  },
    png:  { type: 'Image',        icon: Camera,        color: 'text-pink-500'   },
    jpg:  { type: 'Image',        icon: Camera,        color: 'text-pink-500'   },
    jpeg: { type: 'Image',        icon: Camera,        color: 'text-pink-500'   },
  };
  return typeMap[ext] || { type: 'File', icon: FileText, color: 'text-[#71717a]' };
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
      <div className="bg-white border border-[#e8e8e4] rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <FolderOpen size={44} className="text-[#d4d4cf] mb-4" />
        <h3 className="text-[#71717a] font-medium mb-2">No Session Active</h3>
        <p className="text-[#a1a19b] text-sm">Open a case to view evidence files.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white border border-[#e8e8e4] rounded-2xl p-12 flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="animate-spin w-8 h-8 border-2 border-[#1f1f1f] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-[#e8e8e4] rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <AlertCircle size={44} className="text-red-400 mb-4" />
        <h3 className="text-red-500 font-medium mb-2">Error</h3>
        <p className="text-[#a1a19b] text-sm">{error}</p>
      </div>
    );
  }

  if (evidence.length === 0) {
    return (
      <div className="bg-white border border-[#e8e8e4] rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <FolderOpen size={44} className="text-[#d4d4cf] mb-4" />
        <h3 className="text-[#71717a] font-medium mb-2">No Evidence Files</h3>
        <p className="text-[#a1a19b] text-sm">Upload evidence files to begin your investigation.</p>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-[13px] font-semibold text-[#71717a] uppercase tracking-wider">Evidence Files</h3>
          <span className="text-xs bg-[#f4f4f4] px-2.5 py-0.5 rounded-full text-[#71717a] border border-[#e8e8e4]">
            {evidence.length} files
          </span>
          {hasAnomalies && (
            <div className="flex items-center gap-2">
              {highCount > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full border bg-red-50 border-red-200 text-red-600">
                  {highCount} high anomaly
                </span>
              )}
              {moderateCount > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-600">
                  {moderateCount} moderate
                </span>
              )}
              {highCount === 0 && moderateCount === 0 && detectionRan && (
                <span className="text-xs px-2.5 py-0.5 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-600">
                  All clear
                </span>
              )}
            </div>
          )}
          {!hasAnomalies && detectionRan && (
            <span className="text-xs px-2.5 py-0.5 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-600">
              All clear
            </span>
          )}
        </div>

        <button
          onClick={handleDetectAnomalies}
          disabled={detecting}
          className="text-xs bg-white hover:bg-[#f4f4f4] text-[#1f1f1f] px-3.5 py-2 rounded-xl border border-[#e8e8e4] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          title="Run LLM anomaly detection across all documents using timeline + graph context"
        >
          {detecting
            ? <RefreshCw size={12} className="animate-spin" />
            : <Zap size={12} />}
          {detecting ? 'Detecting…' : hasAnomalies || detectionRan ? 'Re-detect Anomalies' : 'Detect Anomalies'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e8e8e4] rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent pb-2">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f4f4f4] text-[#71717a] uppercase font-mono text-xs">
              <tr>
                <th className="px-5 py-3.5 font-medium">Evidence Name</th>
                <th className="px-5 py-3.5 font-medium">Location / Source</th>
                <th className="px-5 py-3.5 font-medium">Category</th>
                <th className="px-5 py-3.5 font-medium w-44">Case Relevance</th>
                <th className="px-5 py-3.5 font-medium w-36" title="0-100. Green=low, Amber=moderate, Red=high. Click score to expand details.">
                  Anomaly Score
                </th>
                <th className="px-5 py-3.5 font-medium text-right">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e8e4]">
              {evidence.map((file) => {
                const IconComponent = file.icon;
                const anomaly       = anomalyData[file.name] || null;
                const isExpanded    = expandedRows.has(file.name);
                const isExpandable  = anomaly && (anomaly.severity === 'moderate' || anomaly.severity === 'high' || Object.values(anomaly.category_scores || {}).some(v => v > 0));

                return (
                  <React.Fragment key={file.id}>
                    <tr className="hover:bg-[#f6f7ed]/60 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-[#1f1f1f] flex items-center gap-3">
                        <IconComponent size={16} className={file.color} />
                        {file.name}
                      </td>
                      <td
                        className="px-5 py-3.5 text-[#a1a19b] font-mono text-xs truncate max-w-[150px]"
                        title={file.location}
                      >
                        {file.location}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-1 bg-[#f4f4f4] rounded-lg text-xs text-[#71717a] border border-[#e8e8e4]">
                          {file.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <RelevanceBar score={file.relevance} />
                      </td>
                      <td className="px-5 py-3.5">
                        {detecting ? (
                          <span className="text-xs text-[#a1a19b] animate-pulse font-mono">analysing…</span>
                        ) : (
                          <AnomalyBadge
                            score={anomaly?.anomaly_score ?? null}
                            severity={anomaly?.severity ?? null}
                            onClick={isExpandable ? () => toggleRow(file.name) : undefined}
                          />
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-[#a1a19b] font-mono text-xs">
                        {file.size}
                      </td>
                    </tr>

                    {/* Expanded flag detail panel */}
                    {isExpandable && isExpanded && (
                      <tr>
                        <td colSpan={6} className="px-5 pb-5 bg-[#f6f7ed]/50">
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
        <p className="text-xs text-[#a1a19b] text-right">
          Click a{' '}
          <span className="text-amber-600">moderate</span> or{' '}
          <span className="text-red-500">high</span>{' '}
          anomaly badge to expand evidence flags.
        </p>
      )}
    </div>
  );
};

export default EvidenceTab;
