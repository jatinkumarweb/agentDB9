import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ApprovalRequest } from '../components/ApprovalDialog';

interface TaskProgressUpdate {
  type: 'plan' | 'milestone_start' | 'milestone_progress' | 'milestone_complete' | 'tool_execution' | 'approval_required' | 'final_answer';
  taskPlanId?: string;
  objective?: string;
  currentMilestone?: any;
  currentStep?: number;
  totalSteps?: number;
  percentage?: number;
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface UseApprovalWorkflowReturn {
  pendingApproval: ApprovalRequest | null;
  taskProgress: TaskProgressUpdate | null;
  currentTaskPlan: any | null;
  approveRequest: (modifiedCommand?: string, selectedPackages?: string[]) => void;
  rejectRequest: () => void;
  isConnected: boolean;
}

export const useApprovalWorkflow = (conversationId?: string): UseApprovalWorkflowReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null);
  const [taskProgress, setTaskProgress] = useState<TaskProgressUpdate | null>(null);
  const [currentTaskPlan, setCurrentTaskPlan] = useState<any | null>(null);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to backend for approval workflow');
      
      // Join conversation room if conversationId is provided
      if (conversationId) {
        newSocket.emit('join_conversation', { conversationId });
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from backend');
    });

    // Listen for approval requests
    newSocket.on('approval_request', (data: { conversationId: string; request: ApprovalRequest }) => {
      console.log('Approval request received:', data.request);
      setPendingApproval(data.request);
    });

    // Listen for task progress updates
    newSocket.on('task_progress', (data: { conversationId: string; progress: TaskProgressUpdate }) => {
      console.log('Task progress update:', data.progress);
      setTaskProgress(data.progress);
      
      // Store task plan when received
      if (data.progress.type === 'plan' && data.progress.metadata?.taskPlan) {
        setCurrentTaskPlan(data.progress.metadata.taskPlan);
      }
      
      // Update task plan milestones
      if (data.progress.currentMilestone && currentTaskPlan) {
        setCurrentTaskPlan((prev: any) => {
          if (!prev) return prev;
          
          const updatedMilestones = prev.milestones.map((m: any) => 
            m.id === data.progress.currentMilestone.id 
              ? data.progress.currentMilestone 
              : m
          );
          
          return { ...prev, milestones: updatedMilestones };
        });
      }
    });

    setSocket(newSocket);

    return () => {
      if (conversationId) {
        newSocket.emit('leave_conversation', { conversationId });
      }
      newSocket.disconnect();
    };
  }, [conversationId]);

  const approveRequest = useCallback((modifiedCommand?: string, selectedPackages?: string[]) => {
    if (!socket || !pendingApproval) return;

    console.log('Approving request:', pendingApproval.id);
    socket.emit('approval_response', {
      requestId: pendingApproval.id,
      status: 'approved',
      modifiedCommand,
      selectedPackages,
      timestamp: new Date().toISOString(),
    });

    setPendingApproval(null);
  }, [socket, pendingApproval]);

  const rejectRequest = useCallback(() => {
    if (!socket || !pendingApproval) return;

    console.log('Rejecting request:', pendingApproval.id);
    socket.emit('approval_response', {
      requestId: pendingApproval.id,
      status: 'rejected',
      timestamp: new Date().toISOString(),
    });

    setPendingApproval(null);
  }, [socket, pendingApproval]);

  return {
    pendingApproval,
    taskProgress,
    currentTaskPlan,
    approveRequest,
    rejectRequest,
    isConnected,
  };
};
