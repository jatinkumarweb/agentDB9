import React from 'react';
import { CheckCircle2, Circle, Loader2, XCircle, AlertCircle } from 'lucide-react';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';

export interface TaskMilestone {
  id: string;
  order: number;
  title: string;
  description: string;
  type: 'analysis' | 'file_operation' | 'command_execution' | 'validation' | 'git_operation';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  requiresApproval: boolean;
  tools: string[];
  result?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TaskPlan {
  id: string;
  objective: string;
  description: string;
  milestones: TaskMilestone[];
  estimatedSteps: number;
  estimatedDuration?: string;
  requiresApproval: boolean;
  createdAt: Date;
}

interface TaskProgressBarProps {
  taskPlan: TaskPlan;
  currentStep?: number;
  totalSteps?: number;
  percentage?: number;
  className?: string;
}

export const TaskProgressBar: React.FC<TaskProgressBarProps> = ({
  taskPlan,
  currentStep,
  totalSteps,
  percentage,
  className = '',
}) => {
  const completedCount = taskPlan.milestones.filter(m => m.status === 'completed').length;
  const failedCount = taskPlan.milestones.filter(m => m.status === 'failed').length;
  const inProgressCount = taskPlan.milestones.filter(m => m.status === 'in_progress').length;
  
  const calculatedPercentage = percentage || Math.round((completedCount / taskPlan.milestones.length) * 100);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'skipped':
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'analysis': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'file_operation': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'command_execution': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'validation': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'git_operation': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{taskPlan.objective}</h3>
          <Badge variant="outline">
            {completedCount}/{taskPlan.milestones.length} Complete
          </Badge>
        </div>
        {taskPlan.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{taskPlan.description}</p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Progress: {calculatedPercentage}%
          </span>
          {taskPlan.estimatedDuration && (
            <span className="text-gray-600 dark:text-gray-400">
              Est. {taskPlan.estimatedDuration}
            </span>
          )}
        </div>
        <Progress value={calculatedPercentage} className="h-2" />
        <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
          {completedCount > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {completedCount} completed
            </span>
          )}
          {inProgressCount > 0 && (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
              {inProgressCount} in progress
            </span>
          )}
          {failedCount > 0 && (
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              {failedCount} failed
            </span>
          )}
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Milestones:</h4>
        <div className="space-y-2">
          {taskPlan.milestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                milestone.status === 'in_progress'
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  : milestone.status === 'completed'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : milestone.status === 'failed'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(milestone.status)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {milestone.order}. {milestone.title}
                  </span>
                  <Badge variant="secondary" className={`text-xs ${getTypeColor(milestone.type)}`}>
                    {milestone.type.replace('_', ' ')}
                  </Badge>
                  {milestone.requiresApproval && (
                    <Badge variant="outline" className="text-xs">
                      Requires Approval
                    </Badge>
                  )}
                </div>
                
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {milestone.description}
                </p>

                {milestone.tools.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {milestone.tools.map((tool, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                )}

                {milestone.error && (
                  <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-800 dark:text-red-200">
                    Error: {milestone.error}
                  </div>
                )}

                {milestone.status === 'in_progress' && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>In progress...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
