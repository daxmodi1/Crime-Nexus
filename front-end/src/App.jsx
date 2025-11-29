import React, { useState } from 'react';
import { MOCK_CHAT_HISTORY, INITIAL_CASES } from './data/mockData';
import LandingView from './components/views/LandingView';
import ProcessingView from './components/views/ProcessingView';
import DashboardView from './components/views/DashboardView';

// --- MAIN APP COMPONENT ---

export default function App() {
  const [view, setView] = useState('landing'); // landing, processing, dashboard
  const [activeTab, setActiveTab] = useState('timeline');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [messages, setMessages] = useState(MOCK_CHAT_HISTORY);
  const [newMessage, setNewMessage] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  // State for Case Management
  const [savedCases, setSavedCases] = useState(INITIAL_CASES);
  const [currentCase, setCurrentCase] = useState(null);

  // Simulate case file loading
  const handleUpload = () => {
    setView('processing');
    
    // Create a new mock case for the upload
    const newCase = { 
      id: `CASE-${Math.floor(Math.random() * 1000)}-UPLOAD`, 
      title: 'New Evidence Upload', 
      date: new Date().toISOString().split('T')[0], 
      status: 'Processing' 
    };

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 10) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Add new case and set it as active
        setSavedCases(prev => [newCase, ...prev]);
        setCurrentCase(newCase);
        
        setTimeout(() => setView('dashboard'), 800);
      }
      setLoadingProgress(progress);
    }, 200);
  };

  const openExistingCase = (caseData) => {
    setCurrentCase(caseData);
    setView('dashboard');
  };

  const deleteCase = (e, caseId) => {
    e.stopPropagation(); // Prevent triggering the openExistingCase click
    setSavedCases(prev => prev.filter(c => c.id !== caseId));
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

    // AI Response Simulation
    setTimeout(() => {
      const aiResponses = [
        "I've cross-referenced that with the timeline. There is a 15-minute gap in the suspect's alibi.",
        "Processing biometric database... No direct matches found in national registry yet.",
        "I recommend re-examining the CCTV footage from 00:15 AM based on that inquiry.",
        "Noted. I've updated the case file with your observation.",
        "Analysis suggests a high probability of a second accomplice based on footprint analysis."
      ];
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      
      const aiMsg = {
        id: Date.now() + 1,
        sender: "AI Assistant",
        text: randomResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, aiMsg]);
      setIsAiTyping(false);
    }, 1500 + Math.random() * 1000);
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