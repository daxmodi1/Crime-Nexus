import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ title, value, subtitle, gradient, icon: Icon, trend, trendValue }) => {
  return (
    <div className="rounded-2xl border border-[#e8e8e4] bg-white p-5 text-[#1f1f1f] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[13px] font-medium text-[#71717a]">{title}</p>
          <h3 className="text-3xl font-semibold mt-2 text-[#1f1f1f] tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-[#a1a19b] mt-2">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-3 bg-[#1f1f1f] rounded-xl text-white">
            <Icon size={20} />
          </div>
        )}
      </div>
      
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend === 'up' ? (
            <TrendingUp size={13} />
          ) : (
            <TrendingDown size={13} />
          )}
          <span>{trendValue}% from last month</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
