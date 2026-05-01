import React from 'react';
import { 
  Home, 
  BarChart3, 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  Dna,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

const Sidebar = ({ activeTab, onTabChange, onLogout, collapsed, onToggleCollapse }) => {
  const navItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'cases', label: 'Cases', icon: FileText },
    { id: 'people', label: 'People', icon: Users },
  ];

  const bottomItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'logout', label: 'Logout', icon: LogOut, action: onLogout },
  ];

  return (
    <div 
      className={`${collapsed ? 'w-[68px]' : 'w-64'} bg-[#f4f4f4] border-r border-[#e8e8e4] flex flex-col h-full fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ease-in-out`}
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

      {/* Navigation Items */}
      <nav className="flex-1 py-6 px-3 w-full space-y-1 overflow-y-auto scrollbar-hide overflow-x-hidden">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-[#1f1f1f] text-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] !border-none'
                  : 'text-[#71717a] hover:text-[#1f1f1f] hover:bg-[#eaeae6] !bg-transparent !border-none !shadow-none'
              }`}
              title={item.label}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <span className="text-[13px] font-medium whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Items */}
      <div className="py-4 px-3 w-full space-y-1 border-t border-[#e8e8e4]">
        {bottomItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.action || (() => onTabChange(item.id))}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#71717a] hover:text-[#1f1f1f] hover:bg-[#eaeae6] transition-all !bg-transparent !border-none !shadow-none ${
                collapsed ? 'justify-center' : ''
              }`}
              title={item.label}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <span className="text-[13px] font-medium whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
