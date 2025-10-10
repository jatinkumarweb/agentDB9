'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import type { EvaluationBatch, EvaluationResult } from '@agentdb9/shared';

export default function EvaluationResultsPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.id as string;

  const [batch, setBatch] = useState<EvaluationBatch | null>(null);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadData();
  }, [batchId]);

  useEffect(() => {
    if (!autoRefresh || !batch || batch.status === 'completed' || batch.status === 'failed') {
      return;
    }

    const interval = setInterval(() => {
      loadData();
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, batch]);

  const loadData = async () => {
    try {
      const [batchRes, resultsRes] = await Promise.all([
        axios.get(`/api/evaluation/batches/${batchId}`),
        axios.get(`/api/evaluation/results?batchId=${batchId}`),
      ]);

      setBatch(batchRes.data);
      setResults(resultsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      running: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 rounded text-sm ${colors[status] || colors.pending}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading evaluation results...</p>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-red-600">Batch not found</p>
          <button
            onClick={() => router.push('/evaluation')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Back to Evaluation
          </button>
        </div>
      </div>
    );
  }

  const completedResults = results.filter((r) => r.status === 'completed');
  const averageScore =
    completedResults.length > 0
      ? completedResults.reduce((sum, r) => sum + (r.scores?.overall || 0), 0) /
        completedResults.length
      : 0;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/evaluation')}
          className="text-blue-600 hover:underline mb-2"
        >
          ← Back to Evaluation
        </button>
        <h1 className="text-3xl font-bold">{batch.name}</h1>
      </div>

      {/* Batch Status Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Status</div>
            <div className="mt-1">{getStatusBadge(batch.status)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Progress</div>
            <div className="mt-1 font-semibold">
              {batch.progress.completed} / {batch.progress.total}
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${(batch.progress.completed / batch.progress.total) * 100}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Average Score</div>
            <div className={`mt-1 text-2xl font-bold ${getScoreColor(averageScore)}`}>
              {averageScore.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Type</div>
            <div className="mt-1 font-semibold capitalize">{batch.type}</div>
          </div>
        </div>

        {batch.progress.currentTask && batch.status === 'running' && (
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <div className="text-sm text-gray-600">Current Task:</div>
            <div className="font-medium">{batch.progress.currentTask}</div>
          </div>
        )}

        {batch.status === 'running' && (
          <div className="mt-4 flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Auto-refresh (every 3s)</span>
            </label>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Task Results</h2>

        {results.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No results yet. Evaluation is in progress...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Task</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Overall</th>
                  <th className="text-left p-2">Accuracy</th>
                  <th className="text-left p-2">Quality</th>
                  <th className="text-left p-2">Complete</th>
                  <th className="text-left p-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div className="font-medium">
                        {result.groundTruthId.substring(0, 8)}...
                      </div>
                      {result.memoryType && (
                        <div className="text-xs text-gray-500">
                          Memory: {result.memoryType}
                        </div>
                      )}
                    </td>
                    <td className="p-2">{getStatusBadge(result.status)}</td>
                    <td className="p-2">
                      {result.scores ? (
                        <span
                          className={`font-semibold ${getScoreColor(result.scores.overall)}`}
                        >
                          {result.scores.overall.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-2">
                      {result.scores ? (
                        <span className="text-sm">
                          {result.scores.accuracy.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-2">
                      {result.scores ? (
                        <span className="text-sm">
                          {result.scores.codeQuality.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-2">
                      {result.scores ? (
                        <span className="text-sm">
                          {result.scores.completeness.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-2 text-sm text-gray-600">
                      {result.executionTime
                        ? `${(result.executionTime / 1000).toFixed(1)}s`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Results */}
      {completedResults.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Detailed Analysis</h2>
          <div className="space-y-4">
            {completedResults.slice(0, 3).map((result) => (
              <div key={result.id} className="border rounded p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium">
                    Task: {result.groundTruthId.substring(0, 8)}...
                  </div>
                  <div className={`text-lg font-bold ${getScoreColor(result.scores?.overall || 0)}`}>
                    {result.scores?.overall.toFixed(1)}
                  </div>
                </div>

                {result.evaluationDetails && (
                  <>
                    <div className="mb-2">
                      <div className="text-sm font-medium text-gray-700">
                        Evaluator: {result.evaluationDetails.evaluatorModel}
                      </div>
                    </div>

                    {result.evaluationDetails.strengths.length > 0 && (
                      <div className="mb-2">
                        <div className="text-sm font-medium text-green-700">
                          Strengths:
                        </div>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          {result.evaluationDetails.strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.evaluationDetails.weaknesses.length > 0 && (
                      <div className="mb-2">
                        <div className="text-sm font-medium text-red-700">
                          Weaknesses:
                        </div>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          {result.evaluationDetails.weaknesses.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
