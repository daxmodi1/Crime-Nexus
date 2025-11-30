import React, { useRef, useEffect } from 'react';
import { Bot, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Markdown message component for AI responses
const MarkdownMessage = ({ content }) => {
  return (
    <div className="prose prose-invert prose-sm max-w-none
      prose-headings:text-cyan-400 prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
      prose-h2:text-base prose-h2:border-b prose-h2:border-zinc-700 prose-h2:pb-1
      prose-h3:text-sm prose-h3:text-zinc-300
      prose-p:text-zinc-300 prose-p:leading-relaxed prose-p:my-2
      prose-strong:text-cyan-300
      prose-ul:my-2 prose-li:text-zinc-300 prose-li:my-0.5
      prose-table:text-xs prose-table:my-3
      prose-th:bg-zinc-700/50 prose-th:text-zinc-200 prose-th:px-3 prose-th:py-1.5 prose-th:text-left prose-th:font-medium
      prose-td:bg-zinc-800/30 prose-td:text-zinc-300 prose-td:px-3 prose-td:py-1.5 prose-td:border-t prose-td:border-zinc-700/50
      prose-hr:border-zinc-700 prose-hr:my-3
      prose-code:text-cyan-300 prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded
    ">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

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
        
        {messages.length === 0 && !isAiTyping && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-zinc-800/50 mb-4">
              <Bot size={32} className="text-zinc-600" />
            </div>
            <h3 className="text-zinc-400 font-medium mb-2">Start Your Investigation</h3>
            <p className="text-zinc-500 text-sm max-w-sm">
              Ask questions about your uploaded evidence. The AI will analyze documents and provide forensic insights.
            </p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-2 mb-1">
              {msg.sender === 'AI Assistant' && <Bot size={12} className="text-cyan-500"/>}
              <span className="text-xs font-bold text-zinc-400">{msg.sender}</span>
              <span className="text-[10px] text-zinc-600 font-mono">{msg.time}</span>
            </div>
            <div className={`px-4 py-3 text-sm shadow-lg ${
              msg.sender === 'You' 
                ? 'max-w-[80%] bg-cyan-900/50 text-cyan-50 border border-cyan-800 rounded-2xl rounded-tr-sm' 
                : 'max-w-[90%] bg-zinc-800/80 text-zinc-200 border border-zinc-700 rounded-2xl rounded-tl-sm'
            }`}>
              {msg.sender === 'AI Assistant' ? (
                <MarkdownMessage content={msg.text} />
              ) : (
                msg.text
              )}
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
