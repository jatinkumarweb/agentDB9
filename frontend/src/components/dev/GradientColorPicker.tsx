'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Palette } from 'lucide-react';

interface GradientColorPickerProps {
  onClose?: () => void;
}

export default function GradientColorPicker({ onClose }: GradientColorPickerProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Gradient colors state
  const [gradientColors, setGradientColors] = useState({
    from: '#eff6ff', // blue-50
    via: '#ecfdf5',  // emerald-50
    to: '#faf5ff',   // purple-50
  });

  // Blob colors state
  const [blobColors, setBlobColors] = useState({
    blob1From: '#93c5fd', // blue-300
    blob1To: '#a5f3fc',   // cyan-200
    blob2From: '#d8b4fe', // purple-300
    blob2To: '#fbcfe8',   // pink-200
    blob3From: '#6ee7b7', // emerald-300
    blob3To: '#99f6e4',   // teal-200
    blob4From: '#c7d2fe', // indigo-200
    blob4To: '#bfdbfe',   // blue-200
  });

  // Apply colors to the page
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply background gradient
    const bgElement = document.querySelector('[data-gradient-bg]') as HTMLElement;
    if (bgElement) {
      bgElement.style.background = `linear-gradient(to bottom right, ${gradientColors.from}, ${gradientColors.via}, ${gradientColors.to})`;
    }

    // Apply blob colors
    const blob1 = document.querySelector('[data-blob="1"]') as HTMLElement;
    if (blob1) {
      blob1.style.background = `linear-gradient(to bottom right, ${blobColors.blob1From}, ${blobColors.blob1To})`;
    }

    const blob2 = document.querySelector('[data-blob="2"]') as HTMLElement;
    if (blob2) {
      blob2.style.background = `linear-gradient(to bottom right, ${blobColors.blob2From}, ${blobColors.blob2To})`;
    }

    const blob3 = document.querySelector('[data-blob="3"]') as HTMLElement;
    if (blob3) {
      blob3.style.background = `linear-gradient(to bottom right, ${blobColors.blob3From}, ${blobColors.blob3To})`;
    }

    const blob4 = document.querySelector('[data-blob="4"]') as HTMLElement;
    if (blob4) {
      blob4.style.background = `linear-gradient(to bottom right, ${blobColors.blob4From}, ${blobColors.blob4To})`;
    }
  }, [gradientColors, blobColors]);

  const handleCopyCSS = () => {
    const css = `
/* Background Gradient */
background: linear-gradient(to bottom right, ${gradientColors.from}, ${gradientColors.via}, ${gradientColors.to});

/* Blob 1 */
background: linear-gradient(to bottom right, ${blobColors.blob1From}, ${blobColors.blob1To});

/* Blob 2 */
background: linear-gradient(to bottom right, ${blobColors.blob2From}, ${blobColors.blob2To});

/* Blob 3 */
background: linear-gradient(to bottom right, ${blobColors.blob3From}, ${blobColors.blob3To});

/* Blob 4 */
background: linear-gradient(to bottom right, ${blobColors.blob4From}, ${blobColors.blob4To});
    `.trim();

    navigator.clipboard.writeText(css);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyTailwind = () => {
    const tailwind = `
{/* Background */}
className="bg-gradient-to-br from-[${gradientColors.from}] via-[${gradientColors.via}] to-[${gradientColors.to}]"

{/* Blob 1 */}
className="bg-gradient-to-br from-[${blobColors.blob1From}] to-[${blobColors.blob1To}]"

{/* Blob 2 */}
className="bg-gradient-to-br from-[${blobColors.blob2From}] to-[${blobColors.blob2To}]"

{/* Blob 3 */}
className="bg-gradient-to-br from-[${blobColors.blob3From}] to-[${blobColors.blob3To}]"

{/* Blob 4 */}
className="bg-gradient-to-br from-[${blobColors.blob4From}] to-[${blobColors.blob4To}]"
    `.trim();

    navigator.clipboard.writeText(tailwind);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200"
          aria-label="Open gradient color picker"
        >
          <Palette className="w-6 h-6 text-indigo-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          <h3 className="font-semibold">Gradient Color Picker</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="hover:bg-white/20 rounded-lg p-1 transition-colors"
            aria-label="Minimize"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="hover:bg-white/20 rounded-lg p-1 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {/* Background Gradient */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Background Gradient</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">From Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={gradientColors.from}
                  onChange={(e) => setGradientColors({ ...gradientColors, from: e.target.value })}
                  className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={gradientColors.from}
                  onChange={(e) => setGradientColors({ ...gradientColors, from: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Via Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={gradientColors.via}
                  onChange={(e) => setGradientColors({ ...gradientColors, via: e.target.value })}
                  className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={gradientColors.via}
                  onChange={(e) => setGradientColors({ ...gradientColors, via: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">To Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={gradientColors.to}
                  onChange={(e) => setGradientColors({ ...gradientColors, to: e.target.value })}
                  className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={gradientColors.to}
                  onChange={(e) => setGradientColors({ ...gradientColors, to: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Blob Colors */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Blob Colors</h4>
          
          {/* Blob 1 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 mb-2">Blob 1 (Blue/Cyan)</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={blobColors.blob1From}
                  onChange={(e) => setBlobColors({ ...blobColors, blob1From: e.target.value })}
                  className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={blobColors.blob1From}
                  onChange={(e) => setBlobColors({ ...blobColors, blob1From: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="From"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={blobColors.blob1To}
                  onChange={(e) => setBlobColors({ ...blobColors, blob1To: e.target.value })}
                  className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={blobColors.blob1To}
                  onChange={(e) => setBlobColors({ ...blobColors, blob1To: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="To"
                />
              </div>
            </div>
          </div>

          {/* Blob 2 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 mb-2">Blob 2 (Purple/Pink)</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={blobColors.blob2From}
                  onChange={(e) => setBlobColors({ ...blobColors, blob2From: e.target.value })}
                  className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={blobColors.blob2From}
                  onChange={(e) => setBlobColors({ ...blobColors, blob2From: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="From"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={blobColors.blob2To}
                  onChange={(e) => setBlobColors({ ...blobColors, blob2To: e.target.value })}
                  className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={blobColors.blob2To}
                  onChange={(e) => setBlobColors({ ...blobColors, blob2To: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="To"
                />
              </div>
            </div>
          </div>

          {/* Blob 3 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 mb-2">Blob 3 (Emerald/Teal)</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={blobColors.blob3From}
                  onChange={(e) => setBlobColors({ ...blobColors, blob3From: e.target.value })}
                  className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={blobColors.blob3From}
                  onChange={(e) => setBlobColors({ ...blobColors, blob3From: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="From"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={blobColors.blob3To}
                  onChange={(e) => setBlobColors({ ...blobColors, blob3To: e.target.value })}
                  className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={blobColors.blob3To}
                  onChange={(e) => setBlobColors({ ...blobColors, blob3To: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="To"
                />
              </div>
            </div>
          </div>

          {/* Blob 4 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 mb-2">Blob 4 (Indigo/Blue)</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={blobColors.blob4From}
                  onChange={(e) => setBlobColors({ ...blobColors, blob4From: e.target.value })}
                  className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={blobColors.blob4From}
                  onChange={(e) => setBlobColors({ ...blobColors, blob4From: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="From"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={blobColors.blob4To}
                  onChange={(e) => setBlobColors({ ...blobColors, blob4To: e.target.value })}
                  className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={blobColors.blob4To}
                  onChange={(e) => setBlobColors({ ...blobColors, blob4To: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="To"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Copy Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCopyCSS}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copy CSS
          </button>
          <button
            onClick={handleCopyTailwind}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copy Tailwind
          </button>
        </div>
      </div>
    </div>
  );
}
