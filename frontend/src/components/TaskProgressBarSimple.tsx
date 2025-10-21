import React from 'react';
import { CheckCircle2, Circle, Loader2, XCircle, AlertCircle } from 'lucide-react';

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
  const completedMilestones = taskPlan.milestones.filter(m => m.status === 'completed').length;
  const totalMilestones = taskPlan.milestones.length;
  const progressPercentage = (completedMilestones / totalMilestones) * 100;

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
    <div className="fixed bottom-4 right-4 z-40 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
        <h3 className="font-bold text-lg">Task Progress</h3>
        <p className="text-sm text-indigo-100 mt-1">{taskPlan.objective}</p>
      </div>

      {/* Progress Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-700 font-medium">
            {completedMilestones} of {totalMilestones} milestones completed
          </span>
          <span className="text-gray-600">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Milestones */}
      <div className="max-h-64 overflow-y-auto p-4 space-y-3">
        {taskPlan.milestones.map((milestone, idx) => (
          <div
            key={milestone.id}
            className={`p-3 rounded-lg border ${getStatusColor(milestone.status)}`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(milestone.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm truncate">{milestone.title}</h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white bg-opacity-50 ml-2">
                    {idx + 1}/{totalMilestones}
                  </span>
                </div>
                <p className="text-xs mt-1 text-gray-600">{milestone.description}</p>
                {milestone.status === 'in_progress' && currentProgress.message && (
                  <p className="text-xs mt-2 text-blue-600 font-medium">
                    {currentProgress.message}
                  </p>
                )}
                {milestone.error && (
                  <p className="text-xs mt-2 text-red-600">
                    Error: {milestone.error}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Current Status */}
      {currentProgress.message && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Current: </span>
            {currentProgress.message}
          </p>
        </div>
      )}
    </div>
  );
};

export default TaskProgressBar;
