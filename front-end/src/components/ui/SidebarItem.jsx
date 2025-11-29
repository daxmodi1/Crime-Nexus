import React from 'react';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
      active 
        ? 'bg-cyan-500/10 text-cyan-400 border-r-2 border-cyan-400' 
        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
    }`}
  >
    <Icon size={20} className={active ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-300'} />
    <span className="font-medium tracking-wide text-sm">{label}</span>
  </button>
);

export default SidebarItem;
