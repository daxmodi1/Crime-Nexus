import React from 'react';

const GlobalStyles = () => (
  <style>{`
    /* Smooth custom scrollbar */
    .scrollbar-thin::-webkit-scrollbar {
      width: 7px;
      height: 7px;
    }
    .scrollbar-thin::-webkit-scrollbar-track {
      background: transparent;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background-color: #d4d4cf;
      border-radius: 4px;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb:hover {
      background-color: #a8a8a3;
    }

    /* Hide scrollbar but keep scroll functionality */
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }

    /* Smooth animations */
    @keyframes fade-in-up {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-in-up {
      animation: fade-in-up 0.6s ease-out;
    }

    /* Gradient utilities */
    .bg-linear-to-r {
      background-image: linear-gradient(to right, var(--tw-gradient-stops));
    }

    .bg-linear-to-br {
      background-image: linear-gradient(to bottom right, var(--tw-gradient-stops));
    }

    /* Focus ring for accessibility */
    .focus-ring {
      outline: 2px solid #1f1f1f;
      outline-offset: 2px;
    }
  `}</style>
);

export default GlobalStyles;
