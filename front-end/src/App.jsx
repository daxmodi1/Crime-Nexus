import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { createSession, uploadFile, getSessions, deleteSession } from './utils/api';
import { supabase } from './lib/supabase';

import HeroView from './components/views/HeroView';
import AuthView from './components/views/AuthView';
import UploadView from './components/views/UploadView';
import ProcessingView from './components/views/ProcessingView';
import DashboardView from './components/views/DashboardView';
import Sidebar from './components/layout/Sidebar';

// Inner component for authenticated workspace
const AuthenticatedWorkspace = () => {
  const [savedCases, setSavedCases] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

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

  const handleUpload = async (files, caseName) => {
    if (!files || files.length === 0 || !caseName) return;

    setIsProcessing(true);
    setLoadingProgress(0);
    
    const newCase = { 
      id: `CASE-${Math.floor(Math.random() * 1000)}-UPLOAD`, 
      title: caseName,
      date: new Date().toISOString().split('T')[0], 
      status: 'Processing',
      filesUploaded: []
    };

    try {
      const session = await createSession(newCase.title);
      newCase.sessionId = session.id;

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
          newCase.filesUploaded.push({ name: file.name, success: false, error: err.message });
        }
        uploadedCount++;
        setLoadingProgress(Math.round((uploadedCount / totalFiles) * 100));
      }

      newCase.status = 'Open';
      setSavedCases(prev => [newCase, ...prev]);

      setTimeout(() => {
        setIsProcessing(false);
        navigate(`/c/${session.id}`);
      }, 500);

    } catch (err) {
      console.error('Failed to create session:', err);
      newCase.status = 'Error';
      setSavedCases(prev => [newCase, ...prev]);
      setLoadingProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        navigate(`/c/${newCase.id}`);
      }, 500);
    }
  };

  const handleDeleteCase = async (e, caseId) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSavedCases(prev => prev.filter(c => c.id !== caseId && c.sessionId !== caseId));
    
    if (location.pathname === `/c/${caseId}`) {
      navigate('/c');
    }

    try {
      await deleteSession(caseId);
    } catch (err) {
      console.error('Failed to delete session from backend:', err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isProcessing) {
    return <ProcessingView loadingProgress={loadingProgress} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f7ed]">
      <Sidebar 
        savedCases={savedCases}
        onDeleteCase={handleDeleteCase}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        onLogout={handleLogout}
      />
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-[68px]' : 'ml-64'}`}>
        <Routes>
          <Route path="/" element={<UploadView onUpload={handleUpload} />} />
          <Route path="/:caseId" element={<DashboardView savedCases={savedCases} />} />
        </Routes>
      </div>
    </div>
  );
};

// Main App Component with Supabase Auth Routing
export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show a loading state until session is checked (undefined means checking, null means no session)
  if (session === undefined) {
    return (
      <div className="h-screen bg-[#f6f7ed] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-[#1f1f1f] border-t-transparent rounded-full animate-spin mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={session ? <Navigate to="/c" replace /> : <HeroView />} 
        />
        <Route 
          path="/login" 
          element={session ? <Navigate to="/c" replace /> : <AuthView mode="login" />} 
        />
        <Route 
          path="/signup" 
          element={session ? <Navigate to="/c" replace /> : <AuthView mode="signup" />} 
        />

        {/* Protected Workspace Routes (everything under /c) */}
        <Route 
          path="/c/*" 
          element={session ? <AuthenticatedWorkspace /> : <Navigate to="/login" replace />} 
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}