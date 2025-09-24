'use client';

import React, { useState, useEffect } from 'react';
import { EnvironmentHealth, TestSuite, ServiceStatus, ModelTest, DatabaseTest } from '@agentdb9/shared';

interface TestResults {
  health: EnvironmentHealth | null;
  connectivity: TestSuite | null;
  models: TestSuite | null;
  databases: TestSuite | null;
  loading: boolean;
  error: string | null;
}

export default function EnvironmentTestPage() {
  const [results, setResults] = useState<TestResults>({
    health: null,
    connectivity: null,
    models: null,
    databases: null,
    loading: false,
    error: null
  });

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);

  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (!isDevelopment) {
      return;
    }

    runTests();
  }, [isDevelopment]);

  useEffect(() => {
    if (!autoRefresh || !isDevelopment) return;

    const interval = setInterval(() => {
      runTests();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isDevelopment]);

  const runTests = async () => {
    if (!isDevelopment) return;

    setResults(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/test/environment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runAll: true })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      setResults({
        health: data.health,
        connectivity: data.connectivity,
        models: data.models,
        databases: data.databases,
        loading: false,
        error: null
      });
    } catch (error) {
      setResults(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  if (!isDevelopment) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">
            Environment testing is only available in development mode.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Environment Testing</h1>
              <p className="text-gray-600 mt-2">
                Comprehensive testing and monitoring of all AgentDB9 services
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="autoRefresh" className="text-sm text-gray-700">
                  Auto-refresh
                </label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="text-sm border rounded px-2 py-1"
                  disabled={!autoRefresh}
                >
                  <option value={10}>10s</option>
                  <option value={30}>30s</option>
                  <option value={60}>1m</option>
                  <option value={300}>5m</option>
                </select>
              </div>
              <button
                onClick={runTests}
                disabled={results.loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {results.loading ? 'Running Tests...' : 'Run Tests'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {results.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">❌</div>
              <div>
                <h3 className="text-red-800 font-semibold">Test Error</h3>
                <p className="text-red-700">{results.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Overall Health */}
        {results.health && (
          <OverallHealthCard health={results.health} />
        )}

        {/* Test Suites */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {results.connectivity && (
            <TestSuiteCard suite={results.connectivity} />
          )}
          {results.models && (
            <TestSuiteCard suite={results.models} />
          )}
          {results.databases && (
            <TestSuiteCard suite={results.databases} />
          )}
        </div>

        {/* Detailed Results */}
        {results.health && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ServiceStatusCard services={results.health.services} />
            <ModelStatusCard models={results.health.models} />
          </div>
        )}
      </div>
    </div>
  );
}

function OverallHealthCard({ health }: { health: EnvironmentHealth }) {
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className={`rounded-lg border p-6 mb-6 ${getHealthColor(health.overall)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-2xl mr-3">{getHealthIcon(health.overall)}</span>
          <div>
            <h2 className="text-xl font-bold capitalize">{health.overall} Environment</h2>
            <p className="text-sm opacity-75">
              Last updated: {new Date(health.lastUpdated).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {health.services.filter(s => s.status === 'healthy').length}/
            {health.services.length}
          </div>
          <div className="text-sm opacity-75">Services Healthy</div>
        </div>
      </div>

      {health.issues.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Issues:</h3>
          <ul className="list-disc list-inside space-y-1">
            {health.issues.map((issue, index) => (
              <li key={index} className="text-sm">{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {health.recommendations.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Recommendations:</h3>
          <ul className="list-disc list-inside space-y-1">
            {health.recommendations.map((rec, index) => (
              <li key={index} className="text-sm">{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TestSuiteCard({ suite }: { suite: TestSuite }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'running': return 'text-blue-600';
      case 'skipped': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const successRate = suite.summary.total > 0 
    ? Math.round((suite.summary.passed / suite.summary.total) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{suite.name}</h3>
        <div className="text-2xl font-bold text-blue-600">{successRate}%</div>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span>Total Tests:</span>
          <span className="font-semibold">{suite.summary.total}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Passed:</span>
          <span className="font-semibold text-green-600">{suite.summary.passed}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Failed:</span>
          <span className="font-semibold text-red-600">{suite.summary.failed}</span>
        </div>
        {suite.summary.skipped > 0 && (
          <div className="flex justify-between text-sm">
            <span>Skipped:</span>
            <span className="font-semibold text-gray-600">{suite.summary.skipped}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {suite.tests.slice(0, 5).map((test) => (
          <div key={test.id} className="flex items-center justify-between text-sm">
            <span className="truncate">{test.name}</span>
            <span className={`font-semibold ${getStatusColor(test.status)}`}>
              {test.status}
            </span>
          </div>
        ))}
        {suite.tests.length > 5 && (
          <div className="text-xs text-gray-500 text-center">
            ... and {suite.tests.length - 5} more tests
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceStatusCard({ services }: { services: ServiceStatus[] }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Service Status</h3>
      <div className="space-y-3">
        {services.map((service) => (
          <div key={service.name} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <div className="font-medium">{service.name}</div>
              <div className="text-sm text-gray-600">{service.url}</div>
              {service.responseTime && (
                <div className="text-xs text-gray-500">{service.responseTime}ms</div>
              )}
            </div>
            <div className="text-right">
              <div className={`font-semibold ${
                service.status === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}>
                {service.status === 'healthy' ? '✅' : '❌'} {service.status}
              </div>
              {service.error && (
                <div className="text-xs text-red-600 max-w-32 truncate">{service.error}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModelStatusCard({ models }: { models: ModelTest[] }) {
  const getModelStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600';
      case 'disabled': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getModelStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return '✅';
      case 'disabled': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getModelStatusText = (model: ModelTest) => {
    if (model.status === 'disabled') {
      return model.requiresApiKey && !model.apiKeyConfigured 
        ? 'API Key Required' 
        : 'Disabled';
    }
    return model.available ? 'Available' : 'Unavailable';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Model Availability</h3>
      <div className="space-y-3">
        {models.map((model) => (
          <div key={model.modelId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <div className="font-medium">{model.modelId}</div>
              <div className="text-sm text-gray-600">{model.provider}</div>
              {model.responseTime && (
                <div className="text-xs text-gray-500">{model.responseTime}ms</div>
              )}
              {model.requiresApiKey && !model.apiKeyConfigured && (
                <div className="text-xs text-yellow-600">Requires API key configuration</div>
              )}
            </div>
            <div className="text-right">
              <div className={`font-semibold ${getModelStatusColor(model.status)}`}>
                {getModelStatusIcon(model.status)} {getModelStatusText(model)}
              </div>
              {model.reason && model.status === 'disabled' && (
                <div className="text-xs text-yellow-600 max-w-32 truncate">{model.reason}</div>
              )}
              {model.error && model.status === 'error' && (
                <div className="text-xs text-red-600 max-w-32 truncate">{model.error}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Show configuration hint for disabled models */}
      {models.some(m => m.status === 'disabled' && m.requiresApiKey && !m.apiKeyConfigured) && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="text-sm text-yellow-800">
            <strong>💡 Tip:</strong> Configure API keys in your <code>.env</code> file to enable external models.
          </div>
        </div>
      )}
    </div>
  );
}