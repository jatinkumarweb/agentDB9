import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export interface AgentActivity {
  id: string;
  type: 'file_edit' | 'file_create' | 'file_delete' | 'git_operation' | 'terminal_command' | 'test_run';
  description: string;
  file?: string;
  range?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  timestamp: Date;
  status: 'in_progress' | 'completed' | 'failed';
  details?: any;
}

export interface UseAgentActivityReturn {
  agentActivity: AgentActivity[];
  isConnected: boolean;
  connectionError: string | null;
  clearActivity: () => void;
  addActivity: (activity: Omit<AgentActivity, 'id' | 'timestamp'>) => void;
}

export const useAgentActivity = (): UseAgentActivityReturn => {
  const [agentActivity, setAgentActivity] = useState<AgentActivity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Connect to MCP server WebSocket for real-time agent activity
    const mcpServerUrl = process.env.NEXT_PUBLIC_MCP_WS_URL || 'ws://localhost:9002';
    
    const newSocket = io(mcpServerUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log('Connected to MCP server for agent activity');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from MCP server');
    });

    newSocket.on('connect_error', (error) => {
      setConnectionError(error.message);
      setIsConnected(false);
      console.error('MCP server connection error:', error);
    });

    // Listen for agent activity events
    newSocket.on('agent_activity', (activity: Omit<AgentActivity, 'id' | 'timestamp'>) => {
      const newActivity: AgentActivity = {
        ...activity,
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };

      setAgentActivity(prev => {
        // Keep only the last 100 activities to prevent memory issues
        const updated = [...prev, newActivity];
        return updated.slice(-100);
      });
    });

    // Listen for tool execution events
    newSocket.on('tool_execution', (data: {
      tool: string;
      parameters: any;
      status: 'started' | 'completed' | 'failed';
      result?: any;
      error?: string;
    }) => {
      const activity: AgentActivity = {
        id: `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: getActivityTypeFromTool(data.tool),
        description: getActivityDescription(data.tool, data.parameters, data.status),
        file: data.parameters?.path || data.parameters?.file,
        timestamp: new Date(),
        status: data.status === 'started' ? 'in_progress' : 
                data.status === 'completed' ? 'completed' : 'failed',
        details: {
          tool: data.tool,
          parameters: data.parameters,
          result: data.result,
          error: data.error
        }
      };

      setAgentActivity(prev => {
        const updated = [...prev, activity];
        return updated.slice(-100);
      });
    });

    // Listen for file change events
    newSocket.on('file_changed', (data: {
      path: string;
      action: 'created' | 'modified' | 'deleted';
      content?: string;
    }) => {
      const activity: AgentActivity = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: data.action === 'created' ? 'file_create' : 
              data.action === 'deleted' ? 'file_delete' : 'file_edit',
        description: `File ${data.action}: ${data.path}`,
        file: data.path,
        timestamp: new Date(),
        status: 'completed'
      };

      setAgentActivity(prev => {
        const updated = [...prev, activity];
        return updated.slice(-100);
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const clearActivity = () => {
    setAgentActivity([]);
  };

  const addActivity = (activity: Omit<AgentActivity, 'id' | 'timestamp'>) => {
    const newActivity: AgentActivity = {
      ...activity,
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    setAgentActivity(prev => {
      const updated = [...prev, newActivity];
      return updated.slice(-100);
    });
  };

  return {
    agentActivity,
    isConnected,
    connectionError,
    clearActivity,
    addActivity
  };
};

// Helper functions
function getActivityTypeFromTool(tool: string): AgentActivity['type'] {
  if (tool.startsWith('fs_') || tool.startsWith('editor_')) {
    if (tool.includes('create')) return 'file_create';
    if (tool.includes('delete')) return 'file_delete';
    return 'file_edit';
  }
  
  if (tool.startsWith('git_')) {
    return 'git_operation';
  }
  
  if (tool.startsWith('terminal_')) {
    return 'terminal_command';
  }
  
  if (tool.startsWith('test_')) {
    return 'test_run';
  }
  
  return 'file_edit';
}

function getActivityDescription(tool: string, parameters: any, status: string): string {
  const toolDescriptions: Record<string, string> = {
    'fs_read_file': `Reading file: ${parameters?.path}`,
    'fs_write_file': `Writing file: ${parameters?.path}`,
    'fs_create_file': `Creating file: ${parameters?.path}`,
    'fs_delete_file': `Deleting file: ${parameters?.path}`,
    'git_add': `Adding files to git: ${parameters?.files?.join(', ')}`,
    'git_commit': `Committing changes: ${parameters?.message}`,
    'git_push': `Pushing to remote`,
    'git_pull': `Pulling from remote`,
    'terminal_execute': `Executing: ${parameters?.command}`,
    'test_run_all': `Running all tests`,
    'test_run_file': `Running tests for: ${parameters?.file}`,
    'project_init': `Initializing project: ${parameters?.name}`,
  };

  const baseDescription = toolDescriptions[tool] || `Executing ${tool}`;
  
  if (status === 'started') {
    return baseDescription;
  } else if (status === 'failed') {
    return `Failed: ${baseDescription}`;
  } else {
    return `Completed: ${baseDescription}`;
  }
}