import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

// ── Category display metadata ─────────────────────────────────────────────────

const CATEGORY_META = {
  temporal:    { label: 'Temporal',    color: 'text-blue-500',    bar: 'bg-blue-500'   },
  behavioral:  { label: 'Behavioral',  color: 'text-orange-500',  bar: 'bg-orange-500' },
  content:     { label: 'Content',     color: 'text-amber-500',   bar: 'bg-amber-500'  },
  structural:  { label: 'Structural',  color: 'text-[#71717a]',   bar: 'bg-[#71717a]'  },
  relational:  { label: 'Relational',  color: 'text-purple-500',  bar: 'bg-purple-500' },
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
    return <span className="text-xs text-[#a1a19b] font-mono px-1 select-none">—</span>;
  }

  if (severity === 'low') {
    return onClick ? (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 active:scale-95"
        title="Click to see category breakdown"
      >
        {score}/100
      </button>
    ) : (
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-mono text-emerald-600 bg-emerald-50 border-emerald-200 select-none">
        {score}/100
      </span>
    );
  }

  const isHigh = severity === 'high';

  const className = isHigh
    ? 'flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer text-red-600 bg-red-50 border-red-200 hover:bg-red-100 active:scale-95'
    : 'flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 active:scale-95';

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
    ? 'border-red-200 bg-red-50/50'
    : severity === 'moderate'
    ? 'border-amber-200 bg-amber-50/50'
    : 'border-emerald-200 bg-emerald-50/50';

  return (
    <div className={`rounded-xl border p-4 space-y-4 ${headerColor}`}>

      {/* Summary sentence */}
      <p className="text-sm text-[#3a3a3a] leading-relaxed">{summary}</p>

      {/* 5-category score breakdown */}
      <div>
        <div className="text-xs text-[#a1a19b] uppercase font-mono mb-2 tracking-wider">Score Breakdown</div>
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(category_scores).map(([cat, pts]) => {
            const meta = CATEGORY_META[cat] || { label: cat, color: 'text-[#71717a]', bar: 'bg-[#a1a19b]' };
            const pct  = Math.round((pts / 20) * 100);
            return (
              <div key={cat} className="flex flex-col items-center gap-1">
                <div className="w-full h-1.5 bg-[#e8e8e4] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${meta.bar} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-xs font-medium capitalize ${meta.color}`}>{meta.label}</span>
                <span className="text-xs font-mono text-[#a1a19b]">{pts}/20</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flags list */}
      {flags.length > 0 && (
        <div>
          <div className="text-xs text-[#a1a19b] uppercase font-mono mb-2 tracking-wider">
            Anomaly Flags ({flags.length})
          </div>
          <div className="space-y-2">
            {flags.map((flag, i) => {
              const meta = CATEGORY_META[flag.category] || CATEGORY_META.content;
              return (
                <div
                  key={i}
                  className="bg-white border border-[#e8e8e4] rounded-xl p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold uppercase ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-[#a1a19b] font-mono">+{flag.weight} pts</span>
                  </div>
                  <p className="text-sm text-[#3a3a3a]">{flag.flag}</p>
                  {flag.evidence_quote && (
                    <blockquote className="text-xs text-[#71717a] font-mono border-l-2 border-[#e8e8e4] pl-2 italic leading-relaxed">
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
