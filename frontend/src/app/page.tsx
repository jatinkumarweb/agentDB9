import React from 'react';
import Link from 'next/link';
import { MessageCircle, Bot, Code, TestTube, Settings } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          AgentDB9 Coding Agent
        </h1>
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Welcome to the Coding Agent Environment
          </h2>
          <p className="text-gray-600 mb-6">
            This is a multi-container TypeScript development environment for building
            AI-powered coding agents.
          </p>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Link 
              href="/chat" 
              className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
            >
              <MessageCircle className="w-8 h-8 text-blue-600 mr-4 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-semibold text-blue-900">Chat Interface</h3>
                <p className="text-blue-700 text-sm">Test LLM integration with agents</p>
              </div>
            </Link>
            
            <Link 
              href="/test/env" 
              className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
            >
              <TestTube className="w-8 h-8 text-green-600 mr-4 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-semibold text-green-900">Environment Tests</h3>
                <p className="text-green-700 text-sm">Check system health and APIs</p>
              </div>
            </Link>
            
            <Link 
              href="/models" 
              className="flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
            >
              <Settings className="w-8 h-8 text-purple-600 mr-4 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-semibold text-purple-900">Model Management</h3>
                <p className="text-purple-700 text-sm">Download models & configure APIs</p>
              </div>
            </Link>
          </div>

          {/* Architecture Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900">Frontend</h3>
              <p className="text-blue-700 text-sm">Next.js + TypeScript</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900">Backend</h3>
              <p className="text-green-700 text-sm">Node.js + Express</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900">LLM Service</h3>
              <p className="text-purple-700 text-sm">AI Processing</p>
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Bot className="w-5 h-5 mr-2" />
            API Endpoints Available
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Agents</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• Create & manage agents</li>
                <li>• Execute coding tasks</li>
                <li>• Agent configuration</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Projects</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• Project management</li>
                <li>• File operations</li>
                <li>• Git integration</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Conversations</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• Chat interface</li>
                <li>• Message handling</li>
                <li>• Agent responses</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}