'use client';

import { useState, useEffect } from 'react';
import { Brain, Database, TrendingUp, Clock } from 'lucide-react';
import { fetchWithAuth } from '@/utils/fetch-with-auth';

interface MemoryStatsData {
  shortTerm: {
    total: number;
    byCategory: Record<string, number>;
  };
  longTerm: {
    total: number;
    byCategory: Record<string, number>;
  };
  averageImportance: number;
  lastConsolidation?: string;
}

interface MemoryStatsProps {
  agentId: string;
}

export default function MemoryStats({ agentId }: MemoryStatsProps) {
  const [stats, setStats] = useState<MemoryStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [agentId]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`/api/memory/${agentId}/stats`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load memory stats:', error);
      // Set default stats on error
      setStats({
        shortTerm: { total: 0, byCategory: {} },
        longTerm: { total: 0, byCategory: {} },
        averageImportance: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700 flex items-center">
        <TrendingUp className="w-4 h-4 mr-2" />
        Memory Statistics
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-blue-900">Short-term</span>
            <Brain className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{stats.shortTerm.total}</p>
          <p className="text-xs text-blue-700 mt-1">Active memories</p>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-purple-900">Long-term</span>
            <Database className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">{stats.longTerm.total}</p>
          <p className="text-xs text-purple-700 mt-1">Consolidated</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-gray-700">Average Importance</span>
          <TrendingUp className="w-4 h-4 text-gray-600" />
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${stats.averageImportance * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-2">
          {(stats.averageImportance * 100).toFixed(1)}%
        </p>
      </div>

      {stats.lastConsolidation && (
        <div className="bg-green-50 rounded-lg p-3">
          <div className="flex items-center text-xs text-green-800">
            <Clock className="w-3 h-3 mr-2" />
            <span>
              Last consolidation: {new Date(stats.lastConsolidation).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {Object.keys(stats.shortTerm.byCategory).length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-xs font-medium text-gray-700 mb-2">By Category</h4>
          <div className="space-y-2">
            {Object.entries(stats.shortTerm.byCategory)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([category, count]) => (
                <div key={category} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 capitalize">{category}</span>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
