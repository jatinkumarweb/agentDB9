/**
 * Integration Tests for Approval Workflow
 * 
 * These tests verify the end-to-end flow of the approval system
 * from backend to frontend through WebSocket communication.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { ApprovalService } from '../../backend/src/common/services/approval.service';
import { MCPService } from '../../backend/src/mcp/mcp.service';
import { ReActAgentService } from '../../backend/src/conversations/react-agent.service';
import { WebSocketGateway } from '../../backend/src/websocket/websocket.gateway';

describe('Approval Workflow Integration Tests', () => {
  let app: INestApplication;
  let clientSocket: Socket;
  let approvalService: ApprovalService;
  let mcpService: MCPService;
  let reactService: ReActAgentService;

  beforeAll(async () => {
    // Set up test application
    // Note: This is a template - actual implementation depends on your test setup
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('Command Approval Flow', () => {
    it('should complete full approval flow for command execution', async (done) => {
      const conversationId = 'test_conv_123';
      const agentId = 'test_agent_456';
      const command = 'npm install express';

      // Step 1: Client joins conversation
      clientSocket.emit('join_conversation', { conversationId });

      // Step 2: Listen for approval request
      clientSocket.on('approval_request', (data: any) => {
        expect(data.request.type).toBe('command_execution');
        expect(data.request.command).toBe(command);
        expect(data.request.risk).toBe('medium');

        // Step 3: User approves
        clientSocket.emit('approval_response', {
          requestId: data.request.id,
          status: 'approved',
          timestamp: new Date().toISOString(),
        });
      });

      // Step 4: Execute tool that requires approval
      const result = await mcpService.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        '/workspace',
        {
          conversationId,
          agentId,
          requireApproval: true,
        }
      );

      expect(result.success).toBe(true);
      done();
    }, 10000);

    it('should reject command when user rejects approval', async (done) => {
      const conversationId = 'test_conv_124';
      const agentId = 'test_agent_456';
      const command = 'rm -rf /';

      clientSocket.emit('join_conversation', { conversationId });

      clientSocket.on('approval_request', (data: any) => {
        expect(data.request.risk).toBe('critical');

        // User rejects dangerous command
        clientSocket.emit('approval_response', {
          requestId: data.request.id,
          status: 'rejected',
          timestamp: new Date().toISOString(),
        });
      });

      const result = await mcpService.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        '/workspace',
        {
          conversationId,
          agentId,
          requireApproval: true,
        }
      );

      expect(result.success).toBe(false);
      expect(result.approvalRejected).toBe(true);
      done();
    }, 10000);

    it('should use modified command when provided', async (done) => {
      const conversationId = 'test_conv_125';
      const agentId = 'test_agent_456';
      const originalCommand = 'npm install react';
      const modifiedCommand = 'npm install react@18.2.0';

      clientSocket.emit('join_conversation', { conversationId });

      clientSocket.on('approval_request', (data: any) => {
        // User modifies and approves
        clientSocket.emit('approval_response', {
          requestId: data.request.id,
          status: 'approved',
          modifiedCommand,
          timestamp: new Date().toISOString(),
        });
      });

      const toolCall = {
        name: 'execute_command',
        arguments: { command: originalCommand },
      };

      await mcpService.executeTool(
        toolCall,
        '/workspace',
        {
          conversationId,
          agentId,
          requireApproval: true,
        }
      );

      // Verify modified command was used
      expect(toolCall.arguments.command).toBe(modifiedCommand);
      done();
    }, 10000);
  });

  describe('Dependency Installation Flow', () => {
    it('should complete full approval flow for dependency installation', async (done) => {
      const conversationId = 'test_conv_126';
      const agentId = 'test_agent_456';
      const command = 'npm install react vue angular';

      clientSocket.emit('join_conversation', { conversationId });

      clientSocket.on('approval_request', (data: any) => {
        expect(data.request.type).toBe('dependency_installation');
        expect(data.request.packages).toHaveLength(3);
        expect(data.request.packageManager).toBe('npm');

        // User selects only react and vue
        clientSocket.emit('approval_response', {
          requestId: data.request.id,
          status: 'approved',
          selectedPackages: ['react', 'vue'],
          timestamp: new Date().toISOString(),
        });
      });

      const toolCall = {
        name: 'execute_command',
        arguments: { command },
      };

      await mcpService.executeTool(
        toolCall,
        '/workspace',
        {
          conversationId,
          agentId,
          requireApproval: true,
        }
      );

      // Verify command was modified to only install selected packages
      expect(toolCall.arguments.command).toContain('react');
      expect(toolCall.arguments.command).toContain('vue');
      expect(toolCall.arguments.command).not.toContain('angular');
      done();
    }, 10000);
  });

  describe('Task Planning Flow', () => {
    it('should broadcast task plan before execution', async (done) => {
      const conversationId = 'test_conv_127';
      const agentId = 'test_agent_456';
      const userMessage = 'Create a React app with TypeScript';

      clientSocket.emit('join_conversation', { conversationId });

      let taskPlanReceived = false;
      let milestonesReceived = 0;

      // Listen for task plan
      clientSocket.on('task_progress', (data: any) => {
        if (data.progress.type === 'plan') {
          taskPlanReceived = true;
          expect(data.progress.objective).toContain('React');
          expect(data.progress.metadata.taskPlan.milestones.length).toBeGreaterThan(0);
        }

        if (data.progress.type === 'milestone_progress') {
          milestonesReceived++;
        }

        if (data.progress.type === 'milestone_complete') {
          expect(data.progress.currentMilestone.status).toBe('completed');
        }
      });

      // Execute ReACT with task planning
      await reactService.executeReActLoop(
        userMessage,
        'You are a helpful assistant',
        'qwen2.5-coder:7b',
        'http://localhost:11434',
        [],
        conversationId,
        undefined,
        5,
        undefined,
        '/workspace',
        agentId,
        true, // Enable task planning
      );

      expect(taskPlanReceived).toBe(true);
      expect(milestonesReceived).toBeGreaterThan(0);
      done();
    }, 30000);

    it('should update milestone status in real-time', async (done) => {
      const conversationId = 'test_conv_128';
      const agentId = 'test_agent_456';

      clientSocket.emit('join_conversation', { conversationId });

      const milestoneStatuses: string[] = [];

      clientSocket.on('task_progress', (data: any) => {
        if (data.progress.currentMilestone) {
          milestoneStatuses.push(data.progress.currentMilestone.status);
        }
      });

      // Execute task with milestones
      await reactService.executeReActLoop(
        'Create a simple React component',
        'You are a helpful assistant',
        'qwen2.5-coder:7b',
        'http://localhost:11434',
        [],
        conversationId,
        undefined,
        5,
        undefined,
        '/workspace',
        agentId,
        true,
      );

      // Verify milestone status progression
      expect(milestoneStatuses).toContain('in_progress');
      expect(milestoneStatuses).toContain('completed');
      done();
    }, 30000);
  });

  describe('File Operation Flow', () => {
    it('should request approval for file deletion', async (done) => {
      const conversationId = 'test_conv_129';
      const agentId = 'test_agent_456';
      const filePath = '/workspace/important-file.txt';

      clientSocket.emit('join_conversation', { conversationId });

      clientSocket.on('approval_request', (data: any) => {
        expect(data.request.type).toBe('file_operation');
        expect(data.request.operation).toBe('delete');
        expect(data.request.path).toBe(filePath);
        expect(data.request.risk).toBe('high');

        // User approves deletion
        clientSocket.emit('approval_response', {
          requestId: data.request.id,
          status: 'approved',
          timestamp: new Date().toISOString(),
        });
      });

      const result = await mcpService.executeTool(
        {
          name: 'delete_file',
          arguments: { path: filePath },
        },
        '/workspace',
        {
          conversationId,
          agentId,
          requireApproval: true,
        }
      );

      expect(result.success).toBe(true);
      done();
    }, 10000);
  });

  describe('Git Operation Flow', () => {
    it('should request approval for git push', async (done) => {
      const conversationId = 'test_conv_130';
      const agentId = 'test_agent_456';

      clientSocket.emit('join_conversation', { conversationId });

      clientSocket.on('approval_request', (data: any) => {
        expect(data.request.type).toBe('git_operation');
        expect(data.request.operation).toBe('push');
        expect(data.request.risk).toBe('high');

        // User approves push
        clientSocket.emit('approval_response', {
          requestId: data.request.id,
          status: 'approved',
          timestamp: new Date().toISOString(),
        });
      });

      const result = await mcpService.executeTool(
        {
          name: 'git_push',
          arguments: {},
        },
        '/workspace',
        {
          conversationId,
          agentId,
          requireApproval: true,
        }
      );

      expect(result.success).toBe(true);
      done();
    }, 10000);
  });

  describe('Error Scenarios', () => {
    it('should handle approval timeout gracefully', async (done) => {
      const conversationId = 'test_conv_131';
      const agentId = 'test_agent_456';
      const command = 'npm install';

      clientSocket.emit('join_conversation', { conversationId });

      // Don't respond to approval request - let it timeout

      const result = await mcpService.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        '/workspace',
        {
          conversationId,
          agentId,
          requireApproval: true,
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
      done();
    }, 65000); // Longer timeout for this test

    it('should handle WebSocket disconnection during approval', async (done) => {
      const conversationId = 'test_conv_132';
      const agentId = 'test_agent_456';

      clientSocket.emit('join_conversation', { conversationId });

      clientSocket.on('approval_request', () => {
        // Disconnect before responding
        clientSocket.disconnect();
      });

      const result = await mcpService.executeTool(
        {
          name: 'execute_command',
          arguments: { command: 'npm install' },
        },
        '/workspace',
        {
          conversationId,
          agentId,
          requireApproval: true,
        }
      );

      // Should timeout or handle disconnection gracefully
      expect(result.success).toBe(false);
      done();
    }, 65000);
  });

  describe('Multiple Concurrent Approvals', () => {
    it('should handle multiple approval requests in sequence', async (done) => {
      const conversationId = 'test_conv_133';
      const agentId = 'test_agent_456';

      clientSocket.emit('join_conversation', { conversationId });

      let approvalCount = 0;

      clientSocket.on('approval_request', (data: any) => {
        approvalCount++;
        
        // Approve all requests
        clientSocket.emit('approval_response', {
          requestId: data.request.id,
          status: 'approved',
          timestamp: new Date().toISOString(),
        });
      });

      // Execute multiple tools requiring approval
      const results = await Promise.all([
        mcpService.executeTool(
          { name: 'execute_command', arguments: { command: 'npm install react' } },
          '/workspace',
          { conversationId, agentId, requireApproval: true }
        ),
        mcpService.executeTool(
          { name: 'execute_command', arguments: { command: 'npm install vue' } },
          '/workspace',
          { conversationId, agentId, requireApproval: true }
        ),
        mcpService.executeTool(
          { name: 'delete_file', arguments: { path: '/workspace/test.txt' } },
          '/workspace',
          { conversationId, agentId, requireApproval: true }
        ),
      ]);

      expect(approvalCount).toBe(3);
      expect(results.every(r => r.success)).toBe(true);
      done();
    }, 30000);
  });
});
