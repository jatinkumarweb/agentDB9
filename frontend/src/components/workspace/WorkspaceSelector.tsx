'use client';

import { useState, useEffect } from 'react';
import { Workspace, WorkspaceType, WORKSPACE_TYPE_CONFIGS } from '@agentdb9/shared';

interface WorkspaceSelectorProps {
  userId: string;
  onSelect: (workspace: Workspace) => void;
  currentWorkspaceId?: string;
}

export function WorkspaceSelector({ userId, onSelect, currentWorkspaceId }: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, [userId]);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/workspaces', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch workspaces');
      }

      const data = await response.json();
      setWorkspaces(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const getWorkspaceIcon = (type: WorkspaceType) => {
    const config = WORKSPACE_TYPE_CONFIGS[type];
    const iconMap: Record<string, string> = {
      'code': '💻',
      'table': '📊',
      'book-open': '📓',
      'database': '🗄️',
      'palette': '🎨',
    };
    return iconMap[config.icon] || '📦';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="text-red-600 text-center">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold mb-2">Error Loading Workspaces</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchWorkspaces}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Workspace</h1>
          <p className="text-gray-600">Choose a workspace to start working</p>
        </div>

        {workspaces.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow-md text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Workspaces Yet</h3>
            <p className="text-gray-600 mb-6">Create your first workspace to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Create Workspace
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  onClick={() => onSelect(workspace)}
                  className={`bg-white p-6 rounded-lg shadow-md cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                    currentWorkspaceId === workspace.id ? 'ring-2 ring-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{getWorkspaceIcon(workspace.type)}</div>
                    {workspace.isDefault && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{workspace.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {WORKSPACE_TYPE_CONFIGS[workspace.type].name}
                  </p>
                  {workspace.description && (
                    <p className="text-sm text-gray-500 mb-3">{workspace.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className={`px-2 py-1 rounded ${
                      workspace.status === 'running' ? 'bg-green-100 text-green-800' :
                      workspace.status === 'stopped' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {workspace.status}
                    </span>
                    {workspace.currentProjectId && (
                      <span className="text-gray-400">Project active</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 font-medium"
              >
                + Create New Workspace
              </button>
            </div>
          </>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Create New Workspace</h3>
            <p className="text-gray-600 mb-4">
              Workspace creation UI coming soon. Use the API for now.
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
