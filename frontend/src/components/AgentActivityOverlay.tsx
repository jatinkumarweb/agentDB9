'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  FileText, 
  GitBranch, 
  Terminal, 
  TestTube, 
  Folder,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { useAgentActivity, AgentActivity } from '@/hooks/useAgentActivity';
import { cn } from '@/utils/cn';

interface AgentActivityOverlayProps {
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxItems?: number;
}

export const AgentActivityOverlay: React.FC<AgentActivityOverlayProps> = ({
  className = '',
  position = 'top-right',
  maxItems = 5
}) => {
  const { agentActivity, isConnected, connectionError, clearActivity } = useAgentActivity();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  // Show overlay when there's activity
  useEffect(() => {
    setIsVisible(agentActivity.length > 0);
  }, [agentActivity]);

  const getActivityIcon = (type: AgentActivity['type']) => {
    switch (type) {
      case 'file_edit':
      case 'file_create':
      case 'file_delete':
        return <FileText className="w-4 h-4" />;
      case 'git_operation':
        return <GitBranch className="w-4 h-4" />;
      case 'terminal_command':
        return <Terminal className="w-4 h-4" />;
      case 'test_run':
        return <TestTube className="w-4 h-4" />;
      default:
        return <Folder className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: AgentActivity['status']) => {
    switch (status) {
      case 'in_progress':
        return <Loader2 className="w-3 h-3 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Clock className="w-3 h-3 text-gray-500" />;
    }
  };

  const getStatusColor = (status: AgentActivity['status']) => {
    switch (status) {
      case 'in_progress':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'completed':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'failed':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      default:
        return 'border-gray-300 bg-gray-50 dark:bg-gray-800';
    }
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  const recentActivity = agentActivity.slice(-maxItems);

  if (!isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        className={cn(
          "fixed z-50 w-80 max-w-sm",
          positionClasses[position],
          className
        )}
      >
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Agent Activity
              </span>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )} />
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              <button
                onClick={clearActivity}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Clear activity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Connection Status */}
          {connectionError && (
            <div className="p-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
              <p className="text-xs text-red-600 dark:text-red-400">
                Connection error: {connectionError}
              </p>
            </div>
          )}

          {/* Activity List */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="max-h-64 overflow-y-auto">
                  {recentActivity.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {recentActivity.map((activity) => (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className={cn(
                            "rounded transition-colors overflow-hidden",
                            activity.type === 'terminal_command' 
                              ? "bg-gray-900 dark:bg-black border border-gray-700" 
                              : cn("p-2 border-l-4", getStatusColor(activity.status))
                          )}
                        >
                          {activity.type === 'terminal_command' ? (
                            <div className="font-mono text-xs">
                              {/* Terminal header */}
                              <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 dark:bg-gray-950 border-b border-gray-700">
                                <div className="flex items-center space-x-2">
                                  <Terminal className="w-3 h-3 text-green-400" />
                                  <span className="text-gray-400 text-[10px]">Terminal</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(activity.status)}
                                  <span className="text-gray-500 text-[10px]">
                                    {formatTime(activity.timestamp)}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Terminal content */}
                              <div className="p-3 space-y-1">
                                {/* Command line */}
                                <div className="flex items-start space-x-2">
                                  <span className="text-green-400 flex-shrink-0">$</span>
                                  <span className="text-gray-100 break-all">
                                    {activity.details?.parameters?.command || activity.description.replace(/^(Executing|Completed|Failed):\s*/, '')}
                                  </span>
                                </div>
                                
                                {/* Command output */}
                                {activity.details?.result && (
                                  <div className="text-gray-300 whitespace-pre-wrap break-words pl-4 max-h-32 overflow-y-auto">
                                    {typeof activity.details.result === 'string' 
                                      ? activity.details.result 
                                      : JSON.stringify(activity.details.result, null, 2)}
                                  </div>
                                )}
                                
                                {/* Error output */}
                                {activity.details?.error && (
                                  <div className="text-red-400 whitespace-pre-wrap break-words pl-4">
                                    {activity.details.error}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start space-x-2">
                              <div className="flex-shrink-0 mt-0.5">
                                {getActivityIcon(activity.type)}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {activity.description}
                                  </p>
                                  {getStatusIcon(activity.status)}
                                </div>
                                
                                {activity.file && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                    {activity.file}
                                  </p>
                                )}
                                
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {formatTime(activity.timestamp)}
                                  </span>
                                  
                                  {activity.details?.error && (
                                    <span className="text-xs text-red-500 truncate max-w-32" title={activity.details.error}>
                                      Error
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          {isExpanded && agentActivity.length > maxItems && (
            <div className="p-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Showing {maxItems} of {agentActivity.length} activities
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

function formatTime(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  
  if (diff < 60000) { // Less than 1 minute
    return 'Just now';
  } else if (diff < 3600000) { // Less than 1 hour
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  } else if (diff < 86400000) { // Less than 1 day
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  } else {
    return timestamp.toLocaleDateString();
  }
}

export default AgentActivityOverlay;