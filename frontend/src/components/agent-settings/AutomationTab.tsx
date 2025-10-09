'use client';

import { Zap, Save, Wand2, TestTube } from 'lucide-react';

interface AutomationTabProps {
  configuration: {
    autoSave?: boolean;
    autoFormat?: boolean;
    autoTest?: boolean;
  };
  onChange: (updates: any) => void;
}

export default function AutomationTab({ configuration, onChange }: AutomationTabProps) {
  const defaults = {
    autoSave: false,
    autoFormat: true,
    autoTest: false,
    ...configuration,
  };

  const handleToggle = (field: string, value: boolean) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Automation Settings</h3>
        <p className="text-sm text-gray-500 mb-6">
          Configure automatic actions the agent should perform when generating or modifying code.
        </p>
      </div>

      <div className="space-y-6">
        {/* Auto Save */}
        <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
          <div className="flex-shrink-0 mt-1">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${defaults.autoSave ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Save className={`w-5 h-5 ${defaults.autoSave ? 'text-blue-600' : 'text-gray-600'}`} />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Auto Save</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Automatically save files after the agent makes changes
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={defaults.autoSave}
                  onChange={(e) => handleToggle('autoSave', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <strong>Note:</strong> Files will be saved immediately after generation. Make sure you have version control enabled.
            </div>
          </div>
        </div>

        {/* Auto Format */}
        <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
          <div className="flex-shrink-0 mt-1">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${defaults.autoFormat ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Wand2 className={`w-5 h-5 ${defaults.autoFormat ? 'text-blue-600' : 'text-gray-600'}`} />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Auto Format</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Automatically format code according to your style preferences
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={defaults.autoFormat}
                  onChange={(e) => handleToggle('autoFormat', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <strong>Recommended:</strong> Ensures consistent code style across all generated code.
            </div>
          </div>
        </div>

        {/* Auto Test */}
        <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
          <div className="flex-shrink-0 mt-1">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${defaults.autoTest ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <TestTube className={`w-5 h-5 ${defaults.autoTest ? 'text-blue-600' : 'text-gray-600'}`} />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Auto Test</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Automatically run tests after code changes
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={defaults.autoTest}
                  onChange={(e) => handleToggle('autoTest', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <strong>Warning:</strong> May slow down the development process. Only enable if you have fast tests.
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Active Automations</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          {defaults.autoSave && <li>✓ Files will be saved automatically</li>}
          {defaults.autoFormat && <li>✓ Code will be formatted automatically</li>}
          {defaults.autoTest && <li>✓ Tests will run automatically</li>}
          {!defaults.autoSave && !defaults.autoFormat && !defaults.autoTest && (
            <li className="text-blue-600">No automations enabled</li>
          )}
        </ul>
      </div>
    </div>
  );
}
