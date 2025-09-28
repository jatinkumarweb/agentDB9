'use client';

import React, { createContext, useContext } from 'react';
import { useAgentActivity, UseAgentActivityReturn } from '@/hooks/useAgentActivity';

const AgentActivityContext = createContext<UseAgentActivityReturn | undefined>(undefined);

export const useAgentActivityContext = () => {
  const context = useContext(AgentActivityContext);
  if (context === undefined) {
    throw new Error('useAgentActivityContext must be used within an AgentActivityProvider');
  }
  return context;
};

interface AgentActivityProviderProps {
  children: React.ReactNode;
}

export const AgentActivityProvider: React.FC<AgentActivityProviderProps> = ({ children }) => {
  const agentActivityData = useAgentActivity();

  return (
    <AgentActivityContext.Provider value={agentActivityData}>
      {children}
    </AgentActivityContext.Provider>
  );
};