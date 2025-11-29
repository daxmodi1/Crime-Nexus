import React, { useRef, useEffect } from 'react';
import { Bot, ChevronRight } from 'lucide-react';

const ChatTab = ({ messages, newMessage, setNewMessage, isAiTyping, onSendMessage }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAiTyping]);

  return (
    <div className="h-full flex flex-col bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        <div className="flex justify-center mb-4">
          <span className="text-xs text-zinc-600 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
            Secure AI Channel - End-to-End Encrypted
          </span>
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-2 mb-1">
              {msg.sender === 'AI Assistant' && <Bot size={12} className="text-cyan-500"/>}
              <span className="text-xs font-bold text-zinc-400">{msg.sender}</span>
              <span className="text-[10px] text-zinc-600 font-mono">{msg.time}</span>
            </div>
            <div className={`max-w-[80%] px-4 py-3 text-sm shadow-lg ${
              msg.sender === 'You' 
                ? 'bg-cyan-900/50 text-cyan-50 border border-cyan-800 rounded-2xl rounded-tr-sm' 
                : 'bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-2xl rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isAiTyping && (
          <div className="flex items-center gap-2">
            <Bot size={12} className="text-cyan-500"/>
            <div className="bg-zinc-800 px-4 py-3 rounded-2xl rounded-tl-sm border border-zinc-700">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={onSendMessage} className="p-4 bg-zinc-900 border-t border-zinc-800 flex gap-2">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Ask the AI to cross-reference evidence or check databases..."
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500 transition-colors placeholder-zinc-600"
        />
        <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          <ChevronRight size={20} />
        </button>
      </form>
    </div>
  );
};

export default ChatTab;
