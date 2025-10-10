'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import type { EvaluationCategory, EvaluationBatch } from '@agentdb9/shared';

export default function EvaluationPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<any[]>([]);
  const [suites, setSuites] = useState<any[]>([]);
  const [batches, setBatches] = useState<EvaluationBatch[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<EvaluationCategory>('backend');
  const [agent1Id, setAgent1Id] = useState('');
  const [agent2Id, setAgent2Id] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [agentsRes, suitesRes, batchesRes] = await Promise.all([
        axios.get('/api/agents'),
        axios.get('/api/evaluation/suites'),
        axios.get('/api/evaluation/batches'),
      ]);

      setAgents(agentsRes.data);
      setSuites(suitesRes.data);
      setBatches(batchesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleCompare = async () => {
    if (!agent1Id || !agent2Id) {
      alert('Please select both agents');
      return;
    }

    if (agent1Id === agent2Id) {
      alert('Please select different agents');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/evaluation/compare', {
        agent1Id,
        agent2Id,
        evaluationSuite: selectedSuite,
      });

      alert('Comparison started! Check the batches table for progress.');
      loadData();
    } catch (error) {
      console.error('Failed to start comparison:', error);
      alert('Failed to start comparison');
    } finally {
      setLoading(false);
    }
  };

  const getBatchStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'running':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      case 'cancelled':
        return 'text-gray-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Agent Evaluation System</h1>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => router.push('/evaluation/memory')}
          className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h3 className="text-xl font-semibold mb-2">Memory Evaluation</h3>
          <p className="text-gray-600">
            Compare agent performance with different memory configurations
          </p>
        </button>

        <button
          onClick={() => router.push('/evaluation/knowledge')}
          className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h3 className="text-xl font-semibold mb-2">Knowledge Evaluation</h3>
          <p className="text-gray-600">
            Evaluate impact of knowledge sources on agent performance
          </p>
        </button>

        <button
          onClick={() => router.push('/evaluation')}
          className="p-6 bg-blue-50 rounded-lg shadow border-2 border-blue-500"
        >
          <h3 className="text-xl font-semibold mb-2">Agent Comparison</h3>
          <p className="text-gray-600">
            Compare two agents side-by-side on evaluation suites
          </p>
        </button>
      </div>

      {/* Agent Comparison Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Compare Agents</h2>

        {/* Suite Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Evaluation Suite
          </label>
          <div className="grid grid-cols-3 gap-4">
            {suites.map((suite) => (
              <button
                key={suite.type}
                onClick={() => setSelectedSuite(suite.type)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedSuite === suite.type
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">{suite.name}</div>
                <div className="text-sm text-gray-600">
                  {suite.taskCount} tasks
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Agent Selection */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Agent 1</label>
            <select
              value={agent1Id}
              onChange={(e) => setAgent1Id(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Agent 1</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Agent 2</label>
            <select
              value={agent2Id}
              onChange={(e) => setAgent2Id(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Agent 2</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={loading || !agent1Id || !agent2Id}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting Comparison...' : 'Start Comparison'}
        </button>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Evaluation Batches</h2>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Progress</th>
                <th className="text-left p-2">Created</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{batch.name}</td>
                  <td className="p-2">
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {batch.type}
                    </span>
                  </td>
                  <td className="p-2">
                    <span className={`font-semibold ${getBatchStatusColor(batch.status)}`}>
                      {batch.status}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(batch.progress.completed / batch.progress.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm">
                        {batch.progress.completed}/{batch.progress.total}
                      </span>
                    </div>
                  </td>
                  <td className="p-2 text-sm text-gray-600">
                    {new Date(batch.createdAt).toLocaleString()}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => router.push(`/evaluation/results/${batch.id}`)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View Results
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {batches.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No evaluation batches yet. Start a comparison to see results here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
