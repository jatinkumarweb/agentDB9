'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import type { EvaluationCategory, EvaluationBatch } from '@agentdb9/shared';
import GradientColorPicker from '@/components/dev/GradientColorPicker';

export default function EvaluationPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<any[]>([]);
  const [suites, setSuites] = useState<any[]>([]);
  const [batches, setBatches] = useState<EvaluationBatch[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<EvaluationCategory>('backend');
  const [agent1Id, setAgent1Id] = useState('');
  const [agent2Id, setAgent2Id] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGradientPicker, setShowGradientPicker] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 relative overflow-hidden">
      {/* Animated Liquid Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        <div className="blob blob-4"></div>
      </div>

      {/* Noise Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      <div className="container mx-auto p-6 relative z-10">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Agent Evaluation System</h1>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => router.push('/evaluation/memory')}
          className="p-6 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)] transition-all border border-white/20 hover:scale-[1.02]"
        >
          <h3 className="text-xl font-semibold mb-2">Memory Evaluation</h3>
          <p className="text-gray-600">
            Compare agent performance with different memory configurations
          </p>
        </button>

        <button
          onClick={() => router.push('/evaluation/knowledge')}
          className="p-6 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)] transition-all border border-white/20 hover:scale-[1.02]"
        >
          <h3 className="text-xl font-semibold mb-2">Knowledge Evaluation</h3>
          <p className="text-gray-600">
            Evaluate impact of knowledge sources on agent performance
          </p>
        </button>

        <button
          onClick={() => router.push('/evaluation')}
          className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border-2 border-indigo-500"
        >
          <h3 className="text-xl font-semibold mb-2">Agent Comparison</h3>
          <p className="text-gray-600">
            Compare two agents side-by-side on evaluation suites
          </p>
        </button>
      </div>

        {/* Agent Comparison Section */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 mb-8 border border-white/20">
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
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedSuite === suite.type
                    ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50'
                    : 'border-white/30 hover:border-indigo-300 bg-white/60 backdrop-blur-sm'
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
              className="w-full p-2 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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
              className="w-full p-2 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Starting Comparison...' : 'Start Comparison'}
          </button>
        </div>

        {/* Batches Table */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 border border-white/20">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Evaluation Batches</h2>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg hover:bg-white/80 transition-all border border-white/30"
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
                <tr key={batch.id} className="border-b border-white/20 hover:bg-white/40 transition-colors">
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
                      className="text-indigo-600 hover:underline text-sm"
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

      {/* Gradient Color Picker */}
      <GradientColorPicker 
        isVisible={showGradientPicker}
        onToggle={() => setShowGradientPicker(!showGradientPicker)}
      />

      {/* Animation Keyframes */}
      <style jsx global>{`
        @keyframes blob-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes blob-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 30px) scale(0.9); }
          66% { transform: translate(30px, -30px) scale(1.1); }
        }
        @keyframes blob-float-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, 40px) scale(1.1); }
          66% { transform: translate(-30px, -20px) scale(0.9); }
        }
        @keyframes blob-float-4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-35px, -40px) scale(0.9); }
          66% { transform: translate(35px, 30px) scale(1.1); }
        }

        .blob {
          position: absolute;
          border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
          opacity: 0.15;
          filter: blur(40px);
          will-change: transform;
        }

        .blob-1 {
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          top: -10%;
          left: -10%;
          animation: blob-float-1 28s ease-in-out infinite;
        }

        .blob-2 {
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          top: 40%;
          right: -5%;
          animation: blob-float-2 32s ease-in-out infinite;
        }

        .blob-3 {
          width: 450px;
          height: 450px;
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          bottom: -10%;
          left: 20%;
          animation: blob-float-3 30s ease-in-out infinite;
        }

        .blob-4 {
          width: 350px;
          height: 350px;
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          bottom: 30%;
          right: 20%;
          animation: blob-float-4 25s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
