'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { WorkspaceStatusIndicator } from '@/components/workspace/WorkspaceStatusIndicator';
import { ResourceUsageChart } from '@/components/workspace/ResourceUsageChart';
import { ContainerLogsViewer } from '@/components/workspace/ContainerLogsViewer';

export default function WorkspaceManagePage() {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?returnUrl=/workspace/manage');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading workspace management...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Workspace Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Monitor and manage your development workspaces
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  {user?.username || user?.email}
                </span>
              </div>
              <button
                onClick={() => router.push('/workspace')}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Open Workspace
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Workspace Selection */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Workspace</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace ID
                </label>
                <input
                  type="text"
                  value={selectedWorkspace || ''}
                  onChange={(e) => setSelectedWorkspace(e.target.value)}
                  placeholder="Enter workspace ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => setSelectedWorkspace(null)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear selection
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Details */}
        {selectedWorkspace ? (
          <div className="space-y-6">
            {/* Status and Actions Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <WorkspaceStatusIndicator workspaceId={selectedWorkspace} />
              
              <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem('auth-token');
                      await fetch(`/api/workspaces/${selectedWorkspace}/start`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                  >
                    Start
                  </button>
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem('auth-token');
                      await fetch(`/api/workspaces/${selectedWorkspace}/stop`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
                  >
                    Stop
                  </button>
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem('auth-token');
                      await fetch(`/api/workspaces/${selectedWorkspace}/restart`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    Restart
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this workspace?')) {
                        const token = localStorage.getItem('auth-token');
                        await fetch(`/api/workspaces/${selectedWorkspace}`, {
                          method: 'DELETE',
                          headers: { 'Authorization': `Bearer ${token}` },
                        });
                        setSelectedWorkspace(null);
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded hover:bg-gray-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Resource Usage Chart */}
            <ResourceUsageChart workspaceId={selectedWorkspace} />

            {/* Container Logs */}
            <ContainerLogsViewer workspaceId={selectedWorkspace} />

            {/* Volume Management */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Volume Management</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={async () => {
                    const token = localStorage.getItem('auth-token');
                    await fetch(`/api/workspaces/${selectedWorkspace}/volumes/backup`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` },
                    });
                    alert('Backup started');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Backup Volume
                </button>
                <button
                  onClick={async () => {
                    const backupId = prompt('Enter backup ID to restore:');
                    if (backupId) {
                      const token = localStorage.getItem('auth-token');
                      await fetch(`/api/workspaces/${selectedWorkspace}/volumes/restore`, {
                        method: 'POST',
                        headers: { 
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ backupId }),
                      });
                      alert('Restore started');
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Restore Volume
                </button>
                <button
                  onClick={async () => {
                    const newWorkspaceId = prompt('Enter new workspace ID:');
                    if (newWorkspaceId) {
                      const token = localStorage.getItem('auth-token');
                      await fetch(`/api/workspaces/${selectedWorkspace}/volumes/clone`, {
                        method: 'POST',
                        headers: { 
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ targetWorkspaceId: newWorkspaceId }),
                      });
                      alert('Clone started');
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Clone Volume
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Workspace Selected</h3>
            <p className="text-gray-500">
              Select a project and workspace to view details and manage resources
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
