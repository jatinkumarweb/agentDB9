'use client';

import { useState, useEffect } from 'react';
import { Brain, Clock, Tag, TrendingUp } from 'lucide-react';
import { fetchWithAuth } from '@/utils/fetch-with-auth';

interface Memory {
  id: string;
  category: string;
  content: string;
  importance: number;
  createdAt: string;
  metadata?: {
    tags?: string[];
    keywords?: string[];
  };
}

interface MemoryViewerProps {
  agentId: string;
}

export default function MemoryViewer({ agentId }: MemoryViewerProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'short-term' | 'long-term'>('all');

  useEffect(() => {
    loadMemories();
  }, [agentId, filter]);

  const loadMemories = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`/api/memory/${agentId}?type=${filter}`);
      const data = await response.json();
      
      if (data.success) {
        setMemories(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      interaction: 'bg-blue-100 text-blue-800',
      lesson: 'bg-green-100 text-green-800',
      challenge: 'bg-yellow-100 text-yellow-800',
      feedback: 'bg-purple-100 text-purple-800',
      context: 'bg-gray-100 text-gray-800',
      decision: 'bg-indigo-100 text-indigo-800',
      error: 'bg-red-100 text-red-800',
      success: 'bg-emerald-100 text-emerald-800',
      preference: 'bg-pink-100 text-pink-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getImportanceColor = (importance: number) => {
    if (importance >= 0.8) return 'text-red-600';
    if (importance >= 0.6) return 'text-orange-600';
    if (importance >= 0.4) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 flex items-center">
          <Brain className="w-4 h-4 mr-2" />
          Memory Entries ({memories.length})
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('short-term')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              filter === 'short-term'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Short-term
          </button>
          <button
            onClick={() => setFilter('long-term')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              filter === 'long-term'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Long-term
          </button>
        </div>
      </div>

      {memories.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No memories found</p>
          <p className="text-xs mt-1">Memories will appear as the agent learns</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(memory.category)}`}>
                  {memory.category}
                </span>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <TrendingUp className={`w-3 h-3 ${getImportanceColor(memory.importance)}`} />
                  <span className={getImportanceColor(memory.importance)}>
                    {(memory.importance * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-700 mb-2">{memory.content}</p>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(memory.createdAt).toLocaleDateString()}
                </div>
                {memory.metadata?.tags && memory.metadata.tags.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Tag className="w-3 h-3" />
                    <span>{memory.metadata.tags.slice(0, 2).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
