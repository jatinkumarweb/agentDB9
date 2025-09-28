'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';

interface WorkspaceContextType {
  // The context can expose additional workspace-related functionality
  // For now, it mainly initializes the workspace
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const useWorkspaceContext = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
  }
  return context;
};

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const { setCurrentWorkspace, refreshWorkspace } = useWorkspaceStore();

  useEffect(() => {
    // Initialize default workspace
    const defaultWorkspace = {
      id: 'default',
      name: 'AgentDB9 Workspace',
      path: '/home/coder/workspace',
      description: 'Main development workspace'
    };

    setCurrentWorkspace(defaultWorkspace);
    
    // Refresh workspace files
    refreshWorkspace().catch(console.error);
  }, [setCurrentWorkspace, refreshWorkspace]);

  const value: WorkspaceContextType = {
    // Add any additional context methods here
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};