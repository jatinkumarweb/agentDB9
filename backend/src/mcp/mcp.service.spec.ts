import { Test, TestingModule } from '@nestjs/testing';
import { MCPService } from './mcp.service';
import { ApprovalService } from '../common/services/approval.service';
import { ApprovalStatus, RiskLevel } from '../common/interfaces/approval.interface';

describe('MCPService - Approval Integration', () => {
  let service: MCPService;
  let approvalService: ApprovalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MCPService,
        {
          provide: ApprovalService,
          useValue: {
            shouldRequireApproval: jest.fn(),
            requestCommandApproval: jest.fn(),
            requestDependencyApproval: jest.fn(),
            requestFileOperationApproval: jest.fn(),
            requestGitOperationApproval: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MCPService>(MCPService);
    approvalService = module.get<ApprovalService>(ApprovalService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Execution with Approval', () => {
    it('should execute low-risk command without approval', async () => {
      const toolCall = {
        name: 'execute_command',
        arguments: { command: 'ls -la' },
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: true,
      };

      jest.spyOn(approvalService, 'shouldRequireApproval').mockReturnValue(false);

      const result = await service.executeTool(toolCall, '/workspace', context);

      expect(approvalService.shouldRequireApproval).toHaveBeenCalledWith('ls -la');
      expect(approvalService.requestCommandApproval).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should request approval for high-risk command', async () => {
      const toolCall = {
        name: 'execute_command',
        arguments: { command: 'rm -rf /tmp/test' },
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: true,
      };

      jest.spyOn(approvalService, 'shouldRequireApproval').mockReturnValue(true);
      jest.spyOn(approvalService, 'requestCommandApproval').mockResolvedValue({
        requestId: 'req_123',
        status: ApprovalStatus.APPROVED,
        timestamp: new Date(),
      });

      const result = await service.executeTool(toolCall, '/workspace', context);

      expect(approvalService.requestCommandApproval).toHaveBeenCalledWith(
        'rm -rf /tmp/test',
        '/workspace',
        'conv_123',
        'agent_456',
        'Execute command: rm -rf /tmp/test',
      );
      expect(result.success).toBe(true);
    });

    it('should reject execution when user rejects approval', async () => {
      const toolCall = {
        name: 'execute_command',
        arguments: { command: 'rm -rf /' },
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: true,
      };

      jest.spyOn(approvalService, 'shouldRequireApproval').mockReturnValue(true);
      jest.spyOn(approvalService, 'requestCommandApproval').mockResolvedValue({
        requestId: 'req_123',
        status: ApprovalStatus.REJECTED,
        timestamp: new Date(),
      });

      const result = await service.executeTool(toolCall, '/workspace', context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User rejected the operation');
      expect(result.approvalRejected).toBe(true);
    });

    it('should handle approval timeout', async () => {
      const toolCall = {
        name: 'execute_command',
        arguments: { command: 'npm install' },
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: true,
      };

      jest.spyOn(approvalService, 'shouldRequireApproval').mockReturnValue(true);
      jest.spyOn(approvalService, 'requestCommandApproval').mockResolvedValue({
        requestId: 'req_123',
        status: ApprovalStatus.TIMEOUT,
        timestamp: new Date(),
      });

      const result = await service.executeTool(toolCall, '/workspace', context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Approval timeout - operation cancelled');
    });

    it('should use modified command when provided', async () => {
      const originalCommand = 'git push origin main';
      const modifiedCommand = 'git push origin feature-branch';
      const toolCall = {
        name: 'execute_command',
        arguments: { command: originalCommand },
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: true,
      };

      jest.spyOn(approvalService, 'shouldRequireApproval').mockReturnValue(true);
      jest.spyOn(approvalService, 'requestCommandApproval').mockResolvedValue({
        requestId: 'req_123',
        status: ApprovalStatus.APPROVED,
        modifiedCommand,
        timestamp: new Date(),
      });

      await service.executeTool(toolCall, '/workspace', context);

      // Verify the modified command was used
      expect(toolCall.arguments.command).toBe(modifiedCommand);
    });

    it('should skip approval when requireApproval is false', async () => {
      const toolCall = {
        name: 'execute_command',
        arguments: { command: 'npm install express' },
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: false,
      };

      const result = await service.executeTool(toolCall, '/workspace', context);

      expect(approvalService.shouldRequireApproval).not.toHaveBeenCalled();
      expect(approvalService.requestCommandApproval).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('Dependency Installation with Approval', () => {
    it('should detect and request approval for npm install', async () => {
      const toolCall = {
        name: 'execute_command',
        arguments: { command: 'npm install react vue angular' },
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: true,
      };

      jest.spyOn(approvalService, 'requestDependencyApproval').mockResolvedValue({
        requestId: 'req_123',
        status: ApprovalStatus.APPROVED,
        timestamp: new Date(),
      });

      await service.executeTool(toolCall, '/workspace', context);

      expect(approvalService.requestDependencyApproval).toHaveBeenCalledWith(
        ['react', 'vue', 'angular'],
        'npm',
        '/workspace',
        'conv_123',
        'agent_456',
        false,
      );
    });

    it('should detect dev dependencies', async () => {
      const toolCall = {
        name: 'execute_command',
        arguments: { command: 'npm install typescript jest --save-dev' },
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: true,
      };

      jest.spyOn(approvalService, 'requestDependencyApproval').mockResolvedValue({
        requestId: 'req_123',
        status: ApprovalStatus.APPROVED,
        timestamp: new Date(),
      });

      await service.executeTool(toolCall, '/workspace', context);

      expect(approvalService.requestDependencyApproval).toHaveBeenCalledWith(
        ['typescript', 'jest'],
        'npm',
        '/workspace',
        'conv_123',
        'agent_456',
        true, // dev dependencies
      );
    });

    it('should handle selective package installation', async () => {
      const toolCall = {
        name: 'execute_command',
        arguments: { command: 'npm install react vue angular' },
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: true,
      };

      jest.spyOn(approvalService, 'requestDependencyApproval').mockResolvedValue({
        requestId: 'req_123',
        status: ApprovalStatus.APPROVED,
        selectedPackages: ['react', 'vue'], // User deselected angular
        timestamp: new Date(),
      });

      await service.executeTool(toolCall, '/workspace', context);

      // Verify command was modified to only install selected packages
      expect(toolCall.arguments.command).toBe('npm install react vue');
    });

    it('should detect yarn add commands', async () => {
      const toolCall = {
        name: 'execute_command',
        arguments: { command: 'yarn add express' },
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: true,
      };

      jest.spyOn(approvalService, 'requestDependencyApproval').mockResolvedValue({
        requestId: 'req_123',
        status: ApprovalStatus.APPROVED,
        timestamp: new Date(),
      });

      await service.executeTool(toolCall, '/workspace', context);

      expect(approvalService.requestDependencyApproval).toHaveBeenCalledWith(
        ['express'],
        'yarn',
        '/workspace',
        'conv_123',
        'agent_456',
        false,
      );
    });

    it('should detect pnpm add commands', async () => {
      const toolCall = {
        name: 'execute_command',
        arguments: { command: 'pnpm add lodash' },
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: true,
      };

      jest.spyOn(approvalService, 'requestDependencyApproval').mockResolvedValue({
        requestId: 'req_123',
        status: ApprovalStatus.APPROVED,
        timestamp: new Date(),
      });

      await service.executeTool(toolCall, '/workspace', context);

      expect(approvalService.requestDependencyApproval).toHaveBeenCalledWith(
        ['lodash'],
        'pnpm',
        '/workspace',
        'conv_123',
        'agent_456',
        false,
      );
    });
  });

  describe('File Operation with Approval', () => {
    it('should request approval for file deletion', async () => {
      const toolCall = {
        name: 'delete_file',
        arguments: { path: '/workspace/important-file.txt' },
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: true,
      };

      jest.spyOn(approvalService, 'requestFileOperationApproval').mockResolvedValue({
        requestId: 'req_123',
        status: ApprovalStatus.APPROVED,
        timestamp: new Date(),
      });

      await service.executeTool(toolCall, '/workspace', context);

      expect(approvalService.requestFileOperationApproval).toHaveBeenCalledWith(
        'delete',
        '/workspace/important-file.txt',
        'conv_123',
        'agent_456',
      );
    });

    it('should reject file deletion when user rejects', async () => {
      const toolCall = {
        name: 'delete_file',
        arguments: { path: '/workspace/critical-file.txt' },
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: true,
      };

      jest.spyOn(approvalService, 'requestFileOperationApproval').mockResolvedValue({
        requestId: 'req_123',
        status: ApprovalStatus.REJECTED,
        timestamp: new Date(),
      });

      const result = await service.executeTool(toolCall, '/workspace', context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User rejected file deletion');
      expect(result.approvalRejected).toBe(true);
    });
  });

  describe('Git Operation with Approval', () => {
    it('should request approval for git commit', async () => {
      const toolCall = {
        name: 'git_commit',
        arguments: {
          message: 'feat: add new feature',
          files: ['src/app.ts', 'src/utils.ts'],
        },
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: true,
      };

      jest.spyOn(approvalService, 'requestGitOperationApproval').mockResolvedValue({
        requestId: 'req_123',
        status: ApprovalStatus.APPROVED,
        timestamp: new Date(),
      });

      await service.executeTool(toolCall, '/workspace', context);

      expect(approvalService.requestGitOperationApproval).toHaveBeenCalledWith(
        'commit',
        'conv_123',
        'agent_456',
        'feat: add new feature',
        ['src/app.ts', 'src/utils.ts'],
      );
    });

    it('should request approval for git push', async () => {
      const toolCall = {
        name: 'git_push',
        arguments: {},
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: true,
      };

      jest.spyOn(approvalService, 'requestGitOperationApproval').mockResolvedValue({
        requestId: 'req_123',
        status: ApprovalStatus.APPROVED,
        timestamp: new Date(),
      });

      await service.executeTool(toolCall, '/workspace', context);

      expect(approvalService.requestGitOperationApproval).toHaveBeenCalledWith(
        'push',
        'conv_123',
        'agent_456',
        undefined,
        undefined,
      );
    });

    it('should reject git push when user rejects', async () => {
      const toolCall = {
        name: 'git_push',
        arguments: {},
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: true,
      };

      jest.spyOn(approvalService, 'requestGitOperationApproval').mockResolvedValue({
        requestId: 'req_123',
        status: ApprovalStatus.REJECTED,
        timestamp: new Date(),
      });

      const result = await service.executeTool(toolCall, '/workspace', context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User rejected git push');
      expect(result.approvalRejected).toBe(true);
    });
  });

  describe('Utility Methods', () => {
    it('should correctly identify dependency install commands', () => {
      const installCommands = [
        'npm install express',
        'npm i react',
        'yarn add vue',
        'pnpm add lodash',
        'bun add typescript',
      ];

      const nonInstallCommands = [
        'npm list',
        'npm run build',
        'yarn start',
        'git status',
      ];

      installCommands.forEach((command) => {
        const isDependencyInstall = (service as any).isDependencyInstallCommand(command);
        expect(isDependencyInstall).toBe(true);
      });

      nonInstallCommands.forEach((command) => {
        const isDependencyInstall = (service as any).isDependencyInstallCommand(command);
        expect(isDependencyInstall).toBe(false);
      });
    });

    it('should extract packages from install commands', () => {
      const testCases = [
        { command: 'npm install react vue', expected: ['react', 'vue'] },
        { command: 'npm i express --save', expected: ['express'] },
        { command: 'yarn add lodash axios', expected: ['lodash', 'axios'] },
        { command: 'pnpm add typescript -D', expected: ['typescript'] },
        { command: 'npm install', expected: [] },
      ];

      testCases.forEach(({ command, expected }) => {
        const packages = (service as any).extractPackagesFromCommand(command);
        expect(packages).toEqual(expected);
      });
    });

    it('should detect package manager from command', () => {
      const testCases = [
        { command: 'npm install react', expected: 'npm' },
        { command: 'yarn add vue', expected: 'yarn' },
        { command: 'pnpm add lodash', expected: 'pnpm' },
        { command: 'bun add express', expected: 'bun' },
      ];

      testCases.forEach(({ command, expected }) => {
        const packageManager = (service as any).detectPackageManager(command);
        expect(packageManager).toBe(expected);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle approval service errors gracefully', async () => {
      const toolCall = {
        name: 'execute_command',
        arguments: { command: 'npm install' },
      };
      const context = {
        conversationId: 'conv_123',
        agentId: 'agent_456',
        requireApproval: true,
      };

      jest.spyOn(approvalService, 'shouldRequireApproval').mockReturnValue(true);
      jest.spyOn(approvalService, 'requestCommandApproval').mockRejectedValue(
        new Error('Approval service error'),
      );

      const result = await service.executeTool(toolCall, '/workspace', context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Approval workflow error');
    });
  });
});
