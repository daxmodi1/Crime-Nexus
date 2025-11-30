const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function createSession(title = 'New Investigation') {
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error('Failed to create session');
  return await res.json();
}

async function sendChatMessage(sessionId, message) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Chat request failed');
  }
  return await res.json();
}

async function getSessionMessages(sessionId) {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/messages`);
  if (!res.ok) throw new Error('Failed to fetch messages');
  return await res.json();
}

async function uploadFile(sessionId, file, caseId = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (caseId) formData.append('case_id', caseId);

  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Upload failed');
  }
  return await res.json();
}

async function getSessions() {
  const res = await fetch(`${BASE_URL}/sessions`);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return await res.json();
}

async function getSessionFiles(sessionId) {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/files`);
  if (!res.ok) throw new Error('Failed to fetch files');
  return await res.json();
}

async function deleteSession(sessionId) {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to delete session');
  }
  return await res.json();
}

async function extractEntities(sessionId) {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/extract-entities`, {
    method: 'POST'
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to extract entities');
  }
  return await res.json();
}

async function getSessionGraph(sessionId) {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/graph`);
  if (!res.ok) throw new Error('Failed to fetch graph');
  return await res.json();
}

export { 
  BASE_URL, 
  createSession, 
  sendChatMessage, 
  getSessionMessages, 
  uploadFile, 
  getSessions, 
  getSessionFiles, 
  deleteSession,
  extractEntities,
  getSessionGraph
};
