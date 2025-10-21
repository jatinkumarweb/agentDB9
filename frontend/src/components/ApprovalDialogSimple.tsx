import React, { useState } from 'react';
import { AlertTriangle, Terminal, Package, FileEdit, GitBranch, Clock, X, Check } from 'lucide-react';

export interface ApprovalRequest {
  id: string;
  type: 'command_execution' | 'dependency_installation' | 'file_operation' | 'git_operation';
  conversationId: string;
  agentId: string;
  timestamp: Date;
  risk: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  timeout?: number;
  
  // Command execution specific
  command?: string;
  workingDir?: string;
  estimatedDuration?: string;
  affectedFiles?: string[];
  
  // Dependency installation specific
  packages?: Array<{
    name: string;
    version?: string;
    size?: string;
    description?: string;
    devDependency: boolean;
  }>;
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
  totalSize?: string;
  
  // File operation specific
  operation?: 'create' | 'update' | 'delete' | 'move';
  path?: string;
  newPath?: string;
  contentPreview?: string;
  
  // Git operation specific
  gitOperation?: 'commit' | 'push' | 'pull' | 'merge' | 'reset';
  message?: string;
  files?: string[];
  branch?: string;
}

interface ApprovalDialogProps {
  request: ApprovalRequest;
  onApprove: (modifiedCommand?: string, selectedPackages?: string[]) => void;
  onReject: () => void;
}

const ApprovalDialog: React.FC<ApprovalDialogProps> = ({ request, onApprove, onReject }) => {
  const [modifiedCommand, setModifiedCommand] = useState(request.command || '');
  const [selectedPackages, setSelectedPackages] = useState<string[]>(
    request.packages?.map(p => p.name) || []
  );

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-900';
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-900';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case 'low': return 'bg-green-100 border-green-500 text-green-900';
      default: return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getIcon = () => {
    switch (request.type) {
      case 'command_execution': return <Terminal className="w-6 h-6" />;
      case 'dependency_installation': return <Package className="w-6 h-6" />;
      case 'file_operation': return <FileEdit className="w-6 h-6" />;
      case 'git_operation': return <GitBranch className="w-6 h-6" />;
      default: return <AlertTriangle className="w-6 h-6" />;
    }
  };

  const getTitle = () => {
    switch (request.type) {
      case 'command_execution': return 'Command Execution Approval';
      case 'dependency_installation': return 'Dependency Installation Approval';
      case 'file_operation': return 'File Operation Approval';
      case 'git_operation': return 'Git Operation Approval';
      default: return 'Approval Required';
    }
  };

  const handleApprove = () => {
    if (request.type === 'command_execution' && modifiedCommand !== request.command) {
      onApprove(modifiedCommand);
    } else if (request.type === 'dependency_installation' && selectedPackages.length > 0) {
      onApprove(undefined, selectedPackages);
    } else {
      onApprove();
    }
  };

  const togglePackage = (packageName: string) => {
    setSelectedPackages(prev =>
      prev.includes(packageName)
        ? prev.filter(p => p !== packageName)
        : [...prev, packageName]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 border-4 ${getRiskColor(request.risk)}`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-xl ${getRiskColor(request.risk)}`}>
                {getIcon()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{getTitle()}</h2>
                <p className="text-sm text-gray-600 mt-1">{request.reason}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getRiskBadgeColor(request.risk)}`}>
              {request.risk} Risk
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {/* Command Execution */}
          {request.type === 'command_execution' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Command to Execute:
                </label>
                <textarea
                  value={modifiedCommand}
                  onChange={(e) => setModifiedCommand(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              {request.workingDir && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Working Directory:</span>
                  <p className="text-sm text-gray-600 font-mono mt-1">{request.workingDir}</p>
                </div>
              )}
              {request.affectedFiles && request.affectedFiles.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Affected Files:</span>
                  <ul className="mt-2 space-y-1">
                    {request.affectedFiles.map((file, idx) => (
                      <li key={idx} className="text-sm text-gray-600 font-mono">• {file}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Dependency Installation */}
          {request.type === 'dependency_installation' && request.packages && (
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Packages to Install ({request.packageManager}):
                </span>
                <div className="mt-3 space-y-2">
                  {request.packages.map((pkg, idx) => (
                    <label key={idx} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPackages.includes(pkg.name)}
                        onChange={() => togglePackage(pkg.name)}
                        className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-medium text-gray-900">{pkg.name}</span>
                          {pkg.devDependency && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">dev</span>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-xs text-gray-600 mt-1">{pkg.description}</p>
                        )}
                        {pkg.size && (
                          <p className="text-xs text-gray-500 mt-1">Size: {pkg.size}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* File Operation */}
          {request.type === 'file_operation' && (
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Operation:</span>
                <p className="text-sm text-gray-900 font-medium mt-1 capitalize">{request.operation}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">File Path:</span>
                <p className="text-sm text-gray-600 font-mono mt-1">{request.path}</p>
              </div>
              {request.newPath && (
                <div>
                  <span className="text-sm font-medium text-gray-700">New Path:</span>
                  <p className="text-sm text-gray-600 font-mono mt-1">{request.newPath}</p>
                </div>
              )}
              {request.contentPreview && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Content Preview:</span>
                  <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono overflow-x-auto">
                    {request.contentPreview}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Git Operation */}
          {request.type === 'git_operation' && (
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Git Operation:</span>
                <p className="text-sm text-gray-900 font-medium mt-1 capitalize">{request.gitOperation}</p>
              </div>
              {request.message && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Commit Message:</span>
                  <p className="text-sm text-gray-600 mt-1">{request.message}</p>
                </div>
              )}
              {request.branch && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Branch:</span>
                  <p className="text-sm text-gray-600 font-mono mt-1">{request.branch}</p>
                </div>
              )}
              {request.files && request.files.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Files:</span>
                  <ul className="mt-2 space-y-1">
                    {request.files.map((file, idx) => (
                      <li key={idx} className="text-sm text-gray-600 font-mono">• {file}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Timeout Warning */}
          {request.timeout && (
            <div className="mt-4 flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <Clock className="w-4 h-4" />
              <span>This request will timeout in {Math.floor(request.timeout / 1000)} seconds</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button
            onClick={onReject}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-all font-medium flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Reject</span>
          </button>
          <button
            onClick={handleApprove}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium flex items-center space-x-2 shadow-md"
            disabled={request.type === 'dependency_installation' && selectedPackages.length === 0}
          >
            <Check className="w-4 h-4" />
            <span>Approve</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalDialog;
