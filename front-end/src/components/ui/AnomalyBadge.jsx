import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

// ── Category display metadata ─────────────────────────────────────────────────

const CATEGORY_META = {
  temporal:    { label: 'Temporal',    color: 'text-blue-400',   bar: 'bg-blue-500'   },
  behavioral:  { label: 'Behavioral',  color: 'text-orange-400', bar: 'bg-orange-500' },
  content:     { label: 'Content',     color: 'text-yellow-400', bar: 'bg-yellow-500' },
  structural:  { label: 'Structural',  color: 'text-zinc-400',   bar: 'bg-zinc-500'   },
  relational:  { label: 'Relational',  color: 'text-purple-400', bar: 'bg-purple-500' },
};

// ── AnomalyBadge ─────────────────────────────────────────────────────────────
/**
 * Clickable score badge shown in the Evidence table.
 * - null score: muted dash (detection not run)
 * - Low  (<30):  static green badge — no interaction
 * - Moderate / High: colored clickable button that triggers onClick
 */
export const AnomalyBadge = ({ score, severity, onClick }) => {
  // Not yet analysed
  if (score === null || score === undefined || !severity) {
    return <span className="text-xs text-zinc-600 font-mono px-1 select-none">—</span>;
  }

  if (severity === 'low') {
    return onClick ? (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-mono transition-colors cursor-pointer text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95"
        title="Click to see category breakdown"
      >
        {score}/100
      </button>
    ) : (
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-mono text-emerald-400 bg-emerald-500/10 border-emerald-500/30 select-none">
        {score}/100
      </span>
    );
  }

  const isHigh = severity === 'high';

  const className = isHigh
    ? 'flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-mono transition-colors cursor-pointer text-red-400 bg-red-500/10 border-red-500/30 hover:bg-red-500/20 active:scale-95'
    : 'flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-mono transition-colors cursor-pointer text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 active:scale-95';

  return (
    <button onClick={onClick} className={className} title="Click to expand anomaly details">
      {isHigh ? <ShieldAlert size={11} /> : <AlertTriangle size={11} />}
      {score}/100
    </button>
  );
};

// ── AnomalyDetailPanel ────────────────────────────────────────────────────────
/**
 * Expandable detail panel rendered inside the Evidence table row.
 * Shows: 5-category score breakdown + individual flagged evidence.
 */
export const AnomalyDetailPanel = ({ anomaly }) => {
  if (!anomaly) return null;

  const { flags = [], summary = '', category_scores = {}, severity } = anomaly;
  const headerColor = severity === 'high'
    ? 'border-red-500/20 bg-red-500/5'
    : severity === 'moderate'
    ? 'border-amber-500/20 bg-amber-500/5'
    : 'border-emerald-500/20 bg-emerald-500/5';

  return (
    <div className={`rounded-lg border p-4 space-y-4 ${headerColor}`}>

      {/* Summary sentence */}
      <p className="text-sm text-zinc-300 leading-relaxed">{summary}</p>

      {/* 5-category score breakdown */}
      <div>
        <div className="text-xs text-zinc-500 uppercase font-mono mb-2">Score Breakdown</div>
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(category_scores).map(([cat, pts]) => {
            const meta = CATEGORY_META[cat] || { label: cat, color: 'text-zinc-400', bar: 'bg-zinc-600' };
            const pct  = Math.round((pts / 20) * 100);
            return (
              <div key={cat} className="flex flex-col items-center gap-1">
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${meta.bar} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-xs font-medium capitalize ${meta.color}`}>{meta.label}</span>
                <span className="text-xs font-mono text-zinc-400">{pts}/20</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flags list */}
      {flags.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 uppercase font-mono mb-2">
            Anomaly Flags ({flags.length})
          </div>
          <div className="space-y-2">
            {flags.map((flag, i) => {
              const meta = CATEGORY_META[flag.category] || CATEGORY_META.content;
              return (
                <div
                  key={i}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">+{flag.weight} pts</span>
                  </div>
                  <p className="text-sm text-zinc-200">{flag.flag}</p>
                  {flag.evidence_quote && (
                    <blockquote className="text-xs text-zinc-500 font-mono border-l-2 border-zinc-700 pl-2 italic leading-relaxed">
                      &ldquo;{flag.evidence_quote.length > 200
                        ? flag.evidence_quote.slice(0, 200) + '…'
                        : flag.evidence_quote}&rdquo;
                    </blockquote>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
