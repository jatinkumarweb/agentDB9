'use client';

import { useState, useEffect, useRef } from 'react';

interface ResourceStats {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  memoryLimit: number;
  diskUsage?: number;
  networkRx?: number;
  networkTx?: number;
}

interface ResourceUsageChartProps {
  workspaceId: string;
  refreshInterval?: number; // in milliseconds
  maxDataPoints?: number;
}

export function ResourceUsageChart({ 
  workspaceId, 
  refreshInterval = 5000,
  maxDataPoints = 60 
}: ResourceUsageChartProps) {
  const [stats, setStats] = useState<ResourceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory'>('cpu');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [workspaceId, refreshInterval]);

  useEffect(() => {
    if (stats.length > 0 && canvasRef.current) {
      drawChart();
    }
  }, [stats, selectedMetric]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/workspaces/${workspaceId}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      const newStat: ResourceStats = {
        timestamp: new Date().toISOString(),
        ...data.data,
      };

      setStats(prev => {
        const updated = [...prev, newStat];
        return updated.slice(-maxDataPoints);
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const value = 100 - (i * 25);
      const y = padding + (chartHeight / 4) * i;
      ctx.fillText(`${value}%`, padding - 10, y + 4);
    }

    if (stats.length === 0) return;

    // Prepare data
    const dataPoints = stats.map(stat => {
      if (selectedMetric === 'cpu') {
        return stat.cpuUsage;
      } else {
        return (stat.memoryUsage / stat.memoryLimit) * 100;
      }
    });

    // Draw line
    ctx.strokeStyle = selectedMetric === 'cpu' ? '#3b82f6' : '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    dataPoints.forEach((value, index) => {
      const x = padding + (chartWidth / (maxDataPoints - 1)) * index;
      const y = padding + chartHeight - (value / 100) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = selectedMetric === 'cpu' ? '#3b82f6' : '#8b5cf6';
    dataPoints.forEach((value, index) => {
      const x = padding + (chartWidth / (maxDataPoints - 1)) * index;
      const y = padding + chartHeight - (value / 100) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // X-axis label
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time', width / 2, height - 10);
  };

  const getCurrentValue = () => {
    if (stats.length === 0) return 0;
    const latest = stats[stats.length - 1];
    if (selectedMetric === 'cpu') {
      return latest.cpuUsage.toFixed(1);
    } else {
      return ((latest.memoryUsage / latest.memoryLimit) * 100).toFixed(1);
    }
  };

  const getAverageValue = () => {
    if (stats.length === 0) return 0;
    const sum = stats.reduce((acc, stat) => {
      if (selectedMetric === 'cpu') {
        return acc + stat.cpuUsage;
      } else {
        return acc + (stat.memoryUsage / stat.memoryLimit) * 100;
      }
    }, 0);
    return (sum / stats.length).toFixed(1);
  };

  const getPeakValue = () => {
    if (stats.length === 0) return 0;
    const values = stats.map(stat => {
      if (selectedMetric === 'cpu') {
        return stat.cpuUsage;
      } else {
        return (stat.memoryUsage / stat.memoryLimit) * 100;
      }
    });
    return Math.max(...values).toFixed(1);
  };

  if (loading && stats.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading resource data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Resource Usage</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedMetric('cpu')}
            className={`px-3 py-1 text-xs font-medium rounded ${
              selectedMetric === 'cpu'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            CPU
          </button>
          <button
            onClick={() => setSelectedMetric('memory')}
            className={`px-3 py-1 text-xs font-medium rounded ${
              selectedMetric === 'memory'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Memory
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mb-4">
        <canvas
          ref={canvasRef}
          width={600}
          height={300}
          className="w-full"
          style={{ maxHeight: '300px' }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div>
          <div className="text-xs text-gray-500 mb-1">Current</div>
          <div className="text-lg font-semibold text-gray-900">
            {getCurrentValue()}%
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Average</div>
          <div className="text-lg font-semibold text-gray-900">
            {getAverageValue()}%
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Peak</div>
          <div className="text-lg font-semibold text-gray-900">
            {getPeakValue()}%
          </div>
        </div>
      </div>

      {stats.length > 0 && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Showing last {stats.length} data points
        </div>
      )}
    </div>
  );
}
