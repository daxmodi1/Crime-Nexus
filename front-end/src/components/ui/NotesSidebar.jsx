import React, { useState, useEffect, useCallback } from 'react';
import { X, Tag, Paperclip, Trash2, Plus, Clock, FileText, User, Activity, AlertCircle } from 'lucide-react';
import { getSessionNotes, createNote, deleteNote } from '../../utils/api';

const NotesSidebar = ({ sessionId, onClose, onNavigate }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [draftContent, setDraftContent] = useState('');
  const [draftTags, setDraftTags] = useState([]);
  const [draftAttachments, setDraftAttachments] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const data = await getSessionNotes(sessionId);
      setNotes(data || []);
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      
      // Prevent duplicates
      const isDuplicate = draftAttachments.some(a => JSON.stringify(a) === JSON.stringify(data));
      if (!isDuplicate) {
        setDraftAttachments(prev => [...prev, data]);
      }
    } catch (err) {
      console.error('Failed to parse dropped data:', err);
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!draftTags.includes(tagInput.trim())) {
        setDraftTags(prev => [...prev, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setDraftTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const removeAttachment = (idxToRemove) => {
    setDraftAttachments(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleSaveNote = async () => {
    if (!draftContent.trim() && draftAttachments.length === 0) return;
    
    const newNote = {
      content: draftContent,
      tags: draftTags,
      attachments: draftAttachments
    };

    try {
      await createNote(sessionId, newNote);
      setDraftContent('');
      setDraftTags([]);
      setDraftAttachments([]);
      fetchNotes(); // refresh
    } catch (err) {
      console.error('Error creating note:', err);
      setError('Failed to save note');
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(sessionId, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note');
    }
  };

  const handleAttachmentClick = (attachment) => {
    if (!onNavigate) return;
    if (attachment.type === 'entity') {
      onNavigate('people', attachment);
    } else if (attachment.type === 'timeline_event') {
      onNavigate('timeline', attachment);
    } else if (attachment.type === 'evidence') {
      onNavigate('evidence', attachment);
    }
  };

  const renderAttachment = (attachment, idx, isDraft = false) => {
    let icon = <Paperclip size={12} />;
    let label = 'Attachment';
    let colorClass = 'text-gray-600 bg-gray-100 border-gray-200';

    if (attachment.type === 'entity') {
      icon = <User size={12} />;
      label = attachment.name || 'Entity';
      colorClass = 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100';
    } else if (attachment.type === 'timeline_event') {
      icon = <Activity size={12} />;
      label = attachment.title || 'Event';
      colorClass = 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100';
    } else if (attachment.type === 'evidence') {
      icon = <FileText size={12} />;
      label = attachment.filename || 'File';
      colorClass = 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100';
    }

    return (
      <div 
        key={idx} 
        className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-medium ${colorClass} max-w-full ${!isDraft ? 'cursor-pointer shadow-sm hover:shadow transition-all' : ''}`}
        onClick={() => !isDraft && handleAttachmentClick(attachment)}
        title={!isDraft ? `Go to ${attachment.type} tab` : ""}
      >
        {icon}
        <span className="truncate">{label}</span>
        {isDraft && (
          <button 
            onClick={(e) => { e.stopPropagation(); removeAttachment(idx); }} 
            className="ml-1 hover:text-black opacity-60 hover:opacity-100 focus:outline-none"
          >
            <X size={10} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="w-[350px] h-full bg-white border-l border-[#e8e8e4] flex flex-col shadow-[-4px_0_20px_rgba(0,0,0,0.02)] transition-all z-20">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#e8e8e4] flex items-center justify-between shrink-0 bg-[#fafafa]">
        <div className="text-[14px] font-semibold text-[#1f1f1f] flex items-center gap-2 whitespace-nowrap tracking-tight">
          <FileText size={16} className="text-[#71717a]" />
          Investigation Notes
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#a1a19b] hover:text-[#1f1f1f] hover:bg-[#f4f4f4] transition-colors border-none bg-transparent">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Draft Area */}
      <div 
        className={`p-4 border-b border-[#e8e8e4] bg-white shrink-0 transition-colors ${isDraggingOver ? 'bg-[#f4fbff] border-blue-200' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDraggingOver && (
          <div className="absolute inset-0 bg-blue-50/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center border-2 border-dashed border-blue-400 rounded-lg m-4 pointer-events-none">
            <Paperclip size={24} className="text-blue-500 mb-2" />
            <p className="text-sm font-medium text-blue-700">Drop to attach to note</p>
          </div>
        )}
        
        <div className="relative">
          <textarea
            className="w-full text-sm text-[#1f1f1f] bg-[#f4f4f4] border border-[#e8e8e4] rounded-xl p-3 placeholder-[#a1a19b] focus:outline-none focus:border-[#d4d4cf] focus:ring-2 focus:ring-[#f4f4f4] min-h-[100px] resize-none"
            placeholder="Write a note... Drag and drop entities, events, or files here to attach them."
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
          />

          {/* Attachments rendering */}
          {draftAttachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {draftAttachments.map((att, i) => renderAttachment(att, i, true))}
            </div>
          )}

          {/* Tags rendering & input */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {draftTags.map(tag => (
              <span key={tag} className="flex items-center gap-1 text-[10px] bg-zinc-100 text-zinc-700 px-2 py-1 rounded-full border border-zinc-200">
                <Tag size={10} /> {tag}
                <button onClick={() => removeTag(tag)} className="hover:text-black opacity-60"><X size={10} /></button>
              </span>
            ))}
            <input 
              type="text"
              placeholder="Add tag and press Enter..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="text-[11px] bg-transparent border-none focus:outline-none text-[#71717a] placeholder-[#d4d4cf] min-w-[120px]"
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button 
              onClick={handleSaveNote}
              disabled={!draftContent.trim() && draftAttachments.length === 0}
              className="text-xs bg-[#1f1f1f] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#3a3a3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-none flex items-center gap-1.5"
            >
              <Plus size={14} /> Save Note
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-4 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-xs">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#d4d4cf] scrollbar-track-transparent">
        {loading && notes.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#1f1f1f] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 text-[#a1a19b]">
            <FileText size={32} className="mb-3 opacity-50" />
            <p className="text-sm">No notes yet.</p>
            <p className="text-xs mt-1">Start typing or drag items to create one.</p>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="bg-white border border-[#e8e8e4] rounded-xl p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[#d4d4cf] transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[10px] text-[#a1a19b] font-mono">
                  <Clock size={10} />
                  {new Date(note.created_at).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </div>
                <button 
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-[#d4d4cf] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent p-0.5"
                  title="Delete note"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              
              {note.content && (
                <p className="text-[13px] text-[#1f1f1f] whitespace-pre-wrap leading-relaxed mb-3">
                  {note.content}
                </p>
              )}

              {note.attachments && note.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {note.attachments.map((att, i) => renderAttachment(att, i, false))}
                </div>
              )}

              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-[#f4f4f4]">
                  {note.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[9px] bg-[#f4f4f4] text-[#71717a] px-1.5 py-0.5 rounded border border-[#e8e8e4]">
                      <Tag size={8} /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotesSidebar;
