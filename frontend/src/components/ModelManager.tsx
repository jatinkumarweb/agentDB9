'use client';
import { fetchWithAuth } from '@/utils/fetch-with-auth';

import React, { useState, useEffect } from 'react';
import { Download, Trash2, Key, Settings, RefreshCw, CheckCircle, XCircle, AlertCircle, Search, ExternalLink } from 'lucide-react';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  status: 'available' | 'unavailable' | 'disabled' | 'downloading' | 'removing';
  reason?: string;
  requiresApiKey: boolean;
  apiKeyConfigured: boolean;
  size?: string;
  description?: string;
}

interface ProviderConfig {
  name: string;
  displayName: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  configured: boolean;
  models: ModelInfo[];
}

export default function ModelManager() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'models' | 'providers'>('models');
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set());
  const [removingModels, setRemovingModels] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'unavailable'>('all');

  useEffect(() => {
    fetchModels();
    fetchProviderConfigs();
  }, []);

  const fetchModels = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const url = forceRefresh ? '/api/models?refresh=true' : '/api/models';
      const response = await fetchWithAuth(url);
      const data = await response.json();
      
      // Handle double-wrapped response from backend
      // Backend returns: { success: true, data: { success: true, data: { models: [...] } } }
      const modelsData = data.data?.data?.models || data.data?.models || [];
      setModels(modelsData);
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderConfigs = async () => {
    try {
      const response = await fetchWithAuth('/api/providers/config');
      const data = await response.json();
      
      if (data.success) {
        setProviders(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch provider configs:', error);
      // Fallback to default provider configs
      setProviders([
        {
          name: 'openai',
          displayName: 'OpenAI',
          apiKeyLabel: 'OpenAI API Key',
          apiKeyPlaceholder: 'sk-...',
          configured: false,
          models: models.filter(m => m.provider === 'openai')
        },
        {
          name: 'anthropic',
          displayName: 'Anthropic',
          apiKeyLabel: 'Anthropic API Key',
          apiKeyPlaceholder: 'sk-ant-...',
          configured: false,
          models: models.filter(m => m.provider === 'anthropic')
        },
        {
          name: 'cohere',
          displayName: 'Cohere',
          apiKeyLabel: 'Cohere API Key',
          apiKeyPlaceholder: 'co-...',
          configured: false,
          models: models.filter(m => m.provider === 'cohere')
        }
      ]);
    }
  };

  const downloadModel = async (modelId: string) => {
    setDownloadingModels(prev => new Set(prev).add(modelId));
    
    try {
      const response = await fetchWithAuth('/api/models/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Poll for download status
        pollModelStatus(modelId, 'downloading');
      } else {
        throw new Error(data.error || 'Download failed');
      }
    } catch (error) {
      console.error('Failed to download model:', error);
      setDownloadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelId);
        return newSet;
      });
    }
  };

  const removeModel = async (modelId: string) => {
    if (!confirm(`Are you sure you want to remove ${modelId}? This will delete the model from local storage.`)) {
      return;
    }

    setRemovingModels(prev => new Set(prev).add(modelId));
    
    try {
      const response = await fetchWithAuth('/api/models/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Poll for removal status
        pollModelStatus(modelId, 'removing');
      } else {
        throw new Error(data.error || 'Removal failed');
      }
    } catch (error) {
      console.error('Failed to remove model:', error);
      setRemovingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelId);
        return newSet;
      });
    }
  };

  const pollModelStatus = (modelId: string, operation: 'downloading' | 'removing') => {
    const interval = setInterval(async () => {
      try {
        const response = await fetchWithAuth('/api/models');
        const data = await response.json();
        
        if (data.success && data.data && data.data.models) {
          const updatedModel = data.data.models.find((m: ModelInfo) => m.id === modelId);
          
          if (updatedModel) {
            if (operation === 'downloading' && updatedModel.status === 'available') {
              setDownloadingModels(prev => {
                const newSet = new Set(prev);
                newSet.delete(modelId);
                return newSet;
              });
              setModels(data.data.models);
              clearInterval(interval);
            } else if (operation === 'removing' && updatedModel.status === 'unavailable') {
              setRemovingModels(prev => {
                const newSet = new Set(prev);
                newSet.delete(modelId);
                return newSet;
              });
              setModels(data.data.models);
              clearInterval(interval);
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll model status:', error);
        clearInterval(interval);
      }
    }, 2000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      if (operation === 'downloading') {
        setDownloadingModels(prev => {
          const newSet = new Set(prev);
          newSet.delete(modelId);
          return newSet;
        });
      } else {
        setRemovingModels(prev => {
          const newSet = new Set(prev);
          newSet.delete(modelId);
          return newSet;
        });
      }
    }, 300000);
  };

  const updateProviderConfig = async (provider: string, apiKey: string) => {
    try {
      // Trim whitespace from API key
      const trimmedApiKey = apiKey.trim();
      
      const response = await fetchWithAuth('/api/providers/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: trimmedApiKey })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchProviderConfigs();
        // Force refresh to get updated model status with new API key
        await fetchModels(true);
      } else {
        throw new Error(data.error || 'Failed to update configuration');
      }
    } catch (error) {
      console.error('Failed to update provider config:', error);
      throw error;
    }
  };

  const removeProviderConfig = async (provider: string) => {
    try {
      const response = await fetchWithAuth(`/api/providers/config/${provider}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchProviderConfigs();
        // Force refresh to get updated model status
        await fetchModels(true);
      } else {
        throw new Error(data.error || 'Failed to remove configuration');
      }
    } catch (error) {
      console.error('Failed to remove provider config:', error);
      throw error;
    }
  };

  const getStatusIcon = (model: ModelInfo) => {
    if (downloadingModels.has(model.id)) {
      return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    }
    if (removingModels.has(model.id)) {
      return <RefreshCw className="w-4 h-4 animate-spin text-red-500" />;
    }
    
    switch (model.status) {
      case 'available':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'unavailable':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      case 'disabled':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (model: ModelInfo) => {
    if (downloadingModels.has(model.id)) return 'Downloading...';
    if (removingModels.has(model.id)) return 'Removing...';
    
    switch (model.status) {
      case 'available':
        return 'Available';
      case 'unavailable':
        return 'Not Downloaded';
      case 'disabled':
        return model.requiresApiKey && !model.apiKeyConfigured ? 'API Key Required' : 'Disabled';
      default:
        return 'Unknown';
    }
  };

  const canDownload = (model: ModelInfo) => {
    return model.provider === 'ollama' && 
           model.status === 'unavailable' && 
           !downloadingModels.has(model.id) && 
           !removingModels.has(model.id);
  };

  const canRemove = (model: ModelInfo) => {
    return model.provider === 'ollama' && 
           model.status === 'available' && 
           !downloadingModels.has(model.id) && 
           !removingModels.has(model.id);
  };

  const getModelDetailUrl = (modelId: string) => {
    // Extract base model name (e.g., "llama3.1:8b" -> "llama3.1")
    const baseName = modelId.split(':')[0];
    return `https://ollama.com/library/${baseName}`;
  };

  const filteredModels = models.filter(model => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      model.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (model.description && model.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Status filter
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'available' && model.status === 'available') ||
      (filterStatus === 'unavailable' && model.status === 'unavailable');
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        <span>Loading models...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Model Management</h1>
        <p className="text-gray-600">Download, remove, and configure AI models and providers</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('models')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'models'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Models
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'providers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Provider Configuration
          </button>
        </nav>
      </div>

      {activeTab === 'models' && (
        <div className="space-y-6">
          {/* Search and Filter Controls */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search models by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Status Filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All ({models.filter(m => m.provider === 'ollama').length})
                </button>
                <button
                  onClick={() => setFilterStatus('available')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'available'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Downloaded ({models.filter(m => m.provider === 'ollama' && m.status === 'available').length})
                </button>
                <button
                  onClick={() => setFilterStatus('unavailable')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'unavailable'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Available ({models.filter(m => m.provider === 'ollama' && m.status === 'unavailable').length})
                </button>
                <button
                  onClick={() => fetchModels(true)}
                  className="px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2"
                  title="Refresh models list"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Ollama Models */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Ollama Models ({filteredModels.filter(m => m.provider === 'ollama').length} models)
            </h2>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Model
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredModels.filter(m => m.provider === 'ollama').length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                          {searchQuery ? 'No models match your search' : 'No models available'}
                        </td>
                      </tr>
                    ) : (
                      filteredModels.filter(m => m.provider === 'ollama').map((model) => (
                      <tr key={model.id}>
                        <td className="px-6 py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-gray-900">{model.id}</div>
                                <a
                                  href={getModelDetailUrl(model.id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 transition-colors"
                                  title="View on Ollama"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                              {model.description && (
                                <div className="text-sm text-gray-500 mt-1 max-w-2xl">{model.description}</div>
                              )}
                              {model.size && (
                                <div className="text-xs text-gray-400 mt-1">Size: {model.size}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(model)}
                            <span className="ml-2 text-sm text-gray-900">{getStatusText(model)}</span>
                          </div>
                          {model.reason && (
                            <div className="text-xs text-gray-500 mt-1">{model.reason}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {canDownload(model) && (
                              <button
                                onClick={() => downloadModel(model.id)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </button>
                            )}
                            {canRemove(model) && (
                              <button
                                onClick={() => removeModel(model.id)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* External Provider Models */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Key className="w-5 h-5 mr-2" />
              External Provider Models
            </h2>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Model
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Provider
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {models.filter(m => m.provider !== 'ollama').map((model) => (
                      <tr key={model.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{model.id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 capitalize">{model.provider}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(model)}
                            <span className="ml-2 text-sm text-gray-900">{getStatusText(model)}</span>
                          </div>
                          {model.reason && (
                            <div className="text-xs text-gray-500 mt-1">{model.reason}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'providers' && (
        <div className="space-y-6">
          {providers.map((provider) => (
            <ProviderConfigCard
              key={provider.name}
              provider={provider}
              onUpdate={updateProviderConfig}
              onRemove={removeProviderConfig}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProviderConfigCardProps {
  provider: ProviderConfig;
  onUpdate: (provider: string, apiKey: string) => Promise<void>;
  onRemove: (provider: string) => Promise<void>;
}

function ProviderConfigCard({ provider, onUpdate, onRemove }: ProviderConfigCardProps) {
  const [apiKey, setApiKey] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await onUpdate(provider.name, apiKey);
      setSuccess(`${provider.displayName} API key configured successfully! Models will be available in the agent creation dropdown within 30 seconds.`);
      setIsEditing(false);
      setApiKey('');
      // Clear success message after 10 seconds
      setTimeout(() => setSuccess(null), 10000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration';
      setError(errorMessage);
      console.error('Failed to save configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(`Are you sure you want to remove the ${provider.displayName} API key?`)) {
      return;
    }
    
    setRemoving(true);
    setError(null);
    try {
      await onRemove(provider.name);
      setIsEditing(false);
      setApiKey('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove configuration';
      setError(errorMessage);
      console.error('Failed to remove configuration:', error);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Key className="w-5 h-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">{provider.displayName}</h3>
          {provider.configured && (
            <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isEditing ? 'Cancel' : provider.configured ? 'Update' : 'Configure'}
          </button>
          {provider.configured && !isEditing && (
            <button
              onClick={handleRemove}
              disabled={removing}
              className="text-sm text-red-600 hover:text-red-800 disabled:text-gray-400"
            >
              {removing ? 'Removing...' : 'Remove'}
            </button>
          )}
        </div>
      </div>

      {success && !isEditing && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {isEditing && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {provider.apiKeyLabel}
              {provider.configured && (
                <span className="ml-2 text-xs text-gray-500">(currently configured)</span>
              )}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError(null); // Clear error when user types
                setSuccess(null); // Clear success when user types
              }}
              placeholder={provider.configured ? 'Enter new API key to update' : provider.apiKeyPlaceholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            {success && (
              <p className="mt-2 text-sm text-green-600">{success}</p>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={!apiKey || saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : provider.configured ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="text-sm text-gray-600 mb-2">
          Status: {provider.configured ? 'Configured' : 'Not configured'}
        </div>
        <div className="text-sm text-gray-600">
          Available models: {provider.models?.length || 0}
        </div>
      </div>
    </div>
  );
}