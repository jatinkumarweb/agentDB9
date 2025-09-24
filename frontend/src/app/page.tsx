import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          AgentDB9 Coding Agent
        </h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Welcome to the Coding Agent Environment
          </h2>
          <p className="text-gray-600 mb-4">
            This is a multi-container TypeScript development environment for building
            AI-powered coding agents.
          </p>
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
      </div>
    </main>
  );
}