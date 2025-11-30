import React from 'react';
import { Users } from 'lucide-react';

const PeopleTab = () => {
  // No real people extraction implemented yet - show empty state
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
      <div className="p-4 rounded-full bg-zinc-800/50 mb-4">
        <Users size={48} className="text-zinc-600" />
      </div>
      <h3 className="text-zinc-400 font-medium text-lg mb-2">No Persons of Interest</h3>
      <p className="text-zinc-500 text-sm max-w-md">
        Person extraction is not yet available. Upload evidence files and use the AI Assistant to identify persons mentioned in your documents.
      </p>
    </div>
  );
};

export default PeopleTab;
