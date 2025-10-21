import { renderHook, act, waitFor } from '@testing-library/react';
import { useApprovalWorkflow } from '../useApprovalWorkflow';
import { io } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');

describe('useApprovalWorkflow', () => {
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connected: false,
    };

    (io as jest.Mock).mockReturnValue(mockSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Socket Connection', () => {
    it('should connect to backend on mount', () => {
      renderHook(() => useApprovalWorkflow('conv_123'));

      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          transports: ['websocket', 'polling'],
          autoConnect: true,
          reconnection: true,
        })
      );
    });

    it('should join conversation room when conversationId is provided', () => {
      renderHook(() => useApprovalWorkflow('conv_123'));

      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'connect'
      )?.[1];
      
      act(() => {
        connectHandler?.();
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('join_conversation', {
        conversationId: 'conv_123',
      });
    });

    it('should set isConnected to true when connected', () => {
      const { result } = renderHook(() => useApprovalWorkflow('conv_123'));

      expect(result.current.isConnected).toBe(false);

      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'connect'
      )?.[1];
      
      act(() => {
        connectHandler?.();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should set isConnected to false when disconnected', () => {
      const { result } = renderHook(() => useApprovalWorkflow('conv_123'));

      // Connect first
      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'connect'
      )?.[1];
      
      act(() => {
        connectHandler?.();
      });

      expect(result.current.isConnected).toBe(true);

      // Then disconnect
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'disconnect'
      )?.[1];
      
      act(() => {
        disconnectHandler?.();
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should disconnect on unmount', () => {
      const { unmount } = renderHook(() => useApprovalWorkflow('conv_123'));

      unmount();

      expect(mockSocket.emit).toHaveBeenCalledWith('leave_conversation', {
        conversationId: 'conv_123',
      });
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('Approval Requests', () => {
    it('should receive and store approval request', () => {
      const { result } = renderHook(() => useApprovalWorkflow('conv_123'));

      const approvalRequest = {
        id: 'req_123',
        type: 'command_execution',
        conversationId: 'conv_123',
        agentId: 'agent_456',
        timestamp: new Date(),
        risk: 'high',
        reason: 'Execute command',
        command: 'npm install express',
        workingDir: '/workspace',
      };

      // Simulate receiving approval request
      const approvalHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'approval_request'
      )?.[1];
      
      act(() => {
        approvalHandler?.({
          conversationId: 'conv_123',
          request: approvalRequest,
        });
      });

      expect(result.current.pendingApproval).toEqual(approvalRequest);
    });

    it('should clear pending approval after approval', () => {
      const { result } = renderHook(() => useApprovalWorkflow('conv_123'));

      const approvalRequest = {
        id: 'req_123',
        type: 'command_execution',
        conversationId: 'conv_123',
        agentId: 'agent_456',
        timestamp: new Date(),
        risk: 'high',
        reason: 'Execute command',
        command: 'npm install',
        workingDir: '/workspace',
      };

      // Receive approval request
      const approvalHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'approval_request'
      )?.[1];
      
      act(() => {
        approvalHandler?.({
          conversationId: 'conv_123',
          request: approvalRequest,
        });
      });

      expect(result.current.pendingApproval).toEqual(approvalRequest);

      // Approve request
      act(() => {
        result.current.approveRequest();
      });

      expect(result.current.pendingApproval).toBeNull();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'approval_response',
        expect.objectContaining({
          requestId: 'req_123',
          status: 'approved',
        })
      );
    });

    it('should clear pending approval after rejection', () => {
      const { result } = renderHook(() => useApprovalWorkflow('conv_123'));

      const approvalRequest = {
        id: 'req_123',
        type: 'command_execution',
        conversationId: 'conv_123',
        agentId: 'agent_456',
        timestamp: new Date(),
        risk: 'high',
        reason: 'Execute command',
        command: 'rm -rf /',
        workingDir: '/workspace',
      };

      // Receive approval request
      const approvalHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'approval_request'
      )?.[1];
      
      act(() => {
        approvalHandler?.({
          conversationId: 'conv_123',
          request: approvalRequest,
        });
      });

      // Reject request
      act(() => {
        result.current.rejectRequest();
      });

      expect(result.current.pendingApproval).toBeNull();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'approval_response',
        expect.objectContaining({
          requestId: 'req_123',
          status: 'rejected',
        })
      );
    });

    it('should send modified command with approval', () => {
      const { result } = renderHook(() => useApprovalWorkflow('conv_123'));

      const approvalRequest = {
        id: 'req_123',
        type: 'command_execution',
        conversationId: 'conv_123',
        agentId: 'agent_456',
        timestamp: new Date(),
        risk: 'medium',
        reason: 'Install package',
        command: 'npm install react',
        workingDir: '/workspace',
      };

      // Receive approval request
      const approvalHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'approval_request'
      )?.[1];
      
      act(() => {
        approvalHandler?.({
          conversationId: 'conv_123',
          request: approvalRequest,
        });
      });

      // Approve with modified command
      act(() => {
        result.current.approveRequest('npm install react@18.2.0');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'approval_response',
        expect.objectContaining({
          requestId: 'req_123',
          status: 'approved',
          modifiedCommand: 'npm install react@18.2.0',
        })
      );
    });

    it('should send selected packages with approval', () => {
      const { result } = renderHook(() => useApprovalWorkflow('conv_123'));

      const approvalRequest = {
        id: 'req_123',
        type: 'dependency_installation',
        conversationId: 'conv_123',
        agentId: 'agent_456',
        timestamp: new Date(),
        risk: 'medium',
        reason: 'Install dependencies',
        packages: [
          { name: 'react', devDependency: false },
          { name: 'vue', devDependency: false },
          { name: 'angular', devDependency: false },
        ],
        packageManager: 'npm',
      };

      // Receive approval request
      const approvalHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'approval_request'
      )?.[1];
      
      act(() => {
        approvalHandler?.({
          conversationId: 'conv_123',
          request: approvalRequest,
        });
      });

      // Approve with selected packages
      act(() => {
        result.current.approveRequest(undefined, ['react', 'vue']);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'approval_response',
        expect.objectContaining({
          requestId: 'req_123',
          status: 'approved',
          selectedPackages: ['react', 'vue'],
        })
      );
    });
  });

  describe('Task Progress', () => {
    it('should receive and store task progress updates', () => {
      const { result } = renderHook(() => useApprovalWorkflow('conv_123'));

      const progressUpdate = {
        type: 'milestone_progress',
        taskPlanId: 'plan_123',
        objective: 'Create React app',
        currentMilestone: {
          id: 'milestone_1',
          title: 'Initialize project',
          status: 'in_progress',
        },
        currentStep: 1,
        totalSteps: 5,
        percentage: 20,
        message: '🔄 Initializing project...',
        timestamp: new Date(),
      };

      // Simulate receiving task progress
      const progressHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'task_progress'
      )?.[1];
      
      act(() => {
        progressHandler?.({
          conversationId: 'conv_123',
          progress: progressUpdate,
        });
      });

      expect(result.current.taskProgress).toEqual(progressUpdate);
    });

    it('should store task plan when received', () => {
      const { result } = renderHook(() => useApprovalWorkflow('conv_123'));

      const taskPlan = {
        id: 'plan_123',
        objective: 'Create React app',
        description: 'Set up React application',
        milestones: [
          {
            id: 'milestone_1',
            order: 1,
            title: 'Initialize project',
            description: 'Create project structure',
            type: 'command_execution',
            status: 'pending',
            requiresApproval: true,
            tools: ['execute_command'],
          },
        ],
        estimatedSteps: 1,
        requiresApproval: true,
        createdAt: new Date(),
      };

      const progressUpdate = {
        type: 'plan',
        taskPlanId: 'plan_123',
        objective: 'Create React app',
        message: 'Task plan created',
        timestamp: new Date(),
        metadata: { taskPlan },
      };

      // Simulate receiving task plan
      const progressHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'task_progress'
      )?.[1];
      
      act(() => {
        progressHandler?.({
          conversationId: 'conv_123',
          progress: progressUpdate,
        });
      });

      expect(result.current.currentTaskPlan).toEqual(taskPlan);
    });

    it('should update milestone status in task plan', () => {
      const { result } = renderHook(() => useApprovalWorkflow('conv_123'));

      const taskPlan = {
        id: 'plan_123',
        objective: 'Create React app',
        milestones: [
          {
            id: 'milestone_1',
            order: 1,
            title: 'Initialize project',
            status: 'pending',
          },
        ],
      };

      // Set initial task plan
      const progressHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'task_progress'
      )?.[1];
      
      act(() => {
        progressHandler?.({
          conversationId: 'conv_123',
          progress: {
            type: 'plan',
            metadata: { taskPlan },
            timestamp: new Date(),
          },
        });
      });

      // Update milestone status
      act(() => {
        progressHandler?.({
          conversationId: 'conv_123',
          progress: {
            type: 'milestone_progress',
            currentMilestone: {
              id: 'milestone_1',
              order: 1,
              title: 'Initialize project',
              status: 'in_progress',
            },
            timestamp: new Date(),
          },
        });
      });

      expect(result.current.currentTaskPlan?.milestones[0].status).toBe('in_progress');
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', () => {
      const { result } = renderHook(() => useApprovalWorkflow('conv_123'));

      const connectErrorHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'connect_error'
      )?.[1];
      
      act(() => {
        connectErrorHandler?.(new Error('Connection failed'));
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should not crash when approving without pending request', () => {
      const { result } = renderHook(() => useApprovalWorkflow('conv_123'));

      expect(() => {
        act(() => {
          result.current.approveRequest();
        });
      }).not.toThrow();
    });

    it('should not crash when rejecting without pending request', () => {
      const { result } = renderHook(() => useApprovalWorkflow('conv_123'));

      expect(() => {
        act(() => {
          result.current.rejectRequest();
        });
      }).not.toThrow();
    });
  });

  describe('Without ConversationId', () => {
    it('should work without conversationId', () => {
      const { result } = renderHook(() => useApprovalWorkflow());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.pendingApproval).toBeNull();
      expect(result.current.taskProgress).toBeNull();
      expect(result.current.currentTaskPlan).toBeNull();
    });

    it('should not join conversation room without conversationId', () => {
      renderHook(() => useApprovalWorkflow());

      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'connect'
      )?.[1];
      
      act(() => {
        connectHandler?.();
      });

      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'join_conversation',
        expect.anything()
      );
    });
  });
});
