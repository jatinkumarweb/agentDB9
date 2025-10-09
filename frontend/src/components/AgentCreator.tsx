'use client';
import { fetchWithAuth } from '@/utils/fetch-with-auth';

import { useState } from 'react';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { CreateAgentRequest } from '@agentdb9/shared';
import ModelSelector from './ModelSelector';

interface AgentCreatorProps {
  onAgentCreated: () => void;
}

export default function AgentCreator({ onAgentCreated }: AgentCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<CreateAgentRequest>({
    name: '',
    description: '',
    configuration: {
      llmProvider: 'ollama',
      model: '',
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: '',
      autoSave: true,
      autoFormat: true,
      autoTest: false,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate that a model is selected
    if (!formData.configuration.model) {
      setError('Please select a model');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetchWithAuth('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setIsOpen(false);
        setFormData({
          name: '',
          description: '',
          configuration: {
            llmProvider: 'ollama',
            model: '',
            temperature: 0.7,
            maxTokens: 2048,
            systemPrompt: '',
            autoSave: true,
            autoFormat: true,
            autoTest: false,
          },
        });
        setShowAdvanced(false);
        onAgentCreated();
      } else {
        setError(data.error || 'Failed to create agent');
      }
    } catch (error) {
      console.error('Failed to create agent:', error);
      setError('Failed to create agent');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('configuration.')) {
      const configField = field.replace('configuration.', '');
      setFormData(prev => ({
        ...prev,
        configuration: {
          ...prev.configuration,
          [configField]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Agent
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Create New Agent</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agent Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., React Expert"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe what this agent specializes in..."
              rows={3}
            />
          </div>

          <div>
            <ModelSelector
              selectedModel={formData.configuration.model || undefined}
              selectedProvider={formData.configuration.llmProvider}
              onModelChange={(modelId) => handleInputChange('configuration.model', modelId)}
              onProviderChange={(provider) => handleInputChange('configuration.llmProvider', provider)}
              className="w-full"
              showProviderSelector={true}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperature ({formData.configuration.temperature})
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={formData.configuration.temperature}
              onChange={(e) => handleInputChange('configuration.temperature', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Conservative</span>
              <span>Creative</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Tokens
            </label>
            <input
              type="number"
              value={formData.configuration.maxTokens}
              onChange={(e) => handleInputChange('configuration.maxTokens', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="100"
              max="8192"
              required
            />
          </div>

          {/* Advanced Settings Section */}
          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <span>Advanced Settings (Optional)</span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    System Prompt
                  </label>
                  <textarea
                    value={formData.configuration.systemPrompt || ''}
                    onChange={(e) => handleInputChange('configuration.systemPrompt', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Define the agent's role and behavior (optional - defaults will be used if empty)"
                    rows={3}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to use default: "You are a helpful coding assistant..."
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Automation Settings
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.configuration.autoSave ?? true}
                        onChange={(e) => handleInputChange('configuration.autoSave', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Auto-save files after modifications</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.configuration.autoFormat ?? true}
                        onChange={(e) => handleInputChange('configuration.autoFormat', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Auto-format code</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.configuration.autoTest ?? false}
                        onChange={(e) => handleInputChange('configuration.autoTest', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Auto-run tests</span>
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-xs text-blue-800">
                    💡 <strong>Tip:</strong> You can configure code style, knowledge base, and memory settings after creating the agent in the Settings page.
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}