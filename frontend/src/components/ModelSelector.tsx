'use client';

import React, { useState, useEffect } from 'react';
import { ModelConfig } from '@agentdb9/shared';
import { useModelCache } from '@/hooks/useModelCache';

interface ModelSelectorProps {
  selectedModel?: string;
  selectedProvider?: string;
  onModelChange: (modelId: string) => void;
  onProviderChange?: (provider: string) => void;
  disabled?: boolean;
  className?: string;
  showProviderSelector?: boolean;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  status: 'available' | 'disabled' | 'error' | 'unknown';
  reason?: string;
  requiresApiKey: boolean;
  apiKeyConfigured: boolean;
}

export default function ModelSelector({ 
  selectedModel, 
  selectedProvider,
  onModelChange, 
  onProviderChange,
  disabled = false,
  className = '',
  showProviderSelector = true
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [internalProvider, setInternalProvider] = useState<string>('');
  
  // Use model cache hook
  const { getModels, refreshModels, isLoading: loading, error } = useModelCache({
    ttl: 30000, // 30 seconds - short TTL to pick up API key changes quickly
    maxRetries: 3,
    retryDelay: 1000
  });

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const cachedModels = await getModels();
      
      // Safety check: ensure cachedModels is an array
      if (!Array.isArray(cachedModels)) {
        console.warn('getModels returned non-array:', cachedModels);
        setModels([]);
        return;
      }
      
      setModels(cachedModels);
        
        // Auto-select first provider if none selected
        if (!selectedProvider && !internalProvider && cachedModels.length > 0) {
          const providers = [...new Set(cachedModels.filter(m => m && m.provider).map((m: ModelOption) => m.provider))];
          const firstProvider = providers.find(p => 
            cachedModels.some((m: ModelOption) => 
              m && m.provider === p && (
                m.status === 'available' || 
                (m.status === 'unknown' && (!m.requiresApiKey || m.apiKeyConfigured)) ||
                (m.requiresApiKey && m.apiKeyConfigured) // API-based models with configured keys
              )
            )
          ) || providers[0];
          
          if (firstProvider) {
            setInternalProvider(firstProvider);
            if (onProviderChange) {
              onProviderChange(firstProvider);
            }
          }
        }
        
        // Auto-select first available model if none selected
        if (!selectedModel && cachedModels.length > 0) {
          const currentProvider = selectedProvider || internalProvider;
          const providerModels = cachedModels.filter((m: ModelOption) => 
            m && (!currentProvider || m.provider === currentProvider)
          );
          const firstAvailable = providerModels.find((m: ModelOption) => 
            m && (
              m.status === 'available' || 
              (m.status === 'unknown' && (!m.requiresApiKey || m.apiKeyConfigured)) ||
              (m.requiresApiKey && m.apiKeyConfigured) // API-based models with configured keys
            )
          );
          if (firstAvailable) {
            onModelChange(firstAvailable.id);
          }
        }
    } catch (err) {
      console.error('Failed to load models:', err);
      setModels([]);
    }
  };

  const getModelStatusIcon = (model: ModelOption) => {
    if (model.status === 'available') return '✅';
    if (model.status === 'disabled') return '⚠️';
    if (model.status === 'error') return '❌';
    if (model.status === 'unknown') {
      // Show as available if no API key required or API key is configured
      if (!model.requiresApiKey || model.apiKeyConfigured) return '✅';
      // Show as disabled if API key required but not configured
      return '⚠️';
    }
    return '❓';
  };

  const getModelDisplayName = (model: ModelOption) => {
    const statusIcon = getModelStatusIcon(model);
    return `${statusIcon} ${model.name} (${model.provider})`;
  };

  const getModelTooltip = (model?: ModelOption) => {
    if (!model) {
      return 'Select a model';
    }
    if (model.status === 'disabled' && model.requiresApiKey && !model.apiKeyConfigured) {
      return `API key required for ${model.provider}`;
    }
    if (model.reason) {
      return model.reason;
    }
    return `${model.name} - ${model.status}`;
  };

  const handleProviderChange = (provider: string) => {
    setInternalProvider(provider);
    if (onProviderChange) {
      onProviderChange(provider);
    }
    
    // Check if current model is available in the new provider
    const providerModels = models.filter(m => m.provider === provider);
    const currentModelInProvider = providerModels.find(m => m.id === selectedModel);
    
    // If current model is not available in new provider, auto-select first available
    if (!currentModelInProvider) {
      const firstAvailable = providerModels.find(m => 
        m.status === 'available' || 
        (m.status === 'unknown' && (!m.requiresApiKey || m.apiKeyConfigured)) ||
        (m.requiresApiKey && m.apiKeyConfigured) // API-based models with configured keys
      );
      if (firstAvailable) {
        onModelChange(firstAvailable.id);
      }
    }
  };

  // Get current provider (controlled or internal)
  const currentProvider = selectedProvider || internalProvider;
  
  // Filter models by selected provider
  const filteredModels = currentProvider 
    ? (models || []).filter(m => m && m.provider === currentProvider)
    : (models || []);
  
  // Get unique providers
  const providers = models && models.length > 0 
    ? [...new Set(models.map(m => m.provider))].sort() 
    : [];

  const handleRefreshModels = async () => {
    try {
      const freshModels = await refreshModels();
      setModels(freshModels);
    } catch (err) {
      console.error('Failed to refresh models:', err);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading models...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        Error loading models: {error}
      </div>
    );
  }

  // Available models: Actually ready to use
  const availableModels = (filteredModels || []).filter(m => 
    m && (
      m.status === 'available' || 
      (m.status === 'unknown' && (!m.requiresApiKey || m.apiKeyConfigured)) ||
      (m.requiresApiKey && m.apiKeyConfigured) // API-based models with configured keys are ready
    )
  );
  
  // Unavailable but selectable: Ollama models that can be downloaded
  const unavailableSelectableModels: ModelOption[] = [];
  
  // Disabled models: Cannot be used without configuration
  const disabledModels = (filteredModels || []).filter(m => 
    m && (
      m.status === 'disabled' || 
      (m.status === 'unknown' && m.requiresApiKey && !m.apiKeyConfigured) ||
      m.status === 'error'
    )
  );

  return (
    <div className={className}>
      {/* Provider Selector */}
      {showProviderSelector && providers.length > 1 && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            LLM Provider
          </label>
          <select
            value={currentProvider || ''}
            onChange={(e) => handleProviderChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {providers.map((provider) => {
              const providerModels = (models || []).filter(m => m && m.provider === provider);
              const availableCount = providerModels.filter(m => 
                m && (
                  m.status === 'available' || 
                  (m.status === 'unknown' && (!m.requiresApiKey || m.apiKeyConfigured)) ||
                  (m.requiresApiKey && m.apiKeyConfigured) // API-based models with configured keys are ready
                )
              ).length;
              const downloadableCount = 0;
              const totalCount = providerModels.length;
              
              return (
                <option key={provider} value={provider}>
                  {provider.charAt(0).toUpperCase() + provider.slice(1)} ({availableCount} ready{downloadableCount > 0 ? `, ${downloadableCount} downloadable` : ''})
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Model Selector */}
      <div>
        {showProviderSelector && (
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Model
            </label>
            <button
              onClick={handleRefreshModels}
              disabled={loading}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
              title="Refresh models"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        )}
        <select
        value={selectedModel || ''}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled || (availableModels.length === 0 && unavailableSelectableModels.length === 0)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        title={selectedModel ? getModelTooltip(models.find(m => m.id === selectedModel)) : 'Select a model'}
      >
        {availableModels.length === 0 && unavailableSelectableModels.length === 0 && (
          <option value="" disabled>No models available</option>
        )}
        
        {availableModels.length > 0 && (
          <optgroup label="✅ Available Models (Ready to Use)">
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.id}
              </option>
            ))}
          </optgroup>
        )}
        
        {unavailableSelectableModels.length > 0 && (
          <optgroup label="📥 Ollama Models (Will Download on First Use)">
            {unavailableSelectableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.id}
              </option>
            ))}
          </optgroup>
        )}
        
        {disabledModels.length > 0 && (
          <optgroup label="⚠️ Disabled Models (Requires Configuration)">
            {disabledModels.map((model) => (
              <option key={model.id} value={model.id} disabled>
                {model.id} - {
                  model.requiresApiKey && !model.apiKeyConfigured 
                    ? 'API Key Required' 
                    : 'Disabled'
                }
              </option>
            ))}
          </optgroup>
        )}
        </select>
        
        {/* Show configuration hints */}
        {disabledModels.length > 0 && (
          <div className="mt-2 text-xs text-gray-600">
            {disabledModels.some(m => m.requiresApiKey && !m.apiKeyConfigured) && (
              <div className="flex items-center space-x-1">
                <span>⚠️</span>
                <span>Some models require API key configuration</span>
              </div>
            )}
          </div>
        )}
        
        {/* Model status summary */}
        <div className="mt-1 text-xs text-gray-500">
          {currentProvider && (
            <span className="font-medium">{currentProvider}: </span>
          )}
          {availableModels.length} available
          {unavailableSelectableModels.length > 0 && `, ${unavailableSelectableModels.length} downloadable`}
          {disabledModels.length > 0 && `, ${disabledModels.length} disabled`}
        </div>
      </div>
    </div>
  );
}