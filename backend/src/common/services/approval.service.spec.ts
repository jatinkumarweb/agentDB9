import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApprovalService } from './approval.service';
import {
  ApprovalStatus,
  ApprovalType,
  RiskLevel,
  CommandApprovalRequest,
  DependencyApprovalRequest,
} from '../interfaces/approval.interface';

describe('ApprovalService', () => {
  let service: ApprovalService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApprovalService>(ApprovalService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Risk Assessment', () => {
    it('should assess critical risk for dangerous commands', () => {
      const criticalCommands = [
        'rm -rf /',
        'sudo rm -rf /home',
        'format c:',
        'dd if=/dev/zero of=/dev/sda',
      ];

      criticalCommands.forEach((command) => {
        const risk = (service as any).assessCommandRisk(command);
        expect(risk).toBe(RiskLevel.CRITICAL);
      });
    });

    it('should assess high risk for potentially dangerous commands', () => {
      const highRiskCommands = [
        'npm install -g typescript',
        'npx create-react-app myapp',
        'git push --force',
        'docker run -d nginx',
        'chmod 777 /var/www',
        'rm -rf node_modules',
      ];

      highRiskCommands.forEach((command) => {
        const risk = (service as any).assessCommandRisk(command);
        expect(risk).toBe(RiskLevel.HIGH);
      });
    });

    it('should assess medium risk for common operations', () => {
      const mediumRiskCommands = [
        'npm install express',
        'yarn add react',
        'pnpm add vue',
        'git push origin main',
        'git reset --hard HEAD',
        'npm run build',
      ];

      mediumRiskCommands.forEach((command) => {
        const risk = (service as any).assessCommandRisk(command);
        expect(risk).toBe(RiskLevel.MEDIUM);
      });
    });

    it('should assess low risk for safe commands', () => {
      const lowRiskCommands = [
        'ls -la',
        'cat package.json',
        'git status',
        'npm list',
        'echo "hello"',
      ];

      lowRiskCommands.forEach((command) => {
        const risk = (service as any).assessCommandRisk(command);
        expect(risk).toBe(RiskLevel.LOW);
      });
    });
  });

  describe('Command Approval', () => {
    it('should request command approval and emit event', async () => {
      const command = 'npm install express';
      const workingDir = '/workspace/project';
      const conversationId = 'conv_123';
      const agentId = 'agent_456';
      const reason = 'Install dependencies';

      // Simulate approval response after 100ms
      setTimeout(() => {
        const pendingApprovals = (service as any).pendingApprovals;
        const requestId = Array.from(pendingApprovals.keys())[0];
        service.handleApprovalResponse({
          requestId,
          status: ApprovalStatus.APPROVED,
          timestamp: new Date(),
        });
      }, 100);

      const response = await service.requestCommandApproval(
        command,
        workingDir,
        conversationId,
        agentId,
        reason,
      );

      expect(response.status).toBe(ApprovalStatus.APPROVED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'approval.request',
        expect.objectContaining({
          type: ApprovalType.COMMAND_EXECUTION,
          command,
          workingDir,
          conversationId,
          agentId,
          risk: RiskLevel.MEDIUM,
        }),
      );
    });

    it('should handle approval rejection', async () => {
      const command = 'rm -rf /';
      const workingDir = '/workspace';
      const conversationId = 'conv_123';
      const agentId = 'agent_456';
      const reason = 'Delete files';

      setTimeout(() => {
        const pendingApprovals = (service as any).pendingApprovals;
        const requestId = Array.from(pendingApprovals.keys())[0];
        service.handleApprovalResponse({
          requestId,
          status: ApprovalStatus.REJECTED,
          timestamp: new Date(),
        });
      }, 100);

      const response = await service.requestCommandApproval(
        command,
        workingDir,
        conversationId,
        agentId,
        reason,
      );

      expect(response.status).toBe(ApprovalStatus.REJECTED);
    });

    it('should handle approval timeout', async () => {
      const command = 'npm install';
      const workingDir = '/workspace';
      const conversationId = 'conv_123';
      const agentId = 'agent_456';
      const reason = 'Install dependencies';

      // Don't respond - let it timeout
      const response = await service.requestCommandApproval(
        command,
        workingDir,
        conversationId,
        agentId,
        reason,
      );

      expect(response.status).toBe(ApprovalStatus.TIMEOUT);
    }, 65000); // Longer timeout for this test

    it('should allow command modification', async () => {
      const command = 'npm install react';
      const modifiedCommand = 'npm install react@18.2.0';
      const workingDir = '/workspace';
      const conversationId = 'conv_123';
      const agentId = 'agent_456';
      const reason = 'Install dependencies';

      setTimeout(() => {
        const pendingApprovals = (service as any).pendingApprovals;
        const requestId = Array.from(pendingApprovals.keys())[0];
        service.handleApprovalResponse({
          requestId,
          status: ApprovalStatus.APPROVED,
          modifiedCommand,
          timestamp: new Date(),
        });
      }, 100);

      const response = await service.requestCommandApproval(
        command,
        workingDir,
        conversationId,
        agentId,
        reason,
      );

      expect(response.status).toBe(ApprovalStatus.APPROVED);
      expect(response.modifiedCommand).toBe(modifiedCommand);
    });
  });

  describe('Dependency Approval', () => {
    it('should request dependency approval', async () => {
      const packages = ['react', 'vue', 'angular'];
      const packageManager = 'npm';
      const workingDir = '/workspace';
      const conversationId = 'conv_123';
      const agentId = 'agent_456';

      setTimeout(() => {
        const pendingApprovals = (service as any).pendingApprovals;
        const requestId = Array.from(pendingApprovals.keys())[0];
        service.handleApprovalResponse({
          requestId,
          status: ApprovalStatus.APPROVED,
          timestamp: new Date(),
        });
      }, 100);

      const response = await service.requestDependencyApproval(
        packages,
        packageManager,
        workingDir,
        conversationId,
        agentId,
        false,
      );

      expect(response.status).toBe(ApprovalStatus.APPROVED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'approval.request',
        expect.objectContaining({
          type: ApprovalType.DEPENDENCY_INSTALLATION,
          packages: expect.arrayContaining([
            expect.objectContaining({ name: 'react', devDependency: false }),
            expect.objectContaining({ name: 'vue', devDependency: false }),
            expect.objectContaining({ name: 'angular', devDependency: false }),
          ]),
          packageManager,
        }),
      );
    });

    it('should allow selective package installation', async () => {
      const packages = ['react', 'vue', 'angular'];
      const selectedPackages = ['react', 'vue'];
      const packageManager = 'npm';
      const workingDir = '/workspace';
      const conversationId = 'conv_123';
      const agentId = 'agent_456';

      setTimeout(() => {
        const pendingApprovals = (service as any).pendingApprovals;
        const requestId = Array.from(pendingApprovals.keys())[0];
        service.handleApprovalResponse({
          requestId,
          status: ApprovalStatus.APPROVED,
          selectedPackages,
          timestamp: new Date(),
        });
      }, 100);

      const response = await service.requestDependencyApproval(
        packages,
        packageManager,
        workingDir,
        conversationId,
        agentId,
        false,
      );

      expect(response.status).toBe(ApprovalStatus.APPROVED);
      expect(response.selectedPackages).toEqual(selectedPackages);
    });

    it('should handle dev dependencies', async () => {
      const packages = ['typescript', 'jest'];
      const packageManager = 'npm';
      const workingDir = '/workspace';
      const conversationId = 'conv_123';
      const agentId = 'agent_456';

      setTimeout(() => {
        const pendingApprovals = (service as any).pendingApprovals;
        const requestId = Array.from(pendingApprovals.keys())[0];
        service.handleApprovalResponse({
          requestId,
          status: ApprovalStatus.APPROVED,
          timestamp: new Date(),
        });
      }, 100);

      const response = await service.requestDependencyApproval(
        packages,
        packageManager,
        workingDir,
        conversationId,
        agentId,
        true, // dev dependencies
      );

      expect(response.status).toBe(ApprovalStatus.APPROVED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'approval.request',
        expect.objectContaining({
          packages: expect.arrayContaining([
            expect.objectContaining({ devDependency: true }),
          ]),
        }),
      );
    });
  });

  describe('File Operation Approval', () => {
    it('should request approval for file deletion', async () => {
      const operation = 'delete';
      const path = '/workspace/important-file.txt';
      const conversationId = 'conv_123';
      const agentId = 'agent_456';

      setTimeout(() => {
        const pendingApprovals = (service as any).pendingApprovals;
        const requestId = Array.from(pendingApprovals.keys())[0];
        service.handleApprovalResponse({
          requestId,
          status: ApprovalStatus.APPROVED,
          timestamp: new Date(),
        });
      }, 100);

      const response = await service.requestFileOperationApproval(
        operation,
        path,
        conversationId,
        agentId,
      );

      expect(response.status).toBe(ApprovalStatus.APPROVED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'approval.request',
        expect.objectContaining({
          type: ApprovalType.FILE_OPERATION,
          operation,
          path,
          risk: RiskLevel.HIGH, // Deletion is high risk
        }),
      );
    });

    it('should assess lower risk for file creation', async () => {
      const operation = 'create';
      const path = '/workspace/new-file.txt';
      const conversationId = 'conv_123';
      const agentId = 'agent_456';

      setTimeout(() => {
        const pendingApprovals = (service as any).pendingApprovals;
        const requestId = Array.from(pendingApprovals.keys())[0];
        service.handleApprovalResponse({
          requestId,
          status: ApprovalStatus.APPROVED,
          timestamp: new Date(),
        });
      }, 100);

      const response = await service.requestFileOperationApproval(
        operation,
        path,
        conversationId,
        agentId,
      );

      expect(response.status).toBe(ApprovalStatus.APPROVED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'approval.request',
        expect.objectContaining({
          risk: RiskLevel.LOW,
        }),
      );
    });
  });

  describe('Git Operation Approval', () => {
    it('should request approval for git push', async () => {
      const operation = 'push';
      const conversationId = 'conv_123';
      const agentId = 'agent_456';
      const branch = 'main';

      setTimeout(() => {
        const pendingApprovals = (service as any).pendingApprovals;
        const requestId = Array.from(pendingApprovals.keys())[0];
        service.handleApprovalResponse({
          requestId,
          status: ApprovalStatus.APPROVED,
          timestamp: new Date(),
        });
      }, 100);

      const response = await service.requestGitOperationApproval(
        operation,
        conversationId,
        agentId,
        undefined,
        undefined,
        branch,
      );

      expect(response.status).toBe(ApprovalStatus.APPROVED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'approval.request',
        expect.objectContaining({
          type: ApprovalType.GIT_OPERATION,
          operation,
          branch,
          risk: RiskLevel.HIGH,
        }),
      );
    });

    it('should assess medium risk for git commit', async () => {
      const operation = 'commit';
      const conversationId = 'conv_123';
      const agentId = 'agent_456';
      const message = 'feat: add new feature';
      const files = ['src/app.ts', 'src/utils.ts'];

      setTimeout(() => {
        const pendingApprovals = (service as any).pendingApprovals;
        const requestId = Array.from(pendingApprovals.keys())[0];
        service.handleApprovalResponse({
          requestId,
          status: ApprovalStatus.APPROVED,
          timestamp: new Date(),
        });
      }, 100);

      const response = await service.requestGitOperationApproval(
        operation,
        conversationId,
        agentId,
        message,
        files,
      );

      expect(response.status).toBe(ApprovalStatus.APPROVED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'approval.request',
        expect.objectContaining({
          risk: RiskLevel.MEDIUM,
          message,
          files,
        }),
      );
    });
  });

  describe('Utility Methods', () => {
    it('should correctly identify commands requiring approval', () => {
      const requiresApproval = [
        'npm install express',
        'git push origin main',
        'rm -rf node_modules',
      ];

      const noApproval = ['ls -la', 'cat package.json', 'git status'];

      requiresApproval.forEach((command) => {
        expect(service.shouldRequireApproval(command)).toBe(true);
      });

      noApproval.forEach((command) => {
        expect(service.shouldRequireApproval(command)).toBe(false);
      });
    });

    it('should estimate command duration', () => {
      const estimates = [
        { command: 'npm install', expected: '1-3 minutes' },
        { command: 'npx create-react-app myapp', expected: '2-5 minutes' },
        { command: 'npm run build', expected: '30 seconds - 2 minutes' },
        { command: 'npm test', expected: '10-60 seconds' },
        { command: 'ls -la', expected: '< 10 seconds' },
      ];

      estimates.forEach(({ command, expected }) => {
        const duration = (service as any).estimateCommandDuration(command);
        expect(duration).toBe(expected);
      });
    });

    it('should get pending approvals for a conversation', async () => {
      const conversationId = 'conv_123';
      const agentId = 'agent_456';

      // Create multiple pending approvals
      const promises = [
        service.requestCommandApproval(
          'npm install',
          '/workspace',
          conversationId,
          agentId,
          'Install deps',
        ),
        service.requestCommandApproval(
          'git push',
          '/workspace',
          conversationId,
          agentId,
          'Push code',
        ),
      ];

      // Check pending approvals before responding
      setTimeout(() => {
        const pending = service.getPendingApprovals(conversationId);
        expect(pending).toHaveLength(2);
        expect(pending[0].conversationId).toBe(conversationId);
        expect(pending[1].conversationId).toBe(conversationId);

        // Approve all
        const pendingApprovals = (service as any).pendingApprovals;
        pendingApprovals.forEach((value: any, requestId: string) => {
          service.handleApprovalResponse({
            requestId,
            status: ApprovalStatus.APPROVED,
            timestamp: new Date(),
          });
        });
      }, 100);

      await Promise.all(promises);
    });

    it('should cancel pending approval', async () => {
      const command = 'npm install';
      const workingDir = '/workspace';
      const conversationId = 'conv_123';
      const agentId = 'agent_456';
      const reason = 'Install deps';

      const promise = service.requestCommandApproval(
        command,
        workingDir,
        conversationId,
        agentId,
        reason,
      );

      // Cancel after 100ms
      setTimeout(() => {
        const pendingApprovals = (service as any).pendingApprovals;
        const requestId = Array.from(pendingApprovals.keys())[0];
        service.cancelApproval(requestId);
      }, 100);

      await expect(promise).rejects.toThrow('Approval cancelled');
    });
  });
});
