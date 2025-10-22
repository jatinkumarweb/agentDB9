import React, { useState } from 'react';
import { CheckCircle2, Circle, Loader2, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

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

export interface TaskProgressUpdate {
  type: 'plan' | 'milestone_start' | 'milestone_progress' | 'milestone_complete' | 'tool_execution' | 'approval_required' | 'final_answer';
  taskPlanId?: string;
  objective?: string;
  currentMilestone?: TaskMilestone;
  currentStep?: number;
  totalSteps?: number;
  percentage?: number;
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface TaskProgressBarProps {
  taskPlan: TaskPlan;
  currentProgress: TaskProgressUpdate;
}

const TaskProgressBar: React.FC<TaskProgressBarProps> = ({ taskPlan, currentProgress }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const completedMilestones = taskPlan.milestones.filter(m => m.status === 'completed').length;
  const totalMilestones = taskPlan.milestones.length;
  const progressPercentage = (completedMilestones / totalMilestones) * 100;
  const currentMilestone = taskPlan.milestones.find(m => m.status === 'in_progress');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'skipped':
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'failed': return 'bg-red-100 text-red-800 border-red-300';
      case 'skipped': return 'bg-gray-100 text-gray-600 border-gray-300';
      default: return 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Accordion Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3 flex-1">
          {/* Progress Indicator */}
          <div className="flex items-center space-x-2">
            {currentMilestone ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
            <span className="text-sm font-medium text-gray-700">
              Step {completedMilestones + 1}/{totalMilestones}
            </span>
          </div>

          {/* Current Step Title */}
          {currentMilestone && (
            <span className="text-sm text-gray-600 truncate">
              {currentMilestone.title}
            </span>
          )}

          {/* Progress Bar */}
          <div className="flex-1 max-w-xs">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Percentage */}
          <span className="text-xs text-gray-500 font-medium">
            {Math.round(progressPercentage)}%
          </span>
        </div>

        {/* Expand/Collapse Icon */}
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50">
          {/* Objective */}
          <div className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-700">{taskPlan.objective}</p>
          </div>

          {/* Milestones List */}
          <div className="max-h-48 overflow-y-auto p-3 space-y-2">
            {taskPlan.milestones.map((milestone, idx) => (
              <div
                key={milestone.id}
                className={`p-2 rounded-lg border ${getStatusColor(milestone.status)}`}
              >
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(milestone.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-xs truncate">{milestone.title}</h4>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-white bg-opacity-50 ml-2">
                        {idx + 1}/{totalMilestones}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 text-gray-600">{milestone.description}</p>
                    {milestone.status === 'in_progress' && currentProgress.message && (
                      <p className="text-xs mt-1 text-blue-600 font-medium">
                        {currentProgress.message}
                      </p>
                    )}
                    {milestone.error && (
                      <p className="text-xs mt-1 text-red-600">
                        Error: {milestone.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskProgressBar;
