import React, { useRef, useEffect } from 'react';
import { Bot, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Markdown message component for AI responses
const MarkdownMessage = ({ content }) => {
  return (
    <div className="prose prose-sm max-w-none
      prose-headings:text-[#1f1f1f] prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
      prose-h2:text-base prose-h2:border-b prose-h2:border-[#e8e8e4] prose-h2:pb-2
      prose-h3:text-sm prose-h3:text-[#3a3a3a]
      prose-p:text-[#3a3a3a] prose-p:leading-relaxed prose-p:my-3
      prose-strong:text-[#1f1f1f] prose-strong:font-semibold
      prose-ul:my-2 prose-li:text-[#3a3a3a] prose-li:my-1 prose-li:ml-4
      prose-table:text-xs prose-table:my-4
      prose-th:bg-[#f4f4f4] prose-th:text-[#1f1f1f] prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold
      prose-td:bg-white prose-td:text-[#3a3a3a] prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-[#e8e8e4]
      prose-hr:border-[#e8e8e4] prose-hr:my-4
      prose-code:text-[#1f1f1f] prose-code:bg-[#f4f4f4] prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm
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
    <div className="h-full flex flex-col w-full">
      {/* Message Container */}
      <div className="flex-1 w-full overflow-y-auto scrollbar-thin scrollbar-thumb-[#d4d4cf] scrollbar-track-transparent">
        <div className="max-w-4xl mx-auto w-full px-4 space-y-6 pt-4 pb-8">

        
        {/* Empty State */}
        {messages.length === 0 && !isAiTyping && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-5 rounded-2xl bg-[#1f1f1f] mb-4">
              <Bot size={32} className="text-white" />
            </div>
            <h3 className="text-[#1f1f1f] font-semibold mb-2 text-lg">Begin Your Investigation</h3>
            <p className="text-[#a1a19b] text-sm max-w-sm leading-relaxed">
              Upload evidence files and ask questions about forensic findings. The AI will analyze documents and provide insights.
            </p>
          </div>
        )}
        
        {/* Messages */}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
            {/* Message header */}
            <div className="flex items-center gap-2 mb-2">
              {msg.sender === 'AI Assistant' && <Bot size={13} className="text-[#71717a]"/>}
              <span className="text-xs font-semibold text-[#71717a]">{msg.sender}</span>
              <span className="text-[10px] text-[#a1a19b] font-mono">{msg.time}</span>
            </div>
            
            {/* Message bubble */}
            <div className={`px-5 py-4 text-sm rounded-[24px] max-w-[85%] ${
              msg.sender === 'You' 
                ? 'bg-[#1f1f1f] text-white rounded-br-sm shadow-[0_2px_8px_rgba(0,0,0,0.12)]' 
                : 'bg-white text-[#1f1f1f] border border-[#e8e8e4] rounded-bl-sm shadow-sm'
            }`}>
              {msg.sender === 'AI Assistant' ? (
                <MarkdownMessage content={msg.text} />
              ) : (
                <p className="leading-relaxed">{msg.text}</p>
              )}
            </div>

            {/* Sources (if available) */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-2 text-xs text-[#a1a19b]">
                <span className="block mb-1">Sources:</span>
                <div className="flex flex-wrap gap-1">
                  {msg.sources.map((src, idx) => (
                    <span key={idx} className="bg-[#f4f4f4] px-2 py-1 rounded-lg border border-[#e8e8e4] text-[#71717a]">
                      {src}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isAiTyping && (
          <div className="flex items-center gap-2">
            <Bot size={13} className="text-[#71717a]"/>
            <div className="bg-[#f4f4f4] px-5 py-4 rounded-2xl rounded-tl-sm border border-[#e8e8e4]">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-[#1f1f1f] rounded-full animate-bounce opacity-60" style={{animationDelay: '0ms'}}></span>
                <span className="w-2 h-2 bg-[#1f1f1f] rounded-full animate-bounce opacity-60" style={{animationDelay: '150ms'}}></span>
                <span className="w-2 h-2 bg-[#1f1f1f] rounded-full animate-bounce opacity-60" style={{animationDelay: '300ms'}}></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="w-full flex justify-center pb-4 px-4">
        <form onSubmit={onSendMessage} className="w-full max-w-4xl flex gap-3 relative">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Ask about evidence, patterns, or connections..."
          className="flex-1 bg-white border border-[#e8e8e4] rounded-full px-6 py-3.5 text-sm text-[#1f1f1f] focus:outline-none focus:border-[#1f1f1f] focus:ring-2 focus:ring-[#1f1f1f]/10 transition-all placeholder-[#a1a19b] shadow-sm"
          disabled={isAiTyping}
        />
        <button 
          type="submit" 
          disabled={isAiTyping}
          className="bg-[#1f1f1f] hover:bg-[#3a3a3a] disabled:bg-[#d4d4cf] disabled:text-[#a1a19b] text-white p-3.5 px-4 rounded-full transition-all flex-shrink-0 border-0 shadow-sm"
        >
          <Send size={18} />
        </button>
        </form>
      </div>
    </div>
  );
};

export default ChatTab;
