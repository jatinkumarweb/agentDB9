'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import type { EvaluationCategory, EvaluationMemoryType } from '@agentdb9/shared';

export default function MemoryEvaluationPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedSuite, setSelectedSuite] = useState<EvaluationCategory>('backend');
  const [memoryConfigs, setMemoryConfigs] = useState<{
    none: boolean;
    shortTerm: boolean;
    longTerm: boolean;
    both: boolean;
  }>({
    none: true,
    shortTerm: true,
    longTerm: false,
    both: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await axios.get('/api/agents');
      setAgents(response.data);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const handleEvaluate = async () => {
    if (!selectedAgent) {
      alert('Please select an agent');
      return;
    }

    const selectedConfigs: EvaluationMemoryType[] = [];
    if (memoryConfigs.none) selectedConfigs.push(null);
    if (memoryConfigs.shortTerm) selectedConfigs.push('short-term');
    if (memoryConfigs.longTerm) selectedConfigs.push('long-term');
    if (memoryConfigs.both) selectedConfigs.push('both');

    if (selectedConfigs.length === 0) {
      alert('Please select at least one memory configuration');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/evaluation/memory', {
        agentId: selectedAgent,
        evaluationSuite: selectedSuite,
        memoryConfigs: selectedConfigs,
      });

      alert('Memory evaluation started! Redirecting to results...');
      router.push(`/evaluation/results/${response.data.id}`);
    } catch (error) {
      console.error('Failed to start evaluation:', error);
      alert('Failed to start evaluation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/evaluation')}
          className="text-blue-600 hover:underline mb-2"
        >
          ← Back to Evaluation
        </button>
        <h1 className="text-3xl font-bold">Memory Impact Evaluation</h1>
        <p className="text-gray-600 mt-2">
          Compare agent performance with different memory configurations
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* Agent Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Agent</label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Choose an agent</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>

        {/* Suite Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Evaluation Suite
          </label>
          <div className="grid grid-cols-3 gap-4">
            {['backend', 'frontend', 'devops'].map((suite) => (
              <button
                key={suite}
                onClick={() => setSelectedSuite(suite as EvaluationCategory)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedSuite === suite
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold capitalize">{suite}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Memory Configuration */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Memory Configurations to Test
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={memoryConfigs.none}
                onChange={(e) =>
                  setMemoryConfigs({ ...memoryConfigs, none: e.target.checked })
                }
                className="w-4 h-4"
              />
              <div>
                <div className="font-medium">No Memory</div>
                <div className="text-sm text-gray-600">
                  Agent operates without any memory context
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={memoryConfigs.shortTerm}
                onChange={(e) =>
                  setMemoryConfigs({
                    ...memoryConfigs,
                    shortTerm: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <div>
                <div className="font-medium">Short-Term Memory</div>
                <div className="text-sm text-gray-600">
                  Recent conversation context only
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={memoryConfigs.longTerm}
                onChange={(e) =>
                  setMemoryConfigs({
                    ...memoryConfigs,
                    longTerm: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <div>
                <div className="font-medium">Long-Term Memory</div>
                <div className="text-sm text-gray-600">
                  Historical patterns and learned information
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={memoryConfigs.both}
                onChange={(e) =>
                  setMemoryConfigs({ ...memoryConfigs, both: e.target.checked })
                }
                className="w-4 h-4"
              />
              <div>
                <div className="font-medium">Both (Short-Term + Long-Term)</div>
                <div className="text-sm text-gray-600">
                  Full memory capabilities enabled
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>
              The agent will be evaluated on the selected suite with each memory
              configuration
            </li>
            <li>
              Results will show performance differences between configurations
            </li>
            <li>
              This helps identify the optimal memory setup for your use case
            </li>
            <li>
              Evaluation runs in batches and may take several minutes
            </li>
          </ul>
        </div>

        {/* Action Button */}
        <button
          onClick={handleEvaluate}
          disabled={loading || !selectedAgent}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Starting Evaluation...' : 'Start Memory Evaluation'}
        </button>
      </div>
    </div>
  );
}
