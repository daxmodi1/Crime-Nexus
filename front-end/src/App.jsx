import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { createSession, uploadFile, getSessions, deleteSession } from './utils/api';
import UploadView from './components/views/UploadView';
import ProcessingView from './components/views/ProcessingView';
import DashboardView from './components/views/DashboardView';
import Sidebar from './components/layout/Sidebar';

// Inner component to access router hooks
const AppContent = () => {
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

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
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

      // Small delay before transitioning to dashboard
      setTimeout(() => {
        setIsProcessing(false);
        navigate(`/c/${session.id}`);
      }, 500);

    } catch (err) {
      console.error('Failed to create session:', err);
      // Fallback: still go to dashboard but without backend session
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
    
    // Optimistically remove from UI
    setSavedCases(prev => prev.filter(c => c.id !== caseId && c.sessionId !== caseId));
    
    // If the deleted case is currently open, navigate back to /c
    if (location.pathname === `/c/${caseId}`) {
      navigate('/c');
    }

    // Delete from backend
    try {
      await deleteSession(caseId);
    } catch (err) {
      console.error('Failed to delete session from backend:', err);
    }
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
      />
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-[68px]' : 'ml-64'}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/c" replace />} />
          <Route path="/c" element={<UploadView onUpload={handleUpload} />} />
          <Route path="/c/:caseId" element={<DashboardView savedCases={savedCases} />} />
        </Routes>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}