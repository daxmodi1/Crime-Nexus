import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Settings, 
  LogOut, 
  Dna,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  Plus,
  Trash2
} from 'lucide-react';

const Sidebar = ({ savedCases, onDeleteCase, collapsed, onToggleCollapse, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div 
      className={`${collapsed ? 'w-[68px]' : 'w-64'} bg-white border border-[#e2e4e8] rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col fixed left-4 top-4 bottom-4 z-40 transition-all duration-300 ease-in-out`}
    >
      {/* Logo + Collapse Toggle */}
      <div className={`py-4 w-full flex items-center border-b border-[#e8e8e4] ${collapsed ? 'justify-center px-0' : 'justify-between px-3'}`}>
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-[#1f1f1f] rounded-lg flex-shrink-0">
              <Dna size={20} className="text-white" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight text-[#1f1f1f] whitespace-nowrap overflow-hidden">
              CrimeNexus
            </span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[#a1a19b] hover:text-[#1f1f1f] hover:bg-[#eaeae6] transition-colors !bg-transparent !border-none flex-shrink-0 !shadow-none"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* New Case Button */}
      <div className="p-3">
        <button
          onClick={() => navigate('/c')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all shadow-sm ${
            location.pathname === '/c'
              ? 'bg-[#1f1f1f] text-white !border-none'
              : 'bg-white text-[#1f1f1f] border border-[#e8e8e4] hover:bg-[#eaeae6]'
          } ${collapsed ? 'justify-center' : ''}`}
          title="New Case"
        >
          <Plus size={18} className="flex-shrink-0" />
          {!collapsed && (
            <span className="text-[13px] font-semibold whitespace-nowrap">
              New Case
            </span>
          )}
        </button>
      </div>

      {/* Case History */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 space-y-1">
        {!collapsed && savedCases.length > 0 && (
          <div className="px-3 py-2 text-[11px] font-semibold text-[#a1a19b] uppercase tracking-wider">
            History
          </div>
        )}
        {savedCases.map((c) => {
          const casePath = `/c/${c.sessionId || c.id}`;
          const isActive = location.pathname === casePath;
          
          return (
            <div key={c.id} className="relative group flex items-center">
              <button
                onClick={() => navigate(casePath)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-[#eaeae6] text-[#1f1f1f] !border-none'
                    : 'text-[#71717a] hover:text-[#1f1f1f] hover:bg-[#eaeae6]/50 !bg-transparent !border-none'
                }`}
                title={c.title}
              >
                <MessageSquare size={16} className={`flex-shrink-0 ${isActive ? 'text-[#1f1f1f]' : 'text-[#a1a19b]'}`} />
                {!collapsed && (
                  <span className="text-[13px] font-medium whitespace-nowrap overflow-hidden text-ellipsis text-left flex-1">
                    {c.title}
                  </span>
                )}
              </button>
              
              {/* Delete button (visible on hover) */}
              {!collapsed && (
                <button
                  onClick={(e) => onDeleteCase(e, c.sessionId || c.id)}
                  className={`absolute right-2 p-1.5 rounded-lg text-[#a1a19b] hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 ${isActive ? 'bg-[#eaeae6]' : 'bg-[#f4f4f4]'}`}
                  title="Delete case"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Items */}
      <div className="py-4 px-3 w-full space-y-1 border-t border-[#e8e8e4]">
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#71717a] hover:text-[#1f1f1f] hover:bg-[#eaeae6] transition-all !bg-transparent !border-none !shadow-none ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Settings"
        >
          <Settings size={18} className="flex-shrink-0" />
          {!collapsed && <span className="text-[13px] font-medium whitespace-nowrap">Settings</span>}
        </button>
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#71717a] hover:text-[#1f1f1f] hover:bg-[#eaeae6] transition-all !bg-transparent !border-none !shadow-none ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Logout"
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span className="text-[13px] font-medium whitespace-nowrap">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
