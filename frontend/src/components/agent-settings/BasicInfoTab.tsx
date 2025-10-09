'use client';

import { User, FileText } from 'lucide-react';
import ModelSelector from '../ModelSelector';

interface BasicInfoTabProps {
  agent: {
    name: string;
    description?: string;
    configuration: {
      llmProvider: string;
      model: string;
    };
  };
  onChange: (updates: any) => void;
}

export default function BasicInfoTab({ agent, onChange }: BasicInfoTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
        <p className="text-sm text-gray-500 mb-6">
          Configure the basic details and model for your agent.
        </p>
      </div>

      <div className="space-y-4">
        {/* Agent Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2" />
              Agent Name
            </div>
          </label>
          <input
            type="text"
            value={agent.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., React Expert"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            A descriptive name for your agent
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Description
            </div>
          </label>
          <textarea
            value={agent.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe what this agent specializes in..."
            rows={4}
          />
          <p className="mt-1 text-xs text-gray-500">
            Help users understand what this agent is good at
          </p>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language Model
          </label>
          <ModelSelector
            selectedModel={agent.configuration.model}
            selectedProvider={agent.configuration.llmProvider as any}
            onModelChange={(model) => onChange({ configuration: { ...agent.configuration, model } })}
            onProviderChange={(provider) => onChange({ configuration: { ...agent.configuration, llmProvider: provider } })}
            showProviderSelector={true}
            className="w-full"
          />
          <p className="mt-1 text-xs text-gray-500">
            The AI model that powers this agent&apos;s responses
          </p>
        </div>
      </div>
    </div>
  );
}
