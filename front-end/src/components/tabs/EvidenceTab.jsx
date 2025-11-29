import React from 'react';
import { Camera, Fingerprint, FileText, MessageSquare, Search } from 'lucide-react';
import { MOCK_EVIDENCE } from '../../data/mockData';
import RelevanceBar from '../ui/RelevanceBar';

const EvidenceTab = () => {
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
            {MOCK_EVIDENCE.map((file) => (
              <tr key={file.id} className="hover:bg-zinc-800/30 transition-colors group">
                <td className="px-6 py-4 font-medium text-zinc-200 flex items-center gap-3">
                  {file.type === 'Video' && <Camera size={16} className="text-purple-400"/>}
                  {file.type === 'Biometric' && <Fingerprint size={16} className="text-red-400"/>}
                  {file.type === 'Document' && <FileText size={16} className="text-blue-400"/>}
                  {file.type === 'Audio' && <MessageSquare size={16} className="text-yellow-400"/>}
                  {file.type === 'Trace' && <Search size={16} className="text-green-400"/>}
                  {file.type === 'Transcript' && <FileText size={16} className="text-zinc-400"/>}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EvidenceTab;
