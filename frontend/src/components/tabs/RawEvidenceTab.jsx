import React, { useState, useEffect } from 'react';
import { FolderOpen, FileText, Image as ImageIcon, File, ExternalLink, Download } from 'lucide-react';
import { getSessionFiles } from '../../utils/api';

const API_BASE_URL = 'http://127.0.0.1:8000';

const getFileTypeInfo = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
    return { type: 'image', icon: ImageIcon, color: 'text-pink-500' };
  } else if (ext === 'pdf') {
    return { type: 'pdf', icon: FileText, color: 'text-red-500' };
  } else if (['txt', 'csv', 'json', 'log'].includes(ext)) {
    return { type: 'text', icon: FileText, color: 'text-blue-500' };
  } else {
    return { type: 'other', icon: File, color: 'text-gray-500' };
  }
};

const RawEvidenceTab = ({ sessionId }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    const fetchFiles = async () => {
      setLoading(true);
      try {
        const data = await getSessionFiles(sessionId);
        if (data.files && data.files.length > 0) {
          setFiles(data.files);
          // Select first file by default if it's an image or pdf
          const firstViewable = data.files.find(f => {
            const type = getFileTypeInfo(f).type;
            return type === 'image' || type === 'pdf' || type === 'text';
          });
          if (firstViewable) setSelectedFile(firstViewable);
          else setSelectedFile(data.files[0]);
        }
      } catch (err) {
        console.error('Error fetching files:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="bg-white border border-[#e8e8e4] rounded-2xl p-12 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#1f1f1f] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="bg-white border border-[#e8e8e4] rounded-2xl p-12 flex flex-col items-center justify-center text-center">
        <FolderOpen size={44} className="text-[#d4d4cf] mb-4" />
        <h3 className="text-[#71717a] font-medium mb-2">No Raw Evidence</h3>
        <p className="text-[#a1a19b] text-sm">Upload files to view them here.</p>
      </div>
    );
  }

  const renderFilePreview = () => {
    if (!selectedFile) return null;
    
    const fileUrl = `${API_BASE_URL}/sessions/${sessionId}/files/download/${encodeURIComponent(selectedFile)}`;
    const { type } = getFileTypeInfo(selectedFile);

    if (type === 'image') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#f6f7ed] rounded-xl overflow-hidden border border-[#e8e8e4]">
          <img src={fileUrl} alt={selectedFile} className="max-w-full max-h-full object-contain" />
        </div>
      );
    } else if (type === 'pdf' || type === 'text') {
      return (
        <div className="w-full h-full rounded-xl overflow-hidden border border-[#e8e8e4]">
          <iframe 
            src={fileUrl} 
            title={selectedFile}
            className="w-full h-full border-none bg-white"
          />
        </div>
      );
    } else {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#f6f7ed] rounded-xl border border-[#e8e8e4]">
          <File size={64} className="text-[#d4d4cf] mb-4" />
          <p className="text-[#71717a] mb-4">No preview available for this file type.</p>
          <a 
            href={fileUrl} 
            download 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 bg-white border border-[#e8e8e4] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#f4f4f4]"
          >
            <Download size={16} />
            Download File
          </a>
        </div>
      );
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4">
      {/* Sidebar File List */}
      <div className="w-64 flex-shrink-0 bg-white border border-[#e8e8e4] rounded-2xl flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#e8e8e4] bg-[#fcfcfb]">
          <h3 className="text-sm font-semibold text-[#1f1f1f]">Evidence Files</h3>
          <p className="text-xs text-[#a1a19b] mt-1">{files.length} items</p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200">
          <ul className="p-2 space-y-1">
            {files.map(file => {
              const { icon: Icon, color } = getFileTypeInfo(file);
              const isSelected = selectedFile === file;
              return (
                <li key={file}>
                  <button
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      isSelected 
                        ? 'bg-[#f4f4f4] text-[#1f1f1f] font-medium' 
                        : 'text-[#71717a] hover:bg-[#fcfcfb] hover:text-[#1f1f1f]'
                    }`}
                  >
                    <Icon size={16} className={isSelected ? 'text-[#1f1f1f]' : color} />
                    <span className="truncate">{file}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 bg-white border border-[#e8e8e4] rounded-2xl p-4 flex flex-col shadow-sm">
        {selectedFile && (
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#e8e8e4]">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-[#1f1f1f]">{selectedFile}</h2>
              <span className="text-xs bg-[#f4f4f4] text-[#71717a] px-2 py-0.5 rounded-md border border-[#e8e8e4] uppercase font-mono">
                {getFileTypeInfo(selectedFile).type}
              </span>
            </div>
            <a 
              href={`${API_BASE_URL}/sessions/${sessionId}/files/download/${encodeURIComponent(selectedFile)}`}
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 text-xs font-medium text-[#71717a] hover:text-[#1f1f1f] bg-[#f6f7ed] hover:bg-[#eaeae6] px-3 py-1.5 rounded-lg transition-colors border border-[#e8e8e4]"
            >
              <ExternalLink size={14} />
              Open in New Tab
            </a>
          </div>
        )}
        <div className="flex-1 min-h-0">
          {renderFilePreview()}
        </div>
      </div>
    </div>
  );
};

export default RawEvidenceTab;
