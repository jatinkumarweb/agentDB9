'use client';

import { useState, useEffect } from 'react';
import GradientColorPicker from '@/components/dev/GradientColorPicker';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import type { EvaluationCategory, EvaluationKnowledgeSource } from '@agentdb9/shared';

export default function KnowledgeEvaluationPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedSuite, setSelectedSuite] = useState<EvaluationCategory>('backend');
  const [compareWithout, setCompareWithout] = useState(true);
  const [knowledgeSources, setKnowledgeSources] = useState<{
    files: boolean;
    workspace: boolean;
    web: boolean;
    documentation: boolean;
  }>({
    files: false,
    workspace: true,
    web: false,
    documentation: false,
  });
  const [fileList, setFileList] = useState<string>('');
  const [webLinks, setWebLinks] = useState<string>('');
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

    const sources: EvaluationKnowledgeSource[] = [];

    if (knowledgeSources.files && fileList.trim()) {
      fileList.split('\n').forEach((file) => {
        if (file.trim()) {
          sources.push({
            type: 'file',
            identifier: file.trim(),
          });
        }
      });
    }

    if (knowledgeSources.workspace) {
      sources.push({
        type: 'workspace',
        identifier: 'current-workspace',
      });
    }

    if (knowledgeSources.web && webLinks.trim()) {
      webLinks.split('\n').forEach((link) => {
        if (link.trim()) {
          sources.push({
            type: 'web',
            identifier: link.trim(),
          });
        }
      });
    }

    if (knowledgeSources.documentation) {
      sources.push({
        type: 'documentation',
        identifier: 'project-docs',
      });
    }

    if (sources.length === 0) {
      alert('Please select at least one knowledge source');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/evaluation/knowledge', {
        agentId: selectedAgent,
        evaluationSuite: selectedSuite,
        knowledgeSources: sources,
        compareWithout,
      });

      alert('Knowledge evaluation started! Redirecting to results...');
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
          className="text-indigo-600 hover:underline mb-2"
        >
          ← Back to Evaluation
        </button>
        <h1 className="text-3xl font-bold">Knowledge Source Evaluation</h1>
        <p className="text-gray-600 mt-2">
          Evaluate the impact of different knowledge sources on agent performance
        </p>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/20 p-6">
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
                    ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold capitalize">{suite}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Knowledge Sources */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Knowledge Sources
          </label>
          <div className="space-y-4">
            {/* Files */}
            <div className="border rounded p-4">
              <label className="flex items-center gap-3 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={knowledgeSources.files}
                  onChange={(e) =>
                    setKnowledgeSources({
                      ...knowledgeSources,
                      files: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <div className="font-medium">Specific Files</div>
              </label>
              {knowledgeSources.files && (
                <textarea
                  value={fileList}
                  onChange={(e) => setFileList(e.target.value)}
                  placeholder="Enter file paths, one per line&#10;e.g., src/components/Button.tsx"
                  className="w-full p-2 border rounded text-sm"
                  rows={4}
                />
              )}
            </div>

            {/* Workspace Context */}
            <label className="flex items-center gap-3 p-4 border rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={knowledgeSources.workspace}
                onChange={(e) =>
                  setKnowledgeSources({
                    ...knowledgeSources,
                    workspace: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <div>
                <div className="font-medium">Workspace Context</div>
                <div className="text-sm text-gray-600">
                  Full project structure and file tree
                </div>
              </div>
            </label>

            {/* Web Links */}
            <div className="border rounded p-4">
              <label className="flex items-center gap-3 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={knowledgeSources.web}
                  onChange={(e) =>
                    setKnowledgeSources({
                      ...knowledgeSources,
                      web: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <div className="font-medium">Web Links</div>
              </label>
              {knowledgeSources.web && (
                <textarea
                  value={webLinks}
                  onChange={(e) => setWebLinks(e.target.value)}
                  placeholder="Enter URLs, one per line&#10;e.g., https://docs.example.com/api"
                  className="w-full p-2 border rounded text-sm"
                  rows={4}
                />
              )}
            </div>

            {/* Documentation */}
            <label className="flex items-center gap-3 p-4 border rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={knowledgeSources.documentation}
                onChange={(e) =>
                  setKnowledgeSources({
                    ...knowledgeSources,
                    documentation: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <div>
                <div className="font-medium">Project Documentation</div>
                <div className="text-sm text-gray-600">
                  README, docs folder, and inline documentation
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Compare Without Option */}
        <div className="mb-6">
          <label className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={compareWithout}
              onChange={(e) => setCompareWithout(e.target.checked)}
              className="w-4 h-4"
            />
            <div>
              <div className="font-medium">
                Also run without knowledge sources
              </div>
              <div className="text-sm text-gray-600">
                Compare performance with and without knowledge (doubles evaluation
                time)
              </div>
            </div>
          </label>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-blue-200 rounded">
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>
              The agent will be evaluated with the selected knowledge sources
            </li>
            <li>
              If "compare without" is enabled, it will also run without any
              knowledge
            </li>
            <li>
              Results will show the impact of knowledge on performance
            </li>
            <li>Evaluation runs in batches and may take several minutes</li>
          </ul>
        </div>

        {/* Action Button */}
        <button
          onClick={handleEvaluate}
          disabled={loading || !selectedAgent}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Starting Evaluation...' : 'Start Knowledge Evaluation'}
        </button>
      </div>
    </div>
  );
}
