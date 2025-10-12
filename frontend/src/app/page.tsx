'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Bot, Code, TestTube, Settings } from 'lucide-react';
import GradientColorPicker from '@/components/dev/GradientColorPicker';

export default function Home() {
  const [showGradientPicker, setShowGradientPicker] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 p-8 overflow-hidden relative font-['Inter',sans-serif]" data-gradient-bg>
      {/* Animated liquid blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-300 to-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" style={{ animation: 'blob1 25s ease-in-out infinite' }} data-blob="1"></div>
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-300 to-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" style={{ animation: 'blob2 30s ease-in-out infinite' }} data-blob="2"></div>
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-gradient-to-br from-emerald-300 to-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" style={{ animation: 'blob3 28s ease-in-out infinite' }} data-blob="3"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-indigo-200 to-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" style={{ animation: 'blob4 32s ease-in-out infinite' }} data-blob="4"></div>
      </div>

      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat' }}></div>

      <style>{`
        @keyframes blob1 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
        @keyframes blob2 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(-40px, 30px) scale(1.15); } 66% { transform: translate(30px, -30px) scale(0.95); } }
        @keyframes blob3 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(50px, 20px) scale(0.9); } 66% { transform: translate(-30px, -40px) scale(1.1); } }
        @keyframes blob4 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(-25px, -35px) scale(1.05); } 66% { transform: translate(40px, 25px) scale(0.95); } }
      `}</style>

      <div className="relative z-10 max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-gray-900 mb-8">
          AgentDB9 Coding Agent
        </h1>
        <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] mb-8">
          <h2 className="text-3xl font-semibold text-gray-900 mb-4">
            Welcome to the Coding Agent Environment
          </h2>
          <p className="text-gray-700 mb-6 text-lg">
            This is a multi-container TypeScript development environment for building
            AI-powered coding agents.
          </p>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Link 
              href="/workspace" 
              className="flex items-center p-4 bg-white/50 backdrop-blur-sm hover:bg-white/60 rounded-xl border border-white/80 transition-all group shadow-sm hover:shadow-md"
            >
              <Code className="w-8 h-8 text-indigo-600 mr-4 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-semibold text-gray-900">VS Code Workspace</h3>
                <p className="text-gray-700 text-sm">Full IDE with agent monitoring</p>
              </div>
            </Link>
            
            <Link 
              href="/chat" 
              className="flex items-center p-4 bg-white/50 backdrop-blur-sm hover:bg-white/60 rounded-xl border border-white/80 transition-all group shadow-sm hover:shadow-md"
            >
              <MessageCircle className="w-8 h-8 text-blue-600 mr-4 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-semibold text-gray-900">Chat Interface</h3>
                <p className="text-gray-700 text-sm">Test LLM integration with agents</p>
              </div>
            </Link>
            
            <Link 
              href="/test/env" 
              className="flex items-center p-4 bg-white/50 backdrop-blur-sm hover:bg-white/60 rounded-xl border border-white/80 transition-all group shadow-sm hover:shadow-md"
            >
              <TestTube className="w-8 h-8 text-emerald-600 mr-4 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-semibold text-gray-900">Environment Tests</h3>
                <p className="text-gray-700 text-sm">Check system health and APIs</p>
              </div>
            </Link>
            
            <Link 
              href="/models" 
              className="flex items-center p-4 bg-white/50 backdrop-blur-sm hover:bg-white/60 rounded-xl border border-white/80 transition-all group shadow-sm hover:shadow-md"
            >
              <Settings className="w-8 h-8 text-purple-600 mr-4 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-semibold text-gray-900">Model Management</h3>
                <p className="text-gray-700 text-sm">Download models & configure APIs</p>
              </div>
            </Link>
          </div>

          {/* Architecture Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/80">
              <h3 className="font-semibold text-gray-900">Frontend</h3>
              <p className="text-gray-700 text-sm">Next.js + TypeScript</p>
            </div>
            <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/80">
              <h3 className="font-semibold text-gray-900">Backend</h3>
              <p className="text-gray-700 text-sm">Node.js + Express</p>
            </div>
            <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/80">
              <h3 className="font-semibold text-gray-900">LLM Service</h3>
              <p className="text-gray-700 text-sm">AI Processing</p>
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Bot className="w-6 h-6 mr-2" />
            API Endpoints Available
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Agents</h4>
              <ul className="text-gray-700 space-y-1">
                <li>• Create & manage agents</li>
                <li>• Execute coding tasks</li>
                <li>• Agent configuration</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Projects</h4>
              <ul className="text-gray-700 space-y-1">
                <li>• Project management</li>
                <li>• File operations</li>
                <li>• Git integration</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Conversations</h4>
              <ul className="text-gray-700 space-y-1">
                <li>• Chat interface</li>
                <li>• Message handling</li>
                <li>• Agent responses</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Gradient Color Picker */}
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
    </main>
  );
}