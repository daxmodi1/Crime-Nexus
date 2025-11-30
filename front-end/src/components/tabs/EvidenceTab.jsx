import React, { useState, useEffect } from 'react';
import { Camera, Fingerprint, FileText, MessageSquare, Search, FolderOpen, AlertCircle } from 'lucide-react';
import { getSessionFiles } from '../../utils/api';
import RelevanceBar from '../ui/RelevanceBar';

// Map file extensions to types and icons
const getFileTypeInfo = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  const typeMap = {
    pdf: { type: 'Document', icon: FileText, color: 'text-blue-400' },
    docx: { type: 'Document', icon: FileText, color: 'text-blue-400' },
    doc: { type: 'Document', icon: FileText, color: 'text-blue-400' },
    pptx: { type: 'Presentation', icon: FileText, color: 'text-orange-400' },
    ppt: { type: 'Presentation', icon: FileText, color: 'text-orange-400' },
    txt: { type: 'Text', icon: FileText, color: 'text-zinc-400' },
    log: { type: 'Log', icon: FileText, color: 'text-green-400' },
    csv: { type: 'Data', icon: FileText, color: 'text-yellow-400' },
    json: { type: 'Data', icon: FileText, color: 'text-yellow-400' },
    mp4: { type: 'Video', icon: Camera, color: 'text-purple-400' },
    avi: { type: 'Video', icon: Camera, color: 'text-purple-400' },
    wav: { type: 'Audio', icon: MessageSquare, color: 'text-yellow-400' },
    mp3: { type: 'Audio', icon: MessageSquare, color: 'text-yellow-400' },
    png: { type: 'Image', icon: Camera, color: 'text-pink-400' },
    jpg: { type: 'Image', icon: Camera, color: 'text-pink-400' },
    jpeg: { type: 'Image', icon: Camera, color: 'text-pink-400' },
  };
  return typeMap[ext] || { type: 'File', icon: FileText, color: 'text-zinc-400' };
};

const EvidenceTab = ({ sessionId }) => {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchFiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSessionFiles(sessionId);
        if (data.files && data.files.length > 0) {
          const formatted = data.files.map((f, idx) => ({
            id: idx + 1,
            name: f,
            location: 'Uploaded Evidence',
            ...getFileTypeInfo(f),
            relevance: Math.floor(Math.random() * 30) + 70, // Placeholder until we have real relevance
            size: 'N/A'
          }));
          setEvidence(formatted);
        } else {
          setEvidence([]);
        }
      } catch (err) {
        console.error('Error fetching files:', err);
        setError('Failed to load evidence files');
        setEvidence([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [sessionId]);

  // Empty state
  if (!sessionId) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
        <FolderOpen size={48} className="text-zinc-600 mb-4" />
        <h3 className="text-zinc-400 font-medium mb-2">No Session Active</h3>
        <p className="text-zinc-500 text-sm">Open a case to view evidence files.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h3 className="text-red-400 font-medium mb-2">Error Loading Evidence</h3>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  if (evidence.length === 0) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
        <FolderOpen size={48} className="text-zinc-600 mb-4" />
        <h3 className="text-zinc-400 font-medium mb-2">No Evidence Files</h3>
        <p className="text-zinc-500 text-sm">Upload evidence files to begin your investigation.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent pb-2">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-500 uppercase font-mono text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Evidence Name</th>
              <th className="px-6 py-4 font-medium">Location / Source</th>
              <th className="px-6 py-4 font-medium">Category</th>
              <th className="px-6 py-4 font-medium w-48">Case Relevance</th>
              <th className="px-6 py-4 font-medium text-right">Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {evidence.map((file) => {
              const IconComponent = file.icon;
              return (
                <tr key={file.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4 font-medium text-zinc-200 flex items-center gap-3">
                    <IconComponent size={16} className={file.color} />
                    {file.name}
                  </td>
                  <td className="px-6 py-4 text-zinc-500 font-mono text-xs truncate max-w-[150px]" title={file.location}>{file.location}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 border border-zinc-700">{file.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <RelevanceBar score={file.relevance} />
                  </td>
                  <td className="px-6 py-4 text-right text-zinc-400 font-mono text-xs">{file.size}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EvidenceTab;
