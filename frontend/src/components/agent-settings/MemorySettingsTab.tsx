'use client';

import { useState, useEffect } from 'react';
import { Brain, TrendingUp, Clock, Database as DatabaseIcon, Eye, Plus } from 'lucide-react';
import { fetchWithAuth } from '@/utils/fetch-with-auth';
import toast from 'react-hot-toast';
import MemoryViewer from '../memory/MemoryViewer';
import MemoryStats from '../memory/MemoryStats';
import MemoryCreator from '../memory/MemoryCreator';

interface MemorySettingsTabProps {
  agentId: string;
  configuration?: {
    enabled?: boolean;
    retentionDays?: number;
    consolidationFrequency?: string;
    autoConsolidate?: boolean;
    importanceThreshold?: number;
  };
  onChange: (config: any) => void;
}

export default function MemorySettingsTab({ agentId, configuration = {}, onChange }: MemorySettingsTabProps) {
  const [activeView, setActiveView] = useState<'settings' | 'memories' | 'stats'>('settings');
  const [showCreator, setShowCreator] = useState(false);

  const defaults = {
    enabled: true,
    retentionDays: 90,
    consolidationFrequency: 'daily',
    autoConsolidate: true,
    importanceThreshold: 0.5,
    ...configuration,
  };

  const handleToggleEnabled = (enabled: boolean) => {
    onChange({ ...defaults, enabled });
  };

  const handleConfigChange = (field: string, value: any) => {
    onChange({ ...defaults, [field]: value });
  };

  const handleConsolidate = async () => {
    try {
      const response = await fetchWithAuth('/api/memory/consolidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          strategy: 'summarize',
          minImportance: 0.3, // Include most memories
          maxAge: 0.1, // Allow very recent memories (6 minutes)
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const result = data.data || data;
        const processed = result.stmProcessed || 0;
        const created = result.ltmCreated || 0;
        
        if (processed > 0) {
          toast.success(`Consolidated ${processed} memories into ${created} long-term entries`);
        } else {
          toast.info('No memories ready for consolidation');
        }
      } else {
        toast.error(data.error || 'Failed to consolidate memories');
      }
    } catch (error) {
      console.error('Failed to consolidate:', error);
      toast.error('Failed to consolidate memories');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Memory System</h3>
        <p className="text-sm text-gray-500 mb-6">
          Configure how the agent learns and retains information across sessions. Each agent has its own short-term and long-term memory.
        </p>
      </div>

      {/* View Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setActiveView('settings')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeView === 'settings'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveView('memories')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeView === 'memories'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          View Memories
        </button>
        <button
          onClick={() => setActiveView('stats')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeView === 'stats'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Statistics
        </button>
      </div>

      {/* Settings View */}
      {activeView === 'settings' && (
        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Enable Memory System</h4>
              <p className="text-xs text-gray-500 mt-1">
                Allow this agent to learn and remember from interactions
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={defaults.enabled}
                onChange={(e) => handleToggleEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {defaults.enabled && (
            <>
              {/* Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Retention Period (days)
                    </div>
                  </label>
                  <input
                    type="number"
                    value={defaults.retentionDays}
                    onChange={(e) => handleConfigChange('retentionDays', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="7"
                    max="365"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    How long to keep short-term memories before archiving
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Importance Threshold
                    </div>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={defaults.importanceThreshold}
                    onChange={(e) => handleConfigChange('importanceThreshold', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low (0.0)</span>
                    <span className="font-medium text-blue-600">{defaults.importanceThreshold.toFixed(1)}</span>
                    <span>High (1.0)</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Minimum importance for memories to be consolidated
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Consolidation Frequency
                  </label>
                  <select
                    value={defaults.consolidationFrequency}
                    onChange={(e) => handleConfigChange('consolidationFrequency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="manual">Manual Only</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    How often to consolidate short-term into long-term memory
                  </p>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={defaults.autoConsolidate}
                      onChange={(e) => handleConfigChange('autoConsolidate', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">Auto Consolidate</span>
                      <p className="text-xs text-gray-500">Automatically consolidate memories</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Manual Consolidation */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Manual Consolidation</h4>
                    <p className="text-xs text-blue-700 mt-1">
                      Consolidate short-term memories into long-term storage now
                    </p>
                  </div>
                  <button
                    onClick={handleConsolidate}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Consolidate Now
                  </button>
                </div>
              </div>

              {/* Memory Types Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Short-Term Memory (STM)</h4>
                  <p className="text-xs text-gray-600">
                    Stores recent interactions and context for active sessions. Automatically expires after the retention period.
                  </p>
                  <ul className="mt-2 text-xs text-gray-500 space-y-1">
                    <li>• Session-specific context</li>
                    <li>• Recent conversations</li>
                    <li>• Temporary learnings</li>
                  </ul>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Long-Term Memory (LTM)</h4>
                  <p className="text-xs text-gray-600">
                    Stores consolidated knowledge and learnings. Persists across all sessions and workspaces.
                  </p>
                  <ul className="mt-2 text-xs text-gray-500 space-y-1">
                    <li>• Learned patterns</li>
                    <li>• Resolved challenges</li>
                    <li>• User preferences</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Memories View */}
      {activeView === 'memories' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900">Agent Memories</h4>
            <button
              onClick={() => setShowCreator(true)}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Memory
            </button>
          </div>
          <MemoryViewer agentId={agentId} />
        </div>
      )}

      {/* Stats View */}
      {activeView === 'stats' && (
        <MemoryStats agentId={agentId} />
      )}

      {/* Memory Creator Modal */}
      {showCreator && (
        <MemoryCreator
          agentId={agentId}
          isOpen={showCreator}
          onClose={() => setShowCreator(false)}
          onSuccess={() => {
            setShowCreator(false);
          }}
        />
      )}
      {showCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <p>Memory creator temporarily disabled</p>
            <button onClick={() => setShowCreator(false)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
