import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, FileText, Users, Clock, FolderOpen, PenTool } from 'lucide-react';
import { getSessionMessages, sendChatMessage, clearSessionMessages } from '../../utils/api';

import ChatTab from '../tabs/ChatTab';
import EvidenceTab from '../tabs/EvidenceTab';
import PeopleTab from '../tabs/PeopleTab';
import TimelineTab from '../tabs/TimelineTab';
import RawEvidenceTab from '../tabs/RawEvidenceTab';
import NotesSidebar from '../ui/NotesSidebar';

const DashboardView = ({ savedCases }) => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [highlightTarget, setHighlightTarget] = useState(null);
  const [deepResearch, setDeepResearch] = useState(false);

  // Find current case
  const currentCase = savedCases.find(c => c.sessionId === caseId || c.id === caseId);

  useEffect(() => {
    if (savedCases.length > 0 && !currentCase) {
      navigate('/c', { replace: true });
    }
  }, [caseId, savedCases, currentCase, navigate]);

  // Load chat messages when caseId changes
  useEffect(() => {
    if (!currentCase) return;
    
    let isMounted = true;
    const sessionId = currentCase.sessionId || currentCase.id;
    
    (async () => {
      try {
        const savedMsgs = await getSessionMessages(sessionId);
        if (!isMounted) return;
        
        if (savedMsgs && savedMsgs.length > 0) {
          const formatted = savedMsgs.map((msg, idx) => ({
            id: idx + 1,
            sender: msg.role === 'user' ? 'You' : 'AI Assistant',
            text: msg.content,
            sources: msg.sources || [],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          setMessages(formatted);
        } else {
          setMessages([{
            id: 1,
            sender: 'AI Assistant',
            text: `Case **${currentCase.title}** loaded. Upload evidence files to begin analysis, then ask me questions about the case.`,
            sources: [],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Could not load messages:', err);
        setMessages([{
          id: 1,
          sender: 'AI Assistant',
          text: `Case **${currentCase.title}** loaded. Upload evidence files to begin analysis, then ask me questions about the case.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    })();
    return () => { isMounted = false; };
  }, [currentCase]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const userMsg = {
      id: Date.now(),
      sender: "You",
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setNewMessage("");
    setIsAiTyping(true);

    (async () => {
      try {
        const sessionId = currentCase?.sessionId || currentCase?.id;
        if (!sessionId) throw new Error('No session available for chat');

        const resp = await sendChatMessage(sessionId, userMsg.text, deepResearch);

        const aiMsg = {
          id: Date.now() + 1,
          sender: 'AI Assistant',
          text: resp.response || 'No response',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: resp.sources || []
        };

        setMessages(prev => [...prev, aiMsg]);
      } catch (err) {
        console.error('Chat error:', err);
        const errMsg = {
          id: Date.now() + 2,
          sender: 'AI Assistant',
          text: 'Error contacting backend: ' + (err.message || err),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errMsg]);
      } finally {
        setIsAiTyping(false);
      }
    })();
  };

  const handleClearChat = async () => {
    if (!window.confirm("Are you sure you want to clear the chat history?")) return;
    try {
      const sessionId = currentCase?.sessionId || currentCase?.id;
      if (!sessionId) return;
      await clearSessionMessages(sessionId);
      setMessages([{
        id: Date.now(),
        sender: 'AI Assistant',
        text: 'Chat cleared. Ask me questions about the case.',
        sources: [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  if (!currentCase) {
    return (
      <div className="h-screen bg-[#f6f7ed] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-[#1f1f1f] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#a1a19b] font-mono text-sm">Loading Investigation Workspace...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'evidence', label: 'Analysis', icon: FileText },
    { id: 'people', label: 'People', icon: Users },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'raw_evidence', label: 'Raw Files', icon: FolderOpen }
  ];

  const sessionId = currentCase.sessionId || currentCase.id;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <ChatTab 
            messages={messages}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            isAiTyping={isAiTyping}
            onSendMessage={handleSendMessage}
            deepResearch={deepResearch}
            setDeepResearch={setDeepResearch}
            onClearChat={handleClearChat}
          />
        );
      case 'evidence':
        return <EvidenceTab sessionId={sessionId} isNotesOpen={isNotesOpen} highlightTarget={highlightTarget} />;
      case 'people':
        return <PeopleTab sessionId={sessionId} isNotesOpen={isNotesOpen} highlightTarget={highlightTarget} />;
      case 'timeline':
        return <TimelineTab sessionId={sessionId} isNotesOpen={isNotesOpen} highlightTarget={highlightTarget} />;
      case 'raw_evidence':
        return <RawEvidenceTab sessionId={sessionId} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f6f7ed] text-[#1f1f1f] font-sans flex flex-row transition-all duration-300">
      {/* Main Content Area */}
      <div className="flex-1 px-6 py-6 flex flex-col min-h-0 relative z-10 transition-all duration-300">
        <div className="flex mb-6 overflow-x-auto scrollbar-hide pb-2 justify-between items-start">
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

          <button
            onClick={() => setIsNotesOpen(prev => !prev)}
            className={`flex items-center gap-2 px-4 py-2 !rounded-full text-[13px] font-semibold transition-all !border-none flex-shrink-0 ml-4 ${
              isNotesOpen 
                ? 'bg-[#1f1f1f] text-white shadow-md' 
                : 'bg-white text-[#1f1f1f] border border-[#e8e8e4] hover:bg-[#f4f4f4] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
            }`}
          >
            <PenTool size={16} />
            Notes
          </button>
        </div>

        <div className={`flex-1 min-h-0 ${activeTab !== 'chat' ? 'overflow-y-auto pr-2' : ''} scrollbar-thin scrollbar-thumb-[#d4d4cf] scrollbar-track-transparent`}>
          {renderTabContent()}
        </div>
      </div>

      {/* Right Sidebar */}
      {isNotesOpen && (
        <NotesSidebar 
          sessionId={sessionId} 
          onClose={() => setIsNotesOpen(false)} 
          onNavigate={(tabId, attachment) => {
            setActiveTab(tabId);
            setHighlightTarget(attachment);
            // clear it after a bit so clicking the same thing again retriggers if needed, 
            // but actually let's just let it be, or reset it.
            setTimeout(() => setHighlightTarget(null), 1000);
          }}
        />
      )}
    </div>
  );
};

export default DashboardView;
