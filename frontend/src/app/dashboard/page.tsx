'use client';

import React from 'react';
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

function DashboardContent() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">AgentDB9</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">{user?.username || 'User'}</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
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
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Bot className="h-8 w-8 text-blue-600" />
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
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <MessageCircle className="h-8 w-8 text-green-600" />
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
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Code className="h-8 w-8 text-purple-600" />
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
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Database className="h-8 w-8 text-orange-600" />
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
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Activity className="h-8 w-8 text-red-600" />
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
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Settings className="h-8 w-8 text-gray-600" />
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
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
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