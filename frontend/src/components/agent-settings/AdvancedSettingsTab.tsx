'use client';

import { Sliders, MessageSquare, Hash } from 'lucide-react';

interface AdvancedSettingsTabProps {
  configuration: {
    temperature: number;
    maxTokens: number;
    systemPrompt?: string;
  };
  onChange: (updates: any) => void;
}

export default function AdvancedSettingsTab({ configuration, onChange }: AdvancedSettingsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>
        <p className="text-sm text-gray-500 mb-6">
          Fine-tune the model's behavior and response characteristics.
        </p>
      </div>

      <div className="space-y-6">
        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Sliders className="w-4 h-4 mr-2" />
                Temperature
              </div>
              <span className="text-blue-600 font-mono">{configuration.temperature.toFixed(1)}</span>
            </div>
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={configuration.temperature}
            onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Focused (0.0)</span>
            <span>Balanced (1.0)</span>
            <span>Creative (2.0)</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Lower values make responses more focused and deterministic. Higher values increase creativity and randomness.
          </p>
        </div>

        {/* Max Tokens */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center">
              <Hash className="w-4 h-4 mr-2" />
              Max Tokens
            </div>
          </label>
          <input
            type="number"
            value={configuration.maxTokens}
            onChange={(e) => onChange({ maxTokens: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="100"
            max="32000"
            step="100"
          />
          <p className="mt-1 text-xs text-gray-500">
            Maximum length of the response. Higher values allow longer responses but may increase latency.
          </p>
        </div>

        {/* System Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              System Prompt
            </div>
          </label>
          <textarea
            value={configuration.systemPrompt || ''}
            onChange={(e) => onChange({ systemPrompt: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="You are a helpful coding assistant..."
            rows={8}
          />
          <p className="mt-1 text-xs text-gray-500">
            Instructions that define the agent's behavior and personality. Leave empty to use the default prompt.
          </p>
        </div>
      </div>
    </div>
  );
}
