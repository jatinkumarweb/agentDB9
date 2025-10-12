'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Bot, 
  MessageCircle, 
  Settings, 
  LogOut, 
  User, 
  Activity,
  Code,
  Database,
  Zap
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAuthRedirect, authRedirectConfigs } from '@/hooks/useAuthRedirect';
import AuthGuard from '@/components/AuthGuard';
import toast from 'react-hot-toast';
import GradientColorPicker from '@/components/dev/GradientColorPicker';

function DashboardContent() {
  const { user, logout } = useAuthStore();
  const [showGradientPicker, setShowGradientPicker] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 relative overflow-hidden">
      {/* Animated Liquid Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        <div className="blob blob-4"></div>
      </div>

      {/* Noise Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-white/20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">AgentDB9</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">{user?.username || 'User'}</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 relative z-10">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="bg-white/80 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-2xl mb-6 border border-white/20">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Welcome back, {user?.username || 'User'}!
              </h2>
              <p className="text-gray-600">
                Manage your AI coding agents and projects from your dashboard.
              </p>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Create Agent */}
            <Link
              href="/agents/create"
              className="bg-white/80 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-2xl hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)] transition-all duration-300 border border-white/20 hover:scale-[1.02] group"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Bot className="h-8 w-8 text-blue-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Create Agent</h3>
                    <p className="text-sm text-gray-500">Build a new AI coding agent</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Start Chat */}
            <Link
              href="/chat"
              className="bg-white/80 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-2xl hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)] transition-all duration-300 border border-white/20 hover:scale-[1.02] group"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <MessageCircle className="h-8 w-8 text-green-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Start Chat</h3>
                    <p className="text-sm text-gray-500">Chat with your agents</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Manage Projects */}
            <Link
              href="/projects"
              className="bg-white/80 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-2xl hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)] transition-all duration-300 border border-white/20 hover:scale-[1.02] group"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Code className="h-8 w-8 text-purple-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Projects</h3>
                    <p className="text-sm text-gray-500">Manage your code projects</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Model Management */}
            <Link
              href="/models"
              className="bg-white/80 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-2xl hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)] transition-all duration-300 border border-white/20 hover:scale-[1.02] group"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Database className="h-8 w-8 text-orange-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Models</h3>
                    <p className="text-sm text-gray-500">Configure AI models</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Environment Tests */}
            <Link
              href="/test/env"
              className="bg-white/80 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-2xl hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)] transition-all duration-300 border border-white/20 hover:scale-[1.02] group"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Activity className="h-8 w-8 text-red-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">System Health</h3>
                    <p className="text-sm text-gray-500">Check environment status</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Settings */}
            <Link
              href="/settings"
              className="bg-white/80 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-2xl hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)] transition-all duration-300 border border-white/20 hover:scale-[1.02] group"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Settings className="h-8 w-8 text-gray-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Settings</h3>
                    <p className="text-sm text-gray-500">Configure preferences</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-2xl border border-white/20">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Recent Activity
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <Zap className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      Welcome to AgentDB9! Start by creating your first AI agent.
                    </p>
                    <p className="text-xs text-gray-500">Just now</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <User className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      Account created successfully
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Gradient Color Picker */}
      <GradientColorPicker 
        isVisible={showGradientPicker}
        onToggle={() => setShowGradientPicker(!showGradientPicker)}
      />

      {/* Animation Keyframes */}
      <style jsx global>{`
        @keyframes blob-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes blob-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 30px) scale(0.9); }
          66% { transform: translate(30px, -30px) scale(1.1); }
        }
        @keyframes blob-float-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, 40px) scale(1.1); }
          66% { transform: translate(-30px, -20px) scale(0.9); }
        }
        @keyframes blob-float-4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-35px, -40px) scale(0.9); }
          66% { transform: translate(35px, 30px) scale(1.1); }
        }

        .blob {
          position: absolute;
          border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
          opacity: 0.15;
          filter: blur(40px);
          will-change: transform;
        }

        .blob-1 {
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          top: -10%;
          left: -10%;
          animation: blob-float-1 28s ease-in-out infinite;
        }

        .blob-2 {
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          top: 40%;
          right: -5%;
          animation: blob-float-2 32s ease-in-out infinite;
        }

        .blob-3 {
          width: 450px;
          height: 450px;
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          bottom: -10%;
          left: 20%;
          animation: blob-float-3 30s ease-in-out infinite;
        }

        .blob-4 {
          width: 350px;
          height: 350px;
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          bottom: 30%;
          right: 20%;
          animation: blob-float-4 25s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function DashboardPage() {
  // Use auth redirect hook to protect this route
  useAuthRedirect(authRedirectConfigs.protected);

  return (
    <AuthGuard requireAuth={true}>
      <DashboardContent />
    </AuthGuard>
  );
}