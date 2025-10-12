/**
 * Light Theme Page Template
 * 
 * Use this template as a reference for migrating pages to light theme.
 * Copy the structure and adapt to your specific page needs.
 */

'use client';

import React, { useState } from 'react';
import GradientColorPicker from '@/components/dev/GradientColorPicker';
// ... other imports

export default function YourPage() {
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  // ... other state

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 p-4 overflow-hidden relative font-['Inter',sans-serif]" data-gradient-bg>
      {/* ========== ANIMATED LIQUID BLOBS ========== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-300 to-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" 
          style={{ animation: 'blob1 25s ease-in-out infinite' }} 
          data-blob="1"
        ></div>
        <div 
          className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-300 to-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" 
          style={{ animation: 'blob2 30s ease-in-out infinite' }} 
          data-blob="2"
        ></div>
        <div 
          className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-gradient-to-br from-emerald-300 to-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" 
          style={{ animation: 'blob3 28s ease-in-out infinite' }} 
          data-blob="3"
        ></div>
        <div 
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-indigo-200 to-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" 
          style={{ animation: 'blob4 32s ease-in-out infinite' }} 
          data-blob="4"
        ></div>
      </div>

      {/* ========== NOISE TEXTURE OVERLAY ========== */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      ></div>

      {/* ========== ANIMATION KEYFRAMES ========== */}
      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 30px) scale(1.15); }
          66% { transform: translate(30px, -30px) scale(0.95); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, 20px) scale(0.9); }
          66% { transform: translate(-30px, -40px) scale(1.1); }
        }
        @keyframes blob4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-25px, -35px) scale(1.05); }
          66% { transform: translate(40px, 25px) scale(0.95); }
        }
      `}</style>

      {/* ========== PAGE CONTENT (relative z-10) ========== */}
      <div className="relative z-10">
        
        {/* ========== GLASSMORPHIC CARD ========== */}
        <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          
          {/* ========== HEADING ========== */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Page Title
          </h1>
          
          {/* ========== DESCRIPTION ========== */}
          <p className="text-gray-700 mb-6">
            Page description text
          </p>

          {/* ========== GLASS INPUT FIELD ========== */}
          <input
            type="text"
            className="w-full bg-white/50 backdrop-blur-sm rounded-xl border border-white/80 px-4 py-3 text-gray-900 placeholder-gray-500 outline-none focus:bg-white/60 focus:border-indigo-200 transition-all duration-300"
            placeholder="Enter text..."
          />

          {/* ========== GRADIENT BUTTON (Primary) ========== */}
          <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 rounded-xl shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all">
            Primary Action
          </button>

          {/* ========== GLASS BUTTON (Secondary) ========== */}
          <button className="w-full bg-white/50 backdrop-blur-sm rounded-xl border border-white/80 px-4 py-3 text-gray-900 hover:bg-white/60 transition-all">
            Secondary Action
          </button>

          {/* ========== GLASS CARD (Nested) ========== */}
          <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-white/80 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Card Title</h3>
            <p className="text-gray-700 text-sm">Card content</p>
          </div>

          {/* ========== GRID OF GLASS CARDS ========== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-white/80 p-4">
              <h4 className="font-medium text-gray-900">Item 1</h4>
              <p className="text-gray-700 text-sm">Description</p>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-white/80 p-4">
              <h4 className="font-medium text-gray-900">Item 2</h4>
              <p className="text-gray-700 text-sm">Description</p>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-white/80 p-4">
              <h4 className="font-medium text-gray-900">Item 3</h4>
              <p className="text-gray-700 text-sm">Description</p>
            </div>
          </div>

          {/* ========== ERROR MESSAGE ========== */}
          <div className="bg-red-100 border border-red-300 text-red-800 rounded-xl p-3">
            Error message text
          </div>

          {/* ========== SUCCESS MESSAGE ========== */}
          <div className="bg-green-100 border border-green-300 text-green-800 rounded-xl p-3">
            Success message text
          </div>

          {/* ========== INFO MESSAGE ========== */}
          <div className="bg-blue-100 border border-blue-300 text-blue-800 rounded-xl p-3">
            Info message text
          </div>

          {/* ========== LOADING SPINNER ========== */}
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>

        </div>

      </div>

      {/* ========== GRADIENT COLOR PICKER (Dev Only) ========== */}
      {process.env.NODE_ENV === 'development' && !showGradientPicker && (
        <button
          onClick={() => setShowGradientPicker(true)}
          className="fixed bottom-4 left-4 z-50 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all text-sm font-medium text-gray-700"
        >
          🎨 Gradient Picker
        </button>
      )}

      {showGradientPicker && (
        <GradientColorPicker onClose={() => setShowGradientPicker(false)} />
      )}
    </div>
  );
}

/**
 * CLASS NAME REFERENCE
 * 
 * Background:
 * - Main: bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50
 * 
 * Cards:
 * - Primary: bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)]
 * - Secondary: bg-white/50 backdrop-blur-sm rounded-xl border border-white/80
 * 
 * Inputs:
 * - Default: bg-white/50 backdrop-blur-sm rounded-xl border border-white/80 px-4 py-3
 * - Focus: focus:bg-white/60 focus:border-indigo-200
 * 
 * Buttons:
 * - Primary: bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl py-4
 * - Secondary: bg-white/50 backdrop-blur-sm rounded-xl border border-white/80
 * 
 * Text:
 * - Primary: text-gray-900
 * - Secondary: text-gray-700
 * - Tertiary: text-gray-600
 * - Placeholder: text-gray-500
 * 
 * Borders:
 * - Primary: border-white/80
 * - Secondary: border-white/60
 * 
 * Shadows:
 * - Card: shadow-[0_8px_32px_rgba(0,0,0,0.08)]
 * - Button: shadow-md
 * 
 * Transitions:
 * - All: transition-all duration-300
 * - Colors: transition-colors duration-300
 * - Transform: transition-transform duration-300
 */
