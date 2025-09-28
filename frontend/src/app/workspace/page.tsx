'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VSCodeContainer from '@/components/VSCodeContainer';
import CollaborationPanel from '@/components/CollaborationPanel';
import { AgentActivityProvider } from '@/contexts/AgentActivityContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function WorkspacePage() {
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?returnUrl=/workspace');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Show login redirect message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceProvider>
      <AgentActivityProvider>
        <div className="h-screen w-full relative">
          {/* User info header */}
          <div className="absolute top-4 left-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {user?.username || user?.email}
              </span>
            </div>
          </div>

          <VSCodeContainer 
            className={`h-full transition-all duration-300 ${isCollaborationOpen ? 'mr-80' : ''}`}
            showHeader={true}
            allowPopout={true}
          />
          
          <CollaborationPanel
            isOpen={isCollaborationOpen}
            onToggle={() => setIsCollaborationOpen(!isCollaborationOpen)}
          />
        </div>
      </AgentActivityProvider>
    </WorkspaceProvider>
  );
}