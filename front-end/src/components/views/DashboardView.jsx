import React from 'react';
import { 
  Search, 
  Clock, 
  FileText, 
  ShieldAlert, 
  X, 
  Users, 
  Bot 
} from 'lucide-react';
import SidebarItem from '../ui/SidebarItem';
import GlobalStyles from '../ui/GlobalStyles';
import TimelineTab from '../tabs/TimelineTab';
import PeopleTab from '../tabs/PeopleTab';
import EvidenceTab from '../tabs/EvidenceTab';
import ChatTab from '../tabs/ChatTab';

const DashboardView = ({ 
  activeTab, 
  setActiveTab, 
  currentCase, 
  messages, 
  newMessage, 
  setNewMessage, 
  isAiTyping, 
  onSendMessage, 
  onClose 
}) => {
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-zinc-800/50">
          <ShieldAlert className="text-cyan-500" size={24} />
          <span className="font-bold text-lg tracking-tight">NEXUS</span>
        </div>
        
        <div className="p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg mb-6">
            <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Active Investigation</p>
            <p className="text-sm font-mono text-zinc-200 truncate" title={currentCase?.id || "Unknown Case"}>
              {currentCase?.id || "CASE-882-BRAVO"}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-xs text-red-400">{currentCase?.status === 'Closed' ? 'Archived / Read-Only' : 'Homicide / Open'}</span>
            </div>
          </div>

          <nav className="space-y-1">
            <SidebarItem 
              icon={Clock} 
              label="Event Timeline" 
              active={activeTab === 'timeline'} 
              onClick={() => setActiveTab('timeline')} 
            />
            <SidebarItem 
              icon={Users} 
              label="Persons of Interest" 
              active={activeTab === 'users'} 
              onClick={() => setActiveTab('users')} 
            />
            <SidebarItem 
              icon={FileText} 
              label="Evidence Board" 
              active={activeTab === 'files'} 
              onClick={() => setActiveTab('files')} 
            />
            <SidebarItem 
              icon={Bot} 
              label="AI Case Assistant" 
              active={activeTab === 'chat'} 
              onClick={() => setActiveTab('chat')} 
            />
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-zinc-800/50">
           <button 
             onClick={onClose}
             className="flex items-center gap-2 text-xs text-zinc-500 hover:text-red-400 transition-colors"
           >
             <X size={14} /> Close Case File
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950/50 relative">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 shrink-0 z-20">
          <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
            {activeTab === 'timeline' && <><Clock size={20} className="text-cyan-500"/> Sequence of Events</>}
            {activeTab === 'users' && <><Users size={20} className="text-cyan-500"/> Suspects & Witnesses</>}
            {activeTab === 'files' && <><FileText size={20} className="text-cyan-500"/> Evidence & Artifacts</>}
            {activeTab === 'chat' && <><Bot size={20} className="text-cyan-500"/> AI Investigation Partner</>}
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input 
                type="text" 
                placeholder="Search case database..." 
                className="bg-zinc-900 border border-zinc-800 text-sm rounded-full pl-9 pr-4 py-1.5 focus:outline-none focus:border-cyan-500 w-64 text-zinc-300 placeholder-zinc-600 transition-colors"
              />
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <main className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-950/50">
          
          {activeTab === 'timeline' && <TimelineTab />}
          {activeTab === 'users' && <PeopleTab />}
          {activeTab === 'files' && <EvidenceTab />}
          {activeTab === 'chat' && (
            <ChatTab 
              messages={messages}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              isAiTyping={isAiTyping}
              onSendMessage={onSendMessage}
            />
          )}

        </main>
      </div>
      
      <GlobalStyles />
    </div>
  );
};

export default DashboardView;
