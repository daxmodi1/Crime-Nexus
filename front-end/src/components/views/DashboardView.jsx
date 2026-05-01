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
  onClose,
  sidebarCollapsed
}) => {
  const sidebarWidth = sidebarCollapsed ? 'ml-[68px]' : 'ml-64';
  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
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
    <div className={`${sidebarWidth} h-screen overflow-hidden bg-[#f6f7ed] text-[#1f1f1f] font-sans flex flex-col transition-all duration-300`}>
      {/* Main Content */}
      <div className="flex-1 px-6 py-6 flex flex-col min-h-0">
        {/* Tabs Navigation */}
        <div className="flex mb-6 overflow-x-auto scrollbar-hide pb-2">
          <div className="flex items-center bg-[#eaeae6] p-1.5 !rounded-full inline-flex">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2 px-5 py-2 !rounded-full text-[13px] font-semibold transition-all whitespace-nowrap flex-shrink-0 !border-none min-w-[100px] ${
                    isActive
                      ? 'bg-white text-[#1f1f1f] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                      : 'text-[#71717a] hover:text-[#1f1f1f] hover:bg-[#f4f4f4]/50 !bg-transparent !shadow-none'
                  }`}
                >
                  {isActive && <Icon size={16} className="text-[#1f1f1f]" />}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className={`flex-1 min-h-0 ${activeTab !== 'chat' ? 'overflow-y-auto pr-2' : ''} scrollbar-thin scrollbar-thumb-[#d4d4cf] scrollbar-track-transparent`}>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
