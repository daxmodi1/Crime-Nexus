import React from 'react';

const RelevanceBar = ({ score }) => {
  let color = "bg-emerald-500";
  if (score > 60) color = "bg-yellow-500";
  if (score > 85) color = "bg-red-500";

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }}></div>
      </div>
      <span className={`text-xs font-mono w-8 text-right ${score > 85 ? 'text-red-400' : 'text-zinc-400'}`}>{score}%</span>
    </div>
  );
};

export default RelevanceBar;
