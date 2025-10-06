'use client';
import { fetchWithAuth } from '@/utils/fetch-with-auth';

import React, { useState, useEffect, useRef } from 'react';
import { EnvironmentHealth, ServiceStatus } from '@agentdb9/shared';

interface MonitorProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onHealthChange?: (health: EnvironmentHealth) => void;
}

export default function EnvironmentMonitor({ 
  autoRefresh = false, 
  refreshInterval = 30,
  onHealthChange 
}: MonitorProps) {
  const [health, setHealth] = useState<EnvironmentHealth | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (autoRefresh) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => stopMonitoring();
  }, [autoRefresh, refreshInterval]);

  const startMonitoring = () => {
    // Try WebSocket first, fallback to polling
    if (typeof window !== 'undefined') {
      connectWebSocket();
    }
    
    // Start polling as backup
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      fetchHealth();
    }, refreshInterval * 1000);
    
    // Initial fetch
    fetchHealth();
  };

  const stopMonitoring = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsConnected(false);
  };

  const connectWebSocket = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/environment`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('Environment monitor WebSocket connected');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'health_update') {
            updateHealth(data.health);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('Environment monitor WebSocket disconnected');
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (autoRefresh) {
            connectWebSocket();
          }
        }, 5000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setIsConnected(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const response = await fetchWithAuth('/api/test/environment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runAll: true })
      });

      if (response.ok) {
        const data = await response.json();
        updateHealth(data.health);
      }
    } catch (error) {
      console.error('Failed to fetch health:', error);
    }
  };

  const updateHealth = (newHealth: EnvironmentHealth) => {
    setHealth(newHealth);
    setLastUpdate(new Date());
    
    if (onHealthChange) {
      onHealthChange(newHealth);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'unhealthy': return '🔴';
      default: return '⚪';
    }
  };

  if (!health) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading environment status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon(health.overall)}</span>
          <span className={`font-semibold ${getStatusColor(health.overall)}`}>
            {health.overall.toUpperCase()}
          </span>
          {isConnected && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              Live
            </span>
          )}
        </div>
        
        <div className="text-xs text-gray-500">
          {lastUpdate && `Updated ${lastUpdate.toLocaleTimeString()}`}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {health.services.filter(s => s.status === 'healthy').length}
          </div>
          <div className="text-xs text-gray-600">Services</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {health.models.filter(m => m.available).length}
          </div>
          <div className="text-xs text-gray-600">Models</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {health.databases.filter(d => d.connected).length}
          </div>
          <div className="text-xs text-gray-600">Databases</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {health.issues.length}
          </div>
          <div className="text-xs text-gray-600">Issues</div>
        </div>
      </div>

      {health.issues.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <div className="text-sm font-semibold text-red-800 mb-1">Issues:</div>
          <ul className="text-xs text-red-700 space-y-1">
            {health.issues.slice(0, 3).map((issue, index) => (
              <li key={index}>• {issue}</li>
            ))}
            {health.issues.length > 3 && (
              <li>• ... and {health.issues.length - 3} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}