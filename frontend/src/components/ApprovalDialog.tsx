import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { AlertTriangle, Terminal, Package, FileEdit, GitBranch, Clock } from 'lucide-react';

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
  request: ApprovalRequest | null;
  open: boolean;
  onApprove: (modifiedCommand?: string, selectedPackages?: string[]) => void;
  onReject: () => void;
}

export const ApprovalDialog: React.FC<ApprovalDialogProps> = ({
  request,
  open,
  onApprove,
  onReject,
}) => {
  const [modifiedCommand, setModifiedCommand] = useState('');
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [rememberChoice, setRememberChoice] = useState(false);

  if (!request) return null;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getIcon = () => {
    switch (request.type) {
      case 'command_execution': return <Terminal className="h-6 w-6" />;
      case 'dependency_installation': return <Package className="h-6 w-6" />;
      case 'file_operation': return <FileEdit className="h-6 w-6" />;
      case 'git_operation': return <GitBranch className="h-6 w-6" />;
    }
  };

  const handlePackageToggle = (packageName: string) => {
    const newSelected = new Set(selectedPackages);
    if (newSelected.has(packageName)) {
      newSelected.delete(packageName);
    } else {
      newSelected.add(packageName);
    }
    setSelectedPackages(newSelected);
  };

  const handleApprove = () => {
    if (request.type === 'command_execution' && modifiedCommand) {
      onApprove(modifiedCommand);
    } else if (request.type === 'dependency_installation' && selectedPackages.size > 0) {
      onApprove(undefined, Array.from(selectedPackages));
    } else {
      onApprove();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onReject()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                Approval Required
                <Badge className={getRiskColor(request.risk)}>
                  {request.risk.toUpperCase()} RISK
                </Badge>
              </DialogTitle>
              <DialogDescription>{request.reason}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Command Execution */}
          {request.type === 'command_execution' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Command:</label>
                <div className="mt-1 p-3 bg-gray-900 rounded-md font-mono text-sm text-green-400">
                  {request.command}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium">Working Directory:</span>
                  <p className="text-gray-600 dark:text-gray-400">{request.workingDir}</p>
                </div>
                {request.estimatedDuration && (
                  <div>
                    <span className="font-medium flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Estimated Duration:
                    </span>
                    <p className="text-gray-600 dark:text-gray-400">{request.estimatedDuration}</p>
                  </div>
                )}
              </div>

              {request.affectedFiles && request.affectedFiles.length > 0 && (
                <div>
                  <span className="text-sm font-medium">Affected Files:</span>
                  <ul className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {request.affectedFiles.map((file, i) => (
                      <li key={i}>• {file}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Modify Command (optional):</label>
                <Input
                  className="mt-1 font-mono text-sm"
                  placeholder={request.command}
                  value={modifiedCommand}
                  onChange={(e) => setModifiedCommand(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Dependency Installation */}
          {request.type === 'dependency_installation' && request.packages && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Packages to install ({request.packages.length}):
                </span>
                <Badge variant="outline">{request.packageManager}</Badge>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {request.packages.map((pkg, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Checkbox
                      checked={selectedPackages.has(pkg.name)}
                      onCheckedChange={() => handlePackageToggle(pkg.name)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{pkg.name}</span>
                        {pkg.version && (
                          <Badge variant="secondary" className="text-xs">
                            {pkg.version}
                          </Badge>
                        )}
                        {pkg.devDependency && (
                          <Badge variant="outline" className="text-xs">
                            dev
                          </Badge>
                        )}
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {pkg.description}
                        </p>
                      )}
                      {pkg.size && (
                        <p className="text-xs text-gray-500 mt-1">Size: {pkg.size}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allPackages = new Set(request.packages!.map(p => p.name));
                    setSelectedPackages(allPackages);
                  }}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPackages(new Set())}
                >
                  Deselect All
                </Button>
              </div>
            </div>
          )}

          {/* File Operation */}
          {request.type === 'file_operation' && (
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium">Operation:</span>
                <Badge className="ml-2">{request.operation}</Badge>
              </div>
              <div>
                <span className="text-sm font-medium">File Path:</span>
                <p className="mt-1 font-mono text-sm text-gray-600 dark:text-gray-400">
                  {request.path}
                </p>
              </div>
              {request.newPath && (
                <div>
                  <span className="text-sm font-medium">New Path:</span>
                  <p className="mt-1 font-mono text-sm text-gray-600 dark:text-gray-400">
                    {request.newPath}
                  </p>
                </div>
              )}
              {request.contentPreview && (
                <div>
                  <span className="text-sm font-medium">Content Preview:</span>
                  <pre className="mt-1 p-3 bg-gray-900 rounded-md text-xs text-gray-300 overflow-x-auto">
                    {request.contentPreview}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Git Operation */}
          {request.type === 'git_operation' && (
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium">Git Operation:</span>
                <Badge className="ml-2">{request.gitOperation}</Badge>
              </div>
              {request.branch && (
                <div>
                  <span className="text-sm font-medium">Branch:</span>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{request.branch}</p>
                </div>
              )}
              {request.message && (
                <div>
                  <span className="text-sm font-medium">Commit Message:</span>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{request.message}</p>
                </div>
              )}
              {request.files && request.files.length > 0 && (
                <div>
                  <span className="text-sm font-medium">Files:</span>
                  <ul className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {request.files.map((file, i) => (
                      <li key={i}>• {file}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Warning for high risk operations */}
          {(request.risk === 'high' || request.risk === 'critical') && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800 dark:text-orange-200">
                <p className="font-medium">High Risk Operation</p>
                <p className="mt-1">
                  This operation may have significant impact. Please review carefully before approving.
                </p>
              </div>
            </div>
          )}

          {/* Remember choice option */}
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="remember"
              checked={rememberChoice}
              onCheckedChange={(checked) => setRememberChoice(checked as boolean)}
            />
            <label
              htmlFor="remember"
              className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
            >
              Remember my choice for similar operations
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onReject}>
            Reject
          </Button>
          <Button
            onClick={handleApprove}
            disabled={
              request.type === 'dependency_installation' && selectedPackages.size === 0
            }
          >
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
