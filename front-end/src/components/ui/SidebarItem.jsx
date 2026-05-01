import React from 'react';

const SidebarItem = ({ icon, label, active, onClick }) => {
  const iconElement = React.createElement(icon, {
    size: 20,
    className: active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'
  });

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
        active 
          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
      }`}
    >
      {iconElement}
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
};

export default SidebarItem;
