import { Test, TestingModule } from '@nestjs/testing';
import { MCPService } from '../mcp.service';
import { ApprovalService } from '../../common/services/approval.service';
import { ApprovalStatus, ApprovalType, RiskLevel } from '../../common/interfaces/approval.interface';
import { Logger } from '@nestjs/common';

/**
 * Tests to verify approval requests are properly sent for critical commands
 * This ensures users see approval dialogs for dangerous operations
 */
describe('MCPService - Approval Flow', () => {
  let service: MCPService;
  let approvalService: ApprovalService;
  const mockWorkspaceRoot = '/workspace';
  const testProjectDir = '/workspace/projects/testapp';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MCPService,
        {
          provide: ApprovalService,
          useValue: {
            requestCommandApproval: jest.fn(),
            requestDependencyApproval: jest.fn(),
            requestFileOperationApproval: jest.fn(),
            requestGitOperationApproval: jest.fn(),
            shouldRequireApproval: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: 'WORKSPACE_ROOT',
          useValue: mockWorkspaceRoot,
        },
      ],
    }).compile();

    service = module.get<MCPService>(MCPService);
    approvalService = module.get<ApprovalService>(ApprovalService);
    
    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Execution Approval', () => {
    it('should request approval for high-risk commands', async () => {
      const highRiskCommand = 'rm -rf node_modules';
      
      // Mock approval service to approve
      jest.spyOn(approvalService, 'requestCommandApproval').mockResolvedValue({
        requestId: 'test-request-id',
        status: ApprovalStatus.APPROVED,
        timestamp: new Date(),
      });

      const toolCall = {
        name: 'execute_command',
        arguments: {
          command: highRiskCommand,
        },
      };

      await service.executeTool(toolCall, testProjectDir, {
        conversationId: 'test-conv-id',
        agentId: 'test-agent-id',
        requireApproval: true,
      });

      // Verify approval was requested
      expect(approvalService.requestCommandApproval).toHaveBeenCalledWith(
        highRiskCommand,
        testProjectDir,
        'test-conv-id',
        'test-agent-id',
        expect.any(String),
      );
    });

    it('should reject command when user rejects approval', async () => {
      const command = 'npm install dangerous-package';
      
      // Mock approval service to reject
      jest.spyOn(approvalService, 'requestCommandApproval').mockResolvedValue({
        requestId: 'test-request-id',
        status: ApprovalStatus.REJECTED,
        timestamp: new Date(),
        comment: 'User rejected this operation',
      });

      const toolCall = {
        name: 'execute_command',
        arguments: {
          command,
        },
      };

      const result = await service.executeTool(toolCall, testProjectDir, {
        conversationId: 'test-conv-id',
        agentId: 'test-agent-id',
        requireApproval: true,
      });

      // Verify command was rejected
      expect(result.success).toBe(false);
      expect(result.approvalRejected).toBe(true);
      expect(result.error).toContain('rejected');
    });

    it('should use modified command when user modifies it', async () => {
      const originalCommand = 'npm install package1 package2';
      const modifiedCommand = 'npm install package1';
      
      // Mock approval service to approve with modification
      jest.spyOn(approvalService, 'requestCommandApproval').mockResolvedValue({
        requestId: 'test-request-id',
        status: ApprovalStatus.APPROVED,
        timestamp: new Date(),
        modifiedCommand,
      });

      // Mock executeCommand to verify the modified command is used
      const executeCommandSpy = jest.spyOn(service as any, 'executeCommand').mockResolvedValue({
        stdout: 'installed',
        stderr: '',
        exitCode: 0,
      });

      const toolCall = {
        name: 'execute_command',
        arguments: {
          command: originalCommand,
        },
      };

      await service.executeTool(toolCall, testProjectDir, {
        conversationId: 'test-conv-id',
        agentId: 'test-agent-id',
        requireApproval: true,
      });

      // Verify the modified command was used
      expect(executeCommandSpy).toHaveBeenCalledWith(modifiedCommand, testProjectDir);
    });

    it('should timeout approval request after configured time', async () => {
      const command = 'npm install';
      
      // Mock approval service to timeout
      jest.spyOn(approvalService, 'requestCommandApproval').mockResolvedValue({
        requestId: 'test-request-id',
        status: ApprovalStatus.TIMEOUT,
        timestamp: new Date(),
      });

      const toolCall = {
        name: 'execute_command',
        arguments: {
          command,
        },
      };

      const result = await service.executeTool(toolCall, testProjectDir, {
        conversationId: 'test-conv-id',
        agentId: 'test-agent-id',
        requireApproval: true,
      });

      // Verify command was rejected due to timeout
      expect(result.success).toBe(false);
      expect(result.error).toContain('rejected');
    });
  });

  describe('Dependency Installation Approval', () => {
    it('should request approval for npm install commands', async () => {
      const command = 'npm install react react-dom';
      
      // Mock approval service to approve
      jest.spyOn(approvalService, 'requestDependencyApproval').mockResolvedValue({
        requestId: 'test-request-id',
        status: ApprovalStatus.APPROVED,
        timestamp: new Date(),
      });

      const toolCall = {
        name: 'execute_command',
        arguments: {
          command,
        },
      };

      await service.executeTool(toolCall, testProjectDir, {
        conversationId: 'test-conv-id',
        agentId: 'test-agent-id',
        requireApproval: true,
      });

      // Verify dependency approval was requested
      expect(approvalService.requestDependencyApproval).toHaveBeenCalledWith(
        ['react', 'react-dom'],
        'npm',
        testProjectDir,
        'test-conv-id',
        'test-agent-id',
        false, // not dev dependencies
      );
    });

    it('should detect dev dependencies', async () => {
      const command = 'npm install --save-dev typescript @types/node';
      
      jest.spyOn(approvalService, 'requestDependencyApproval').mockResolvedValue({
        requestId: 'test-request-id',
        status: ApprovalStatus.APPROVED,
        timestamp: new Date(),
      });

      const toolCall = {
        name: 'execute_command',
        arguments: {
          command,
        },
      };

      await service.executeTool(toolCall, testProjectDir, {
        conversationId: 'test-conv-id',
        agentId: 'test-agent-id',
        requireApproval: true,
      });

      // Verify dev dependency flag was set
      expect(approvalService.requestDependencyApproval).toHaveBeenCalledWith(
        ['typescript', '@types/node'],
        'npm',
        testProjectDir,
        'test-conv-id',
        'test-agent-id',
        true, // dev dependencies
      );
    });

    it('should allow user to select specific packages to install', async () => {
      const command = 'npm install package1 package2 package3';
      
      // Mock approval with selected packages
      jest.spyOn(approvalService, 'requestDependencyApproval').mockResolvedValue({
        requestId: 'test-request-id',
        status: ApprovalStatus.APPROVED,
        timestamp: new Date(),
        selectedPackages: ['package1', 'package3'], // User deselected package2
      });

      const executeCommandSpy = jest.spyOn(service as any, 'executeCommand').mockResolvedValue({
        stdout: 'installed',
        stderr: '',
        exitCode: 0,
      });

      const toolCall = {
        name: 'execute_command',
        arguments: {
          command,
        },
      };

      await service.executeTool(toolCall, testProjectDir, {
        conversationId: 'test-conv-id',
        agentId: 'test-agent-id',
        requireApproval: true,
      });

      // Verify only selected packages were installed
      expect(executeCommandSpy).toHaveBeenCalledWith(
        'npm install package1 package3',
        testProjectDir
      );
    });
  });

  describe('File Operation Approval', () => {
    it('should request approval for file deletion', async () => {
      const filePath = 'important-file.txt';
      
      jest.spyOn(approvalService, 'requestFileOperationApproval').mockResolvedValue({
        requestId: 'test-request-id',
        status: ApprovalStatus.APPROVED,
        timestamp: new Date(),
      });

      const toolCall = {
        name: 'delete_file',
        arguments: {
          path: filePath,
        },
      };

      await service.executeTool(toolCall, testProjectDir, {
        conversationId: 'test-conv-id',
        agentId: 'test-agent-id',
        requireApproval: true,
      });

      // Verify file operation approval was requested
      expect(approvalService.requestFileOperationApproval).toHaveBeenCalledWith(
        'delete',
        filePath,
        'test-conv-id',
        'test-agent-id',
        undefined,
        undefined,
      );
    });
  });

  describe('Git Operation Approval', () => {
    it('should request approval for git push', async () => {
      const command = 'git push origin main';
      
      jest.spyOn(approvalService, 'requestGitOperationApproval').mockResolvedValue({
        requestId: 'test-request-id',
        status: ApprovalStatus.APPROVED,
        timestamp: new Date(),
      });

      const toolCall = {
        name: 'execute_command',
        arguments: {
          command,
        },
      };

      await service.executeTool(toolCall, testProjectDir, {
        conversationId: 'test-conv-id',
        agentId: 'test-agent-id',
        requireApproval: true,
      });

      // Verify git operation approval was requested
      expect(approvalService.requestGitOperationApproval).toHaveBeenCalled();
    });
  });

  describe('Approval Bypass', () => {
    it('should skip approval when requireApproval is false', async () => {
      const command = 'rm -rf dangerous';
      
      const executeCommandSpy = jest.spyOn(service as any, 'executeCommand').mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      const toolCall = {
        name: 'execute_command',
        arguments: {
          command,
        },
      };

      await service.executeTool(toolCall, testProjectDir, {
        conversationId: 'test-conv-id',
        agentId: 'test-agent-id',
        requireApproval: false, // Explicitly disable approval
      });

      // Verify no approval was requested
      expect(approvalService.requestCommandApproval).not.toHaveBeenCalled();
      expect(executeCommandSpy).toHaveBeenCalled();
    });

    it('should skip approval when context is missing', async () => {
      const command = 'echo test';
      
      const executeCommandSpy = jest.spyOn(service as any, 'executeCommand').mockResolvedValue({
        stdout: 'test',
        stderr: '',
        exitCode: 0,
      });

      const toolCall = {
        name: 'execute_command',
        arguments: {
          command,
        },
      };

      // No context provided
      await service.executeTool(toolCall, testProjectDir);

      // Verify no approval was requested (no conversationId/agentId)
      expect(approvalService.requestCommandApproval).not.toHaveBeenCalled();
      expect(executeCommandSpy).toHaveBeenCalled();
    });
  });

  describe('Logging and Visibility', () => {
    it('should log approval request details', async () => {
      const command = 'npm install package';
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      
      jest.spyOn(approvalService, 'requestDependencyApproval').mockResolvedValue({
        requestId: 'test-request-id',
        status: ApprovalStatus.APPROVED,
        timestamp: new Date(),
      });

      const toolCall = {
        name: 'execute_command',
        arguments: {
          command,
        },
      };

      await service.executeTool(toolCall, testProjectDir, {
        conversationId: 'test-conv-id',
        agentId: 'test-agent-id',
        requireApproval: true,
      });

      // Verify logging occurred
      expect(logSpy).toHaveBeenCalled();
    });
  });
});
