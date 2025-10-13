'use client';

import { useState, useEffect } from 'react';

interface WorkspaceStatus {
  status: string;
  containerRunning: boolean;
  health?: {
    status: string;
    failingStreak: number;
  };
  resources?: {
    cpuUsage: number;
    memoryUsage: number;
    memoryLimit: number;
  };
}

interface WorkspaceStatusIndicatorProps {
  workspaceId: string;
  refreshInterval?: number; // in milliseconds
}

export function WorkspaceStatusIndicator({ 
  workspaceId, 
  refreshInterval = 30000 
}: WorkspaceStatusIndicatorProps) {
  const [status, setStatus] = useState<WorkspaceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [workspaceId, refreshInterval]);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/workspaces/${workspaceId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      const data = await response.json();
      setStatus(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!status) return 'gray';
    if (status.health) {
      if (status.health.status === 'healthy') return 'green';
      if (status.health.status === 'unhealthy') return 'red';
      return 'yellow';
    }
    if (status.containerRunning) return 'green';
    return 'gray';
  };

  const getStatusText = () => {
    if (!status) return 'Unknown';
    if (status.health) {
      return status.health.status.charAt(0).toUpperCase() + status.health.status.slice(1);
    }
    if (status.containerRunning) return 'Running';
    return 'Stopped';
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span>Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-sm text-red-600">
        <div className="w-2 h-2 bg-red-600 rounded-full"></div>
        <span>Error</span>
      </div>
    );
  }

  const statusColor = getStatusColor();
  const statusText = getStatusText();

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Workspace Status</h3>
        <button
          onClick={fetchStatus}
          className="text-gray-400 hover:text-gray-600"
          title="Refresh status"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {/* Status Indicator */}
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            statusColor === 'green' ? 'bg-green-500' :
            statusColor === 'yellow' ? 'bg-yellow-500' :
            statusColor === 'red' ? 'bg-red-500' :
            'bg-gray-400'
          } ${status?.containerRunning ? 'animate-pulse' : ''}`}></div>
          <span className="text-sm font-medium text-gray-900">{statusText}</span>
        </div>

        {/* Health Status */}
        {status?.health && (
          <div className="text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Health:</span>
              <span className={`font-medium ${
                status.health.status === 'healthy' ? 'text-green-600' :
                status.health.status === 'unhealthy' ? 'text-red-600' :
                'text-yellow-600'
              }`}>
                {status.health.status}
              </span>
            </div>
            {status.health.failingStreak > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Failing streak:</span>
                <span>{status.health.failingStreak}</span>
              </div>
            )}
          </div>
        )}

        {/* Resource Usage */}
        {status?.resources && (
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>CPU</span>
                <span>{status.resources.cpuUsage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    status.resources.cpuUsage > 80 ? 'bg-red-500' :
                    status.resources.cpuUsage > 60 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(status.resources.cpuUsage, 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Memory</span>
                <span>
                  {status.resources.memoryUsage}MB / {status.resources.memoryLimit}MB
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    (status.resources.memoryUsage / status.resources.memoryLimit) > 0.8 ? 'bg-red-500' :
                    (status.resources.memoryUsage / status.resources.memoryLimit) > 0.6 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ 
                    width: `${Math.min((status.resources.memoryUsage / status.resources.memoryLimit) * 100, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
