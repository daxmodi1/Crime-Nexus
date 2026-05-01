import React, { useRef } from 'react';
import { Upload, FileText } from 'lucide-react';

const UploadView = ({ onUpload }) => {
  const fileInputRef = useRef(null);

  const handleBoxClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload(Array.from(files));
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-[#f6f7ed] flex flex-col items-center justify-center p-5 md:p-8">
      <div className="max-w-2xl w-full text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-semibold text-[#1f1f1f] mb-3 tracking-tight">Create a New Case</h1>
        <p className="text-[#71717a] text-sm md:text-base leading-relaxed">
          Upload your digital evidence to automatically extract entities, generate timelines, and run advanced forensic anomaly detection.
        </p>
      </div>

      <div 
        className="w-full max-w-2xl relative group cursor-pointer rounded-2xl border-2 border-dashed border-[#d4d4cf] bg-white hover:border-[#1f1f1f] transition-all duration-300 flex flex-col items-center justify-center gap-5 overflow-hidden p-16 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
        onClick={handleBoxClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept=".pdf,.docx,.pptx,.doc,.ppt,.rtf,.txt,.csv,.json,.log,.zip"
          className="hidden"
        />
        <div className="absolute inset-0 bg-[#f6f7ed]/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="p-5 rounded-3xl bg-[#1f1f1f] group-hover:scale-110 transition-transform duration-300 relative z-10 shadow-lg shadow-black/10">
          <Upload size={32} className="text-white" />
        </div>
        
        <div className="text-center relative z-10">
          <p className="text-[#1f1f1f] font-semibold text-lg">Upload Evidence Files</p>
          <p className="text-[#a1a19b] text-sm mt-2">Supports PDF, DOCX, TXT, CSV, JSON, LOG, ZIP</p>
        </div>
      </div>
      
      <div className="max-w-2xl w-full mt-10 grid grid-cols-3 gap-6 text-center">
        <div className="bg-white p-6 rounded-2xl border border-[#e8e8e4] shadow-sm">
          <div className="mx-auto w-10 h-10 rounded-full bg-[#f4f4f4] flex items-center justify-center mb-3">
            <span className="font-mono font-semibold text-[#1f1f1f]">1</span>
          </div>
          <h3 className="text-sm font-semibold text-[#1f1f1f] mb-1">Upload</h3>
          <p className="text-xs text-[#71717a]">Drop your forensic images and reports.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#e8e8e4] shadow-sm">
          <div className="mx-auto w-10 h-10 rounded-full bg-[#f4f4f4] flex items-center justify-center mb-3">
            <span className="font-mono font-semibold text-[#1f1f1f]">2</span>
          </div>
          <h3 className="text-sm font-semibold text-[#1f1f1f] mb-1">Process</h3>
          <p className="text-xs text-[#71717a]">AI builds graphs and timelines automatically.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#e8e8e4] shadow-sm">
          <div className="mx-auto w-10 h-10 rounded-full bg-[#f4f4f4] flex items-center justify-center mb-3">
            <span className="font-mono font-semibold text-[#1f1f1f]">3</span>
          </div>
          <h3 className="text-sm font-semibold text-[#1f1f1f] mb-1">Analyze</h3>
          <p className="text-xs text-[#71717a]">Chat with evidence and detect anomalies.</p>
        </div>
      </div>
    </div>
  );
};

export default UploadView;
