'use client';

import { FolderOpen, Lock, Eye } from 'lucide-react';

interface WorkspaceSettingsTabProps {
  configuration: {
    workspace?: {
      enableActions?: boolean;
      enableContext?: boolean;
    };
  };
  onChange: (updates: any) => void;
}

export default function WorkspaceSettingsTab({ configuration, onChange }: WorkspaceSettingsTabProps) {
  const defaults = {
    enableActions: true,
    enableContext: true,
    ...configuration.workspace,
  };

  const handleToggle = (field: string, value: boolean) => {
    onChange({ 
      workspace: {
        ...configuration.workspace,
        [field]: value 
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Workspace Permissions</h3>
        <p className="text-sm text-gray-500 mb-6">
          Control what the agent can access and modify in your workspace environment.
        </p>
      </div>

      <div className="space-y-6">
        {/* Enable Actions */}
        <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
          <div className="flex-shrink-0 mt-1">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${defaults.enableActions ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <FolderOpen className={`w-5 h-5 ${defaults.enableActions ? 'text-blue-600' : 'text-gray-600'}`} />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Workspace Actions</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Allow agent to execute commands, modify files, and perform git operations
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={defaults.enableActions}
                  onChange={(e) => handleToggle('enableActions', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <strong>Includes:</strong>
              <ul className="mt-1 ml-4 list-disc space-y-1">
                <li>Execute shell commands (execute_command)</li>
                <li>Create, modify, and delete files (write_file, delete_file)</li>
                <li>Create directories (create_directory)</li>
                <li>Git operations (git_commit, git_status)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Enable Context */}
        <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
          <div className="flex-shrink-0 mt-1">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${defaults.enableContext ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Eye className={`w-5 h-5 ${defaults.enableContext ? 'text-blue-600' : 'text-gray-600'}`} />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Workspace Context</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Allow agent to read project structure, file contents, and workspace information
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={defaults.enableContext}
                  onChange={(e) => handleToggle('enableContext', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <strong>Includes:</strong>
              <ul className="mt-1 ml-4 list-disc space-y-1">
                <li>Read file contents (read_file)</li>
                <li>List directory contents (list_files)</li>
                <li>Access project structure and metadata</li>
                <li>View git status and history</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <Lock className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-yellow-900 mb-2">Security Considerations</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• <strong>Actions disabled:</strong> Agent can only provide suggestions, cannot modify workspace</li>
              <li>• <strong>Context disabled:</strong> Agent cannot read files or project structure</li>
              <li>• <strong>Both enabled:</strong> Agent has full workspace access (recommended for development)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Current Permissions</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          {defaults.enableActions && <li>✓ Can execute workspace actions</li>}
          {defaults.enableContext && <li>✓ Can read workspace context</li>}
          {!defaults.enableActions && <li>✗ Cannot execute workspace actions</li>}
          {!defaults.enableContext && <li>✗ Cannot read workspace context</li>}
        </ul>
      </div>
    </div>
  );
}
