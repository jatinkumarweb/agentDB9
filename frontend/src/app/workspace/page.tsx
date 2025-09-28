'use client';

import React, { useState } from 'react';
import VSCodeContainer from '@/components/VSCodeContainer';
import CollaborationPanel from '@/components/CollaborationPanel';
import { AgentActivityProvider } from '@/contexts/AgentActivityContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';

export default function WorkspacePage() {
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);

  return (
    <WorkspaceProvider>
      <AgentActivityProvider>
        <div className="h-screen w-full relative">
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