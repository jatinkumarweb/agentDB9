'use client';

import React, { ReactNode } from 'react';

interface LightThemeWrapperProps {
  children: ReactNode;
  showGradientPicker?: boolean;
}

export default function LightThemeWrapper({ children, showGradientPicker = false }: LightThemeWrapperProps) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        @keyframes slowFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .glass-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.05));
          backdrop-filter: blur(60px) saturate(200%) brightness(110%);
          -webkit-backdrop-filter: blur(60px) saturate(200%) brightness(110%);
          box-shadow: 
            0 8px 32px 0 rgba(31, 38, 135, 0.15),
            inset 0 1px 2px 0 rgba(255, 255, 255, 0.3),
            inset 0 -1px 1px 0 rgba(0, 0, 0, 0.05);
        }
        
        .glass-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 1.5rem;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .glass-input {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08));
          backdrop-filter: blur(30px) saturate(180%) brightness(105%);
          -webkit-backdrop-filter: blur(30px) saturate(180%) brightness(105%);
          box-shadow: 
            0 2px 12px 0 rgba(31, 38, 135, 0.1),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.25),
            inset 0 -1px 1px 0 rgba(0, 0, 0, 0.03);
        }

        .glass-input:focus-within {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15));
          backdrop-filter: blur(40px) saturate(180%) brightness(110%);
          -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(110%);
          box-shadow: 
            0 4px 16px 0 rgba(99, 102, 241, 0.2),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.3);
        }

        .glass-button {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.08));
          backdrop-filter: blur(30px) saturate(180%) brightness(105%);
          -webkit-backdrop-filter: blur(30px) saturate(180%) brightness(105%);
        }

        .glass-button:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.12));
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .thinking-dots span {
          animation: pulse 1.4s infinite;
        }
        .thinking-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .thinking-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 overflow-hidden relative" data-gradient-bg>
        {/* Animated liquid blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute -top-48 -left-48 w-[500px] h-[500px] bg-gradient-to-br from-blue-300 to-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 transition-all duration-1000"
            style={{ animation: 'slowFloat 25s ease-in-out infinite' }}
            data-blob="1"
          ></div>
          <div 
            className="absolute top-1/4 -right-48 w-[450px] h-[450px] bg-gradient-to-br from-purple-300 to-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
            style={{ animation: 'slowFloat 30s ease-in-out infinite', animationDelay: '5s' }}
            data-blob="2"
          ></div>
          <div 
            className="absolute -bottom-32 left-1/4 w-[480px] h-[480px] bg-gradient-to-br from-emerald-300 to-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-35 transition-all duration-1000"
            style={{ animation: 'slowFloat 28s ease-in-out infinite', animationDelay: '10s' }}
            data-blob="3"
          ></div>
          <div 
            className="absolute top-1/2 left-1/2 w-[420px] h-[420px] bg-gradient-to-br from-indigo-200 to-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-25"
            style={{ animation: 'slowFloat 32s ease-in-out infinite', animationDelay: '15s' }}
            data-blob="4"
          ></div>
        </div>

        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        ></div>

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>

        {/* Gradient Color Picker - Only in development */}
        {showGradientPicker && process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 z-50">
            <button
              className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all text-sm font-medium text-gray-700 hover:text-gray-900"
              onClick={() => {
                // This will be handled by the parent component
                const event = new CustomEvent('openGradientPicker');
                window.dispatchEvent(event);
              }}
            >
              🎨 Gradient Picker
            </button>
          </div>
        )}
      </div>
    </>
  );
}
