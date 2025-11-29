import React from 'react';
import { FileText, Paperclip } from 'lucide-react';
import { MOCK_PEOPLE } from '../../data/mockData';

const PeopleTab = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {MOCK_PEOPLE.map((person) => (
        <div key={person.id} className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-xl hover:bg-zinc-900 hover:border-cyan-500/30 transition-all group relative overflow-hidden">
          
          {/* Watermark/Background ID */}
          <div className="absolute -right-4 -top-4 text-9xl font-bold text-zinc-800/20 pointer-events-none select-none">
             {person.id}
          </div>

          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-500 group-hover:bg-zinc-800/80 transition-colors overflow-hidden border border-zinc-700 shadow-lg">
              {person.avatar}
            </div>
            <span className={`text-xs px-2 py-1 rounded font-mono border ${
              person.role === 'Suspect' ? 'bg-red-900/20 text-red-400 border-red-900/50' : 
              person.role === 'Victim' ? 'bg-purple-900/20 text-purple-400 border-purple-900/50' : 
              'bg-blue-900/20 text-blue-400 border-blue-900/50'
            }`}>
              {person.role.toUpperCase()}
            </span>
          </div>
          
          <h3 className="text-xl font-bold text-zinc-100 mb-1 relative z-10">{person.name}</h3>
          
          <div className="flex gap-2 mb-4 relative z-10">
             <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400 border border-zinc-700">Age: {person.age}</span>
             <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400 border border-zinc-700">Status: {person.status}</span>
          </div>
          
          <div className="space-y-3 border-t border-zinc-800 pt-4 relative z-10">
            <p className="text-sm text-zinc-300 italic">"{person.notes}"</p>
            
            <div className="bg-zinc-950/50 rounded p-2 flex items-start gap-2 border border-zinc-800/50">
                <Paperclip size={12} className="text-cyan-500 mt-0.5 shrink-0" />
                <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Identified Via</span>
                    <span className="text-xs text-zinc-400 font-mono break-all">{person.sourceFile}</span>
                </div>
            </div>
          </div>
          
          <button className="w-full mt-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300 transition-colors flex items-center justify-center gap-2 relative z-10">
            <FileText size={12}/> View Full Dossier
          </button>
        </div>
      ))}
    </div>
  );
};

export default PeopleTab;
