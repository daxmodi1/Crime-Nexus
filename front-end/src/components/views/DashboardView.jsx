import React from 'react';
import { 
  MessageSquare, 
  FileText, 
  Users, 
  Clock, 
  ArrowLeft, 
  Dna 
} from 'lucide-react';

import ChatTab from '../tabs/ChatTab';
import EvidenceTab from '../tabs/EvidenceTab';
import PeopleTab from '../tabs/PeopleTab';
import TimelineTab from '../tabs/TimelineTab';

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
  const tabs = [
    { id: 'chat', label: 'AI Chat', icon: MessageSquare },
    { id: 'evidence', label: 'Evidence', icon: FileText },
    { id: 'people', label: 'People', icon: Users },
    { id: 'timeline', label: 'Timeline', icon: Clock }
  ];

  const sessionId = currentCase?.sessionId || currentCase?.id;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <ChatTab 
            messages={messages}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            isAiTyping={isAiTyping}
            onSendMessage={onSendMessage}
          />
        );
      case 'evidence':
        return <EvidenceTab sessionId={sessionId} />;
      case 'people':
        return <PeopleTab sessionId={sessionId} />;
      case 'timeline':
        return <TimelineTab sessionId={sessionId} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left: Back & Logo */}
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Back to Home"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Dna size={24} className="text-cyan-400" />
              <span className="text-lg font-bold tracking-tight">
                CRIME<span className="text-cyan-500">NEXUS</span>
              </span>
            </div>
          </div>

          {/* Center: Case Info */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-cyan-500 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/30">
              {currentCase?.id || 'NO-CASE'}
            </span>
            <h1 className="text-sm font-medium text-zinc-300 max-w-xs truncate">
              {currentCase?.title || 'Untitled Case'}
            </h1>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
              currentCase?.status === 'Open' 
                ? 'border-red-500/30 text-red-400 bg-red-500/10' 
                : 'border-zinc-700 text-zinc-500 bg-zinc-800'
            }`}>
              {currentCase?.status || 'Unknown'}
            </span>
          </div>

          {/* Right: Spacer or Actions */}
          <div className="w-24" />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs Navigation */}
        <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="min-h-[calc(100vh-200px)]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
