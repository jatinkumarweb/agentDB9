import { Test, TestingModule } from '@nestjs/testing';
import { MCPService } from '../mcp.service';
import { ApprovalService } from '../../common/services/approval.service';
import { ApprovalStatus } from '../../common/interfaces/approval.interface';

// Mock fetch globally
global.fetch = jest.fn();

describe('MCPService - Command Execution (TDD)', () => {
  let service: MCPService;
  let approvalService: ApprovalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MCPService,
        {
          provide: ApprovalService,
          useValue: {
            requestCommandApproval: jest.fn(),
            requestDependencyApproval: jest.fn(),
            shouldRequireApproval: jest.fn().mockReturnValue(false),
          },
        },
      ],
    }).compile();

    service = module.get<MCPService>(MCPService);
    approvalService = module.get<ApprovalService>(ApprovalService);

    // Reset mocks
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Long-Running Command Detection', () => {
    it('should detect npm run dev as a dev server command', async () => {
      // Arrange
      const command = 'npm run dev';
      const workingDir = '/workspace/projects/test-app';

      // Mock package.json read
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              content: JSON.stringify({
                scripts: {
                  dev: 'vite',
                },
              }),
            },
          }),
        })
        // Mock terminal_create
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: 'terminal-123',
          }),
        })
        // Mock terminal_send_text
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
          }),
        });

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.result.output).toContain('Dev server started in terminal');
      expect(result.result.output).toContain('Terminal ID: terminal-123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tools/execute'),
        expect.objectContaining({
          body: expect.stringContaining('terminal_create'),
        })
      );
    });

    it('should detect npm start as a dev server command', async () => {
      // Arrange
      const command = 'npm start';
      const workingDir = '/workspace/projects/react-app';

      // Mock package.json read
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              content: JSON.stringify({
                scripts: {
                  start: 'react-scripts start',
                },
              }),
            },
          }),
        })
        // Mock terminal_create
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: 'terminal-456',
          }),
        })
        // Mock terminal_send_text
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
          }),
        });

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.result.output).toContain('Dev server started in terminal');
    });

    it('should detect npm run serve as a dev server command', async () => {
      // Arrange
      const command = 'npm run serve';
      const workingDir = '/workspace/projects/angular-app';

      // Mock package.json read
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              content: JSON.stringify({
                scripts: {
                  serve: 'ng serve',
                },
              }),
            },
          }),
        })
        // Mock terminal_create
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: 'terminal-789',
          }),
        })
        // Mock terminal_send_text
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
          }),
        });

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.result.output).toContain('Dev server started in terminal');
    });

    it('should NOT treat npm run build as a dev server command', async () => {
      // Arrange
      const command = 'npm run build';
      const workingDir = '/workspace/projects/test-app';

      // Mock package.json read
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              content: JSON.stringify({
                scripts: {
                  build: 'vite build',
                },
              }),
            },
          }),
        })
        // Mock terminal_execute (not terminal_create)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              output: 'Build completed',
              error: '',
              exitCode: 0,
            },
          }),
        });

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(true);
      // Should use terminal_execute, not terminal_create
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tools/execute'),
        expect.objectContaining({
          body: expect.stringContaining('terminal_execute'),
        })
      );
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining('terminal_create'),
        })
      );
    });

    it('should NOT treat npm test as a dev server command', async () => {
      // Arrange
      const command = 'npm test';
      const workingDir = '/workspace/projects/test-app';

      // Mock package.json read
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              content: JSON.stringify({
                scripts: {
                  test: 'jest',
                },
              }),
            },
          }),
        })
        // Mock terminal_execute
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              output: 'Tests passed',
              error: '',
              exitCode: 0,
            },
          }),
        });

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tools/execute'),
        expect.objectContaining({
          body: expect.stringContaining('terminal_execute'),
        })
      );
    });
  });

  describe('Background Process Execution', () => {
    it('should create persistent terminal for dev server', async () => {
      // Arrange
      const command = 'npm run dev';
      const workingDir = '/workspace/projects/vite-app';

      // Mock responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              content: JSON.stringify({
                scripts: { dev: 'vite --host 0.0.0.0 --port 5173' },
              }),
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: 'terminal-dev-123',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.result.output).toContain('persistent terminal session');
      expect(result.result.output).toContain('terminal-dev-123');

      // Verify terminal_create was called
      const createTerminalCall = (global.fetch as jest.Mock).mock.calls.find(
        call => call[1]?.body?.includes('terminal_create')
      );
      expect(createTerminalCall).toBeDefined();

      const createBody = JSON.parse(createTerminalCall[1].body);
      expect(createBody.tool).toBe('terminal_create');
      expect(createBody.parameters.name).toContain('Agent Dev Server');
      expect(createBody.parameters.cwd).toBe(workingDir);
    });

    it('should send command to terminal after creation', async () => {
      // Arrange
      const command = 'npm run dev';
      const workingDir = '/workspace/projects/test-app';

      // Mock responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              content: JSON.stringify({
                scripts: { dev: 'vite' },
              }),
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: 'terminal-xyz',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      // Act
      await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert - verify terminal_send_text was called
      const sendTextCall = (global.fetch as jest.Mock).mock.calls.find(
        call => call[1]?.body?.includes('terminal_send_text')
      );
      expect(sendTextCall).toBeDefined();

      const sendBody = JSON.parse(sendTextCall[1].body);
      expect(sendBody.tool).toBe('terminal_send_text');
      expect(sendBody.parameters.terminalId).toBe('terminal-xyz');
      expect(sendBody.parameters.text).toBe('vite');
      expect(sendBody.parameters.addNewLine).toBe(true);
    });

    it('should fallback to nohup if terminal creation fails', async () => {
      // Arrange
      const command = 'npm run dev';
      const workingDir = '/workspace/projects/test-app';

      // Mock responses - terminal_create fails
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              content: JSON.stringify({
                scripts: { dev: 'vite' },
              }),
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        // Mock terminal_execute with nohup command
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              output: 'Dev server started in background. PID: 12345',
              error: '',
              exitCode: 0,
            },
          }),
        });

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(true);
      
      // Verify nohup command was used
      const executeCall = (global.fetch as jest.Mock).mock.calls.find(
        call => call[1]?.body?.includes('terminal_execute')
      );
      expect(executeCall).toBeDefined();

      const executeBody = JSON.parse(executeCall[1].body);
      expect(executeBody.parameters.command).toContain('nohup');
      expect(executeBody.parameters.command).toContain('vite');
      expect(executeBody.parameters.command).toContain('.dev-server.log');
    });
  });

  describe('Command Timeout Handling', () => {
    it('should NOT timeout for dev server commands (they run in terminal)', async () => {
      // Arrange
      const command = 'npm run dev';
      const workingDir = '/workspace/projects/test-app';

      // Mock responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              content: JSON.stringify({
                scripts: { dev: 'vite' },
              }),
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: 'terminal-123',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      // Act
      const startTime = Date.now();
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );
      const duration = Date.now() - startTime;

      // Assert
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete quickly
      expect(result.result.output).toContain('persistent terminal session');
    });

    it('should timeout regular commands after 300 seconds', async () => {
      // Arrange
      const command = 'sleep 400'; // Command that takes longer than timeout
      const workingDir = '/workspace/projects/test-app';

      // Mock a hanging command
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                success: true,
                result: {
                  output: 'Done sleeping',
                  error: '',
                  exitCode: 0,
                },
              }),
            });
          }, 350000); // 350 seconds - longer than timeout
        })
      );

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
      expect(result.error).toContain('300s');
    }, 310000); // Test timeout slightly longer than command timeout

    it('should complete fast commands without timeout', async () => {
      // Arrange
      const command = 'echo "Hello World"';
      const workingDir = '/workspace/projects/test-app';

      // Mock quick response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: {
            output: 'Hello World',
            error: '',
            exitCode: 0,
          },
        }),
      });

      // Act
      const startTime = Date.now();
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );
      const duration = Date.now() - startTime;

      // Assert
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should be very fast
      expect(result.result.stdout).toBe('Hello World');
    });
  });

  describe('Dev Server Lifecycle Management', () => {
    it('should return terminal ID for later management', async () => {
      // Arrange
      const command = 'npm run dev';
      const workingDir = '/workspace/projects/test-app';

      // Mock responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              content: JSON.stringify({
                scripts: { dev: 'vite' },
              }),
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: 'terminal-dev-456',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.result.output).toContain('Terminal ID: terminal-dev-456');
      // This terminal ID can be used later to stop/manage the server
    });

    it('should include command in output for user reference', async () => {
      // Arrange
      const command = 'npm run dev';
      const workingDir = '/workspace/projects/test-app';

      // Mock responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              content: JSON.stringify({
                scripts: { dev: 'vite --port 5173' },
              }),
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: 'terminal-123',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.result.output).toContain('Command: vite --port 5173');
    });

    it('should create terminal with descriptive name', async () => {
      // Arrange
      const command = 'npm run dev';
      const workingDir = '/workspace/projects/my-app';

      // Mock responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              content: JSON.stringify({
                scripts: { dev: 'vite' },
              }),
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: 'terminal-123',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      // Act
      await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      const createTerminalCall = (global.fetch as jest.Mock).mock.calls.find(
        call => call[1]?.body?.includes('terminal_create')
      );
      const createBody = JSON.parse(createTerminalCall[1].body);
      expect(createBody.parameters.name).toBe('Agent Dev Server - dev');
    });
  });

  describe('Regression Tests', () => {
    it('should NOT timeout on npm run dev (regression from log)', async () => {
      // This is the exact scenario from the log that was failing
      const command = 'npm run dev';
      const workingDir = '/workspace/projects/tic-tac-toe';

      // Mock responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              content: JSON.stringify({
                name: 'tic-tac-toe',
                scripts: {
                  dev: 'vite',
                  build: 'vite build',
                },
              }),
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: 'terminal-tic-tac-toe',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.result.output).toContain('Dev server started in terminal');
      expect(result.result.output).not.toContain('timeout');
    });

    it('should handle package.json read failure gracefully', async () => {
      // Arrange
      const command = 'npm run dev';
      const workingDir = '/workspace/projects/test-app';

      // Mock package.json read failure
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        })
        // Should still execute the command
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              output: 'Command executed',
              error: '',
              exitCode: 0,
            },
          }),
        });

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(true);
      // Should fall back to executing original command
    });

    it('should handle invalid package.json gracefully', async () => {
      // Arrange
      const command = 'npm run dev';
      const workingDir = '/workspace/projects/test-app';

      // Mock invalid JSON
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              content: 'invalid json {{{',
            },
          }),
        })
        // Should still execute the command
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: {
              output: 'Command executed',
              error: '',
              exitCode: 0,
            },
          }),
        });

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('Other Affected Flows', () => {
    it('should still work for non-npm commands', async () => {
      // Arrange
      const command = 'ls -la';
      const workingDir = '/workspace/projects/test-app';

      // Mock response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: {
            output: 'file1.txt\nfile2.txt',
            error: '',
            exitCode: 0,
          },
        }),
      });

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.result.stdout).toContain('file1.txt');
    });

    it('should still work for git commands', async () => {
      // Arrange
      const command = 'git status';
      const workingDir = '/workspace/projects/test-app';

      // Mock response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: {
            output: 'On branch main',
            error: '',
            exitCode: 0,
          },
        }),
      });

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.result.stdout).toContain('On branch main');
    });

    it('should still work for npm install commands', async () => {
      // Arrange
      const command = 'npm install react';
      const workingDir = '/workspace/projects/test-app';

      // Mock approval
      (approvalService.shouldRequireApproval as jest.Mock).mockReturnValue(false);

      // Mock response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: {
            output: 'added 1 package',
            error: '',
            exitCode: 0,
          },
        }),
      });

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.result.stdout).toContain('added 1 package');
    });

    it('should still work for cd && command patterns', async () => {
      // Arrange
      const command = 'cd src && ls';
      const workingDir = '/workspace/projects/test-app';

      // Mock response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: {
            output: 'main.ts\napp.ts',
            error: '',
            exitCode: 0,
          },
        }),
      });

      // Act
      const result = await service.executeTool(
        {
          name: 'execute_command',
          arguments: { command },
        },
        workingDir,
        { requireApproval: false }
      );

      // Assert
      expect(result.success).toBe(true);
      // Should parse cd and adjust working directory
      const executeCall = (global.fetch as jest.Mock).mock.calls[0];
      const executeBody = JSON.parse(executeCall[1].body);
      expect(executeBody.parameters.cwd).toContain('src');
    });
  });
});
