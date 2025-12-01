import React, { useState, useEffect } from 'react';
import { createSession, sendChatMessage, uploadFile, getSessions, deleteSession, getSessionMessages } from './utils/api';
import LandingView from './components/views/LandingView';
import ProcessingView from './components/views/ProcessingView';
import DashboardView from './components/views/DashboardView';

// --- MAIN APP COMPONENT ---

export default function App() {
  const [view, setView] = useState('landing'); // landing, processing, dashboard
  const [activeTab, setActiveTab] = useState('chat');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  // State for Case Management
  const [savedCases, setSavedCases] = useState([]);
  const [currentCase, setCurrentCase] = useState(null);

  // Load existing sessions from backend on mount
  useEffect(() => {
    (async () => {
      try {
        const sessions = await getSessions();
        if (sessions && sessions.length > 0) {
          const cases = sessions.map(s => ({
            id: s.id,
            sessionId: s.id,
            title: s.title || 'Untitled Case',
            date: s.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            status: 'Open',
            files: s.files || []
          }));
          setSavedCases(cases);
        }
      } catch (err) {
        console.error('Could not load sessions:', err);
      }
    })();
  }, []);

  // Load chat messages when case is opened
  useEffect(() => {
    if (currentCase && view === 'dashboard') {
      const sessionId = currentCase.sessionId || currentCase.id;
      
      // Load existing messages from database
      (async () => {
        try {
          const savedMessages = await getSessionMessages(sessionId);
          
          if (savedMessages && savedMessages.length > 0) {
            // Convert backend format to frontend format
            const formattedMessages = savedMessages.map((msg, idx) => ({
              id: idx + 1,
              sender: msg.role === 'user' ? 'You' : 'AI Assistant',
              text: msg.content,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
            setMessages(formattedMessages);
          } else {
            // No saved messages - show welcome message
            setMessages([{
              id: 1,
              sender: 'AI Assistant',
              text: `Case **${currentCase.title}** loaded. Upload evidence files to begin analysis, then ask me questions about the case.`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
          }
        } catch (err) {
          console.error('Could not load messages:', err);
          // Fallback to welcome message
          setMessages([{
            id: 1,
            sender: 'AI Assistant',
            text: `Case **${currentCase.title}** loaded. Upload evidence files to begin analysis, then ask me questions about the case.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
      })();
    }
  }, [currentCase?.id, view]);

  // Handle file uploads from the landing page
  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;

    setView('processing');
    setLoadingProgress(0);
    
    // Create a new case for the upload
    const newCase = { 
      id: `CASE-${Math.floor(Math.random() * 1000)}-UPLOAD`, 
      title: files.length === 1 ? files[0].name : `Evidence Upload (${files.length} files)`,
      date: new Date().toISOString().split('T')[0], 
      status: 'Processing',
      filesUploaded: []
    };

    try {
      // Create backend session first
      const session = await createSession(newCase.title);
      newCase.sessionId = session.id;

      // Upload each file and track progress
      const totalFiles = files.length;
      let uploadedCount = 0;

      for (const file of files) {
        try {
          const result = await uploadFile(session.id, file, newCase.id);
          newCase.filesUploaded.push({
            name: file.name,
            success: true,
            skipped: result.skipped || false,
            chunks: result.chunks_created || 0
          });
        } catch (err) {
          console.error(`Error uploading ${file.name}:`, err);
          newCase.filesUploaded.push({
            name: file.name,
            success: false,
            error: err.message
          });
        }
        uploadedCount++;
        setLoadingProgress(Math.round((uploadedCount / totalFiles) * 100));
      }

      // Mark case as open and add to saved cases
      newCase.status = 'Open';
      setSavedCases(prev => [newCase, ...prev]);
      setCurrentCase(newCase);

      // Small delay before transitioning to dashboard
      setTimeout(() => setView('dashboard'), 500);

    } catch (err) {
      console.error('Failed to create session:', err);
      // Fallback: still go to dashboard but without backend session
      newCase.status = 'Error';
      setSavedCases(prev => [newCase, ...prev]);
      setCurrentCase(newCase);
      setLoadingProgress(100);
      setTimeout(() => setView('dashboard'), 500);
    }
  };

  const openExistingCase = (caseData) => {
    setCurrentCase(caseData);
    setView('dashboard');

    // Ensure backend session exists for the case
    if (!caseData.sessionId) {
      (async () => {
        try {
          const session = await createSession(caseData.title || caseData.id);
          setCurrentCase(prev => ({ ...prev, sessionId: session.id }));
        } catch (err) {
          console.error('Could not create backend session:', err);
        }
      })();
    }
  };

  const deleteCase = async (e, caseId) => {
    e.stopPropagation(); // Prevent triggering the openExistingCase click
    
    // Find the case to get its sessionId
    const caseToDelete = savedCases.find(c => c.id === caseId);
    const sessionId = caseToDelete?.sessionId || caseToDelete?.id;
    
    // Optimistically remove from UI
    setSavedCases(prev => prev.filter(c => c.id !== caseId));
    
    // Delete from backend
    if (sessionId) {
      try {
        await deleteSession(sessionId);
        console.log(`Session ${sessionId} deleted successfully`);
      } catch (err) {
        console.error('Failed to delete session from backend:', err);
        // Optionally restore the case if delete failed
        // setSavedCases(prev => [caseToDelete, ...prev]);
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    // User Message
    const userMsg = {
      id: Date.now(),
      sender: "You",
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setNewMessage("");
    setIsAiTyping(true);

    // Send to backend chat endpoint
    (async () => {
      try {
        const sessionId = currentCase?.sessionId || currentCase?.id;
        if (!sessionId) throw new Error('No session available for chat');

        const resp = await sendChatMessage(sessionId, userMsg.text);

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

  const handleCloseDashboard = () => {
    setView('landing');
  };

  return (
    <>
      {view === 'landing' && (
        <LandingView 
          savedCases={savedCases}
          onUpload={handleUpload}
          onOpenCase={openExistingCase}
          onDeleteCase={deleteCase}
        />
      )}
      {view === 'processing' && (
        <ProcessingView loadingProgress={loadingProgress} />
      )}
      {view === 'dashboard' && (
        <DashboardView 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentCase={currentCase}
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          isAiTyping={isAiTyping}
          onSendMessage={handleSendMessage}
          onClose={handleCloseDashboard}
        />
      )}
    </>
  );
}