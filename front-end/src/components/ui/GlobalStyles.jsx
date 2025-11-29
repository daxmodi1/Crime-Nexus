import React from 'react';

const GlobalStyles = () => (
  <style>{`
    .scrollbar-thin::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .scrollbar-thin::-webkit-scrollbar-track {
      background: #18181b; /* zinc-900 */
    }
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background-color: #3f3f46; /* zinc-700 */
      border-radius: 4px;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb:hover {
      background-color: #52525b; /* zinc-600 */
    }
  `}</style>
);

export default GlobalStyles;
