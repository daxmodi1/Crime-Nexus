import React from 'react';

const RelevanceBar = ({ score }) => {
  let color = "bg-emerald-500";
  if (score > 60) color = "bg-amber-500";
  if (score > 85) color = "bg-red-500";

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-[#e8e8e4] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }}></div>
      </div>
      <span className={`text-xs font-mono w-8 text-right ${score > 85 ? 'text-red-500' : 'text-[#71717a]'}`}>{score}%</span>
    </div>
  );
};

export default RelevanceBar;
