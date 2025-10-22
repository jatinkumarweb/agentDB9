'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Loader2, ExternalLink, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import AgentActivityOverlay from './AgentActivityOverlay';

interface VSCodeContainerProps {
  className?: string;
  showHeader?: boolean;
  allowPopout?: boolean;
  workspaceId?: string | null;
  projectId?: string | null;
  projectName?: string | null;
}

export const VSCodeContainer: React.FC<VSCodeContainerProps> = ({ 
  className = '',
  showHeader = true,
  allowPopout = true,
  workspaceId = null,
  projectId = null,
  projectName = null
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vscodeUrl, setVscodeUrl] = useState<string>('');
  
  const { agentActivity } = useAgentActivity();
  const { currentWorkspace } = useWorkspaceStore();

  useEffect(() => {
    // Access VS Code directly on port 8080 (not through proxy)
    // VS Code is exposed directly and handles its own static resources
    // Only dev servers running inside VS Code container need proxy (ports 3000, 5173, etc.)
    const vscodeDirectUrl = process.env.NEXT_PUBLIC_VSCODE_URL || 'http://localhost:8080';
    const baseUrl = vscodeDirectUrl;
    
    // Determine which folder/workspace to open
    // If projectName is provided, open the project folder directly
    // Otherwise, open the default workspace folder
    let workspacePath = '/home/coder/workspace';
    if (projectName) {
      // Create safe folder name (same logic as backend ProjectsService.initWorkspaceFolder)
      // This must match the backend logic exactly to open the correct folder
      const safeFolderName = projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      // Open the project folder directly (not a .code-workspace file)
      // Path matches backend: /workspace/projects/${safeFolderName}
      // In VSCode container, /workspace is mounted at /home/coder/workspace
      workspacePath = `/home/coder/workspace/projects/${safeFolderName}`;
    }
    
    // Use folder parameter for code-server to open the folder directly
    // This tells VSCode to open the folder immediately without showing "Open Folder" dialog
    const url = `${baseUrl}/?folder=${encodeURIComponent(workspacePath)}`;
    
    console.log('[VSCodeContainer] Opening workspace:', workspacePath);
    console.log('[VSCodeContainer] URL:', url);
    console.log('[VSCodeContainer] Backend proxy URL:', baseUrl);
    console.log('[VSCodeContainer] Project:', { projectId, projectName });
    
    setVscodeUrl(url);
    setIsLoading(true);
  }, [workspaceId, projectId, projectName]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
    
    // Check if iframe loaded successfully by checking for auth errors
    const iframe = iframeRef.current;
    if (iframe) {
      // Listen for auth errors from the iframe
      iframe.onload = () => {
        try {
          // Check if the iframe content indicates an auth error
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc && (iframeDoc.title.includes('401') || iframeDoc.title.includes('403'))) {
            setError('Authentication failed. Please log in again.');
            return;
          }
        } catch (err) {
          // Cross-origin restrictions prevent access, which is normal
          console.debug('Cannot access iframe content (expected for cross-origin)');
        }
        
        // Set up message listener for VS Code events
        window.addEventListener('message', handleVSCodeMessage);
      };
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load VS Code. Please check your authentication or try refreshing the page.');
  };

  const handleVSCodeMessage = (event: MessageEvent) => {
    // Handle messages from VS Code iframe
    if (event.origin !== new URL(vscodeUrl).origin) {
      return;
    }

    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      
      switch (data.type) {
        case 'file-opened':
          console.log('File opened in VS Code:', data.file);
          break;
        case 'file-saved':
          console.log('File saved in VS Code:', data.file);
          break;
        case 'terminal-output':
          console.log('Terminal output:', data.output);
          break;
        default:
          console.log('VS Code message:', data);
      }
    } catch (err) {
      console.warn('Could not parse VS Code message:', err);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handlePopout = () => {
    window.open(vscodeUrl, '_blank', 'width=1200,height=800');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Send agent activity to VS Code
  useEffect(() => {
    if (agentActivity.length > 0 && iframeRef.current?.contentWindow) {
      const latestActivity = agentActivity[agentActivity.length - 1];
      
      try {
        iframeRef.current.contentWindow.postMessage({
          type: 'agent-activity',
          activity: latestActivity
        }, '*');
      } catch (err) {
        console.warn('Could not send agent activity to VS Code:', err);
      }
    }
  }, [agentActivity]);

  const containerClasses = `
    ${className}
    ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative'}
    flex flex-col h-full
  `;

  return (
    <div className={containerClasses}>
      {showHeader && (
        <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              VS Code - AgentDB9 Workspace
            </span>
            {isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Refresh VS Code"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            {allowPopout && (
              <button
                onClick={handlePopout}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Open in new window"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={toggleFullscreen}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">Loading VS Code...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-10">
            <div className="text-center">
              <div className="text-red-500 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {vscodeUrl && (
          <iframe
            key={`vscode-${projectId || 'default'}-${projectName || 'workspace'}`}
            ref={iframeRef}
            src={vscodeUrl}
            className="w-full h-full border-0"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title="VS Code"
            sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-modals allow-popups"
            allow="clipboard-read; clipboard-write; web-share"
          />
        )}
      </div>

      {/* Agent Activity Overlay */}
      <AgentActivityOverlay 
        position="top-right"
        maxItems={5}
        className="mt-16"
      />
    </div>
  );
};

export default VSCodeContainer;