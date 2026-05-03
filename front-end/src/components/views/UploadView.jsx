import React, { useState, useRef } from 'react';
import { Upload, FileText, Plus, X, BrainCircuit, Dna } from 'lucide-react';

const UploadView = ({ onUpload }) => {
  const [showModal, setShowModal] = useState(false);
  const [caseName, setCaseName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files));
    }
  };

  const handleCreateCase = (e) => {
    e.preventDefault();
    if (!caseName.trim() || selectedFiles.length === 0) return;
    
    onUpload(selectedFiles, caseName.trim());
    
    // Reset modal state
    setShowModal(false);
    setCaseName('');
    setSelectedFiles([]);
  };

  return (
    <div className="h-full bg-white flex flex-col font-sans relative">
      {/* Top Header */}
      <div className="pt-12 px-10 pb-6">
        <h1 className="text-3xl font-bold text-[#1f1f1f] tracking-tight">Case Workspace</h1>
        <p className="text-[#71717a] mt-2">Manage your forensic investigations or start a new one.</p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-white border border-[#e8e8e4] rounded-full flex items-center justify-center mb-6 shadow-sm">
            <FileText size={32} className="text-[#d4d4cf]" />
          </div>
          <h2 className="text-xl font-bold text-[#1f1f1f] mb-2">No Active Case Selected</h2>
          <p className="text-[#71717a] mb-8 leading-relaxed">
            Select an existing case from the sidebar history, or create a new investigation to start analyzing evidence.
          </p>
          
          <button 
            onClick={() => setShowModal(true)}
            className="bg-[#1f1f1f] text-white font-semibold px-8 py-4 rounded-full text-base hover:bg-black transition-transform hover:scale-105 shadow-xl shadow-black/10 flex items-center gap-2"
          >
            <Plus size={20} />
            Create New Case
          </button>
        </div>
      </div>

      {/* Create Case Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f1f1f]/40 backdrop-blur-sm p-4">
          <div 
            className="bg-white rounded-3xl w-full max-w-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-[#e8e8e4]">
              <h3 className="text-xl font-bold text-[#1f1f1f]">New Investigation</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 bg-[#f4f4f4] hover:bg-[#eaeae6] rounded-full text-[#71717a] hover:text-[#1f1f1f] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateCase} className="p-6 space-y-6">
              {/* Case Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1f1f1f] px-1">Case Name / Identifier</label>
                <input 
                  type="text"
                  required
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
                  placeholder="e.g., Operation Ghost Protocol"
                  className="w-full px-4 py-3.5 bg-[#f4f4f4] border border-[#e8e8e4] rounded-2xl text-[#1f1f1f] placeholder:text-[#a1a19b] focus:outline-none focus:ring-2 focus:ring-[#1f1f1f] focus:border-transparent transition-all"
                />
              </div>

              {/* File Upload Zone */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1f1f1f] px-1">Digital Evidence</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#d4d4cf] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#1f1f1f] hover:bg-[#f6f7ed]/50 transition-all group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    required
                    accept=".pdf,.docx,.pptx,.doc,.ppt,.rtf,.txt,.csv,.json,.log,.zip"
                    className="hidden"
                  />
                  <div className="p-4 bg-[#f4f4f4] group-hover:bg-[#1f1f1f] rounded-2xl transition-colors duration-300 mb-4">
                    <Upload size={24} className="text-[#a1a19b] group-hover:text-white transition-colors" />
                  </div>
                  
                  {selectedFiles.length > 0 ? (
                    <div className="text-center">
                      <p className="font-semibold text-[#1f1f1f]">{selectedFiles.length} files selected</p>
                      <p className="text-xs text-[#71717a] mt-1 line-clamp-1">
                        {selectedFiles.map(f => f.name).join(', ')}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="font-semibold text-[#1f1f1f]">Click to browse files</p>
                      <p className="text-xs text-[#a1a19b] mt-1">PDF, DOCX, TXT, CSV, LOG, ZIP</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 flex justify-end gap-3 border-t border-[#e8e8e4]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 rounded-full font-semibold text-[#71717a] hover:bg-[#f4f4f4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!caseName.trim() || selectedFiles.length === 0}
                  className="px-6 py-3 rounded-full font-semibold bg-[#1f1f1f] text-white hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-2"
                >
                  <BrainCircuit size={18} />
                  Process Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadView;
