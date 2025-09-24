'use client';

import React, { useState, useEffect } from 'react';
import { ModelConfig } from '@agentdb9/shared';

interface ModelSelectorProps {
  selectedModel?: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
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
  onModelChange, 
  disabled = false,
  className = '' 
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/models');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.models) {
        setModels(data.models);
        
        // Auto-select first available model if none selected
        if (!selectedModel) {
          const firstAvailable = data.models.find((m: ModelOption) => m.status === 'available');
          if (firstAvailable) {
            onModelChange(firstAvailable.id);
          }
        }
      } else {
        throw new Error(data.error || 'Failed to fetch models');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
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

  const getModelDisplayName = (model: ModelOption) => {
    const statusIcon = getModelStatusIcon(model.status);
    return `${statusIcon} ${model.name} (${model.provider})`;
  };

  const getModelTooltip = (model: ModelOption) => {
    if (model.status === 'disabled' && model.requiresApiKey && !model.apiKeyConfigured) {
      return `API key required for ${model.provider}`;
    }
    if (model.reason) {
      return model.reason;
    }
    return `${model.name} - ${model.status}`;
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

  const availableModels = models.filter(m => m.status === 'available');
  const disabledModels = models.filter(m => m.status === 'disabled');

  return (
    <div className={className}>
      <select
        value={selectedModel || ''}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled || availableModels.length === 0}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        title={selectedModel ? getModelTooltip(models.find(m => m.id === selectedModel) || models[0]) : 'Select a model'}
      >
        {availableModels.length === 0 && (
          <option value="" disabled>No models available</option>
        )}
        
        {availableModels.length > 0 && (
          <optgroup label="Available Models">
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.provider})
              </option>
            ))}
          </optgroup>
        )}
        
        {disabledModels.length > 0 && (
          <optgroup label="Disabled Models">
            {disabledModels.map((model) => (
              <option key={model.id} value={model.id} disabled>
                {model.name} ({model.provider}) - {
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
        {availableModels.length} available, {disabledModels.length} disabled
      </div>
    </div>
  );
}