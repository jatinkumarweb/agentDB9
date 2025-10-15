import { Test, TestingModule } from '@nestjs/testing';
import { MCPService } from '../mcp.service';
import { Logger } from '@nestjs/common';

describe('MCPService - Working Directory', () => {
  let service: MCPService;
  const mockWorkspaceRoot = '/workspace';
  const mockProjectPath = '/workspace/projects/testproject';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MCPService,
        {
          provide: 'WORKSPACE_ROOT',
          useValue: mockWorkspaceRoot,
        },
      ],
    }).compile();

    service = module.get<MCPService>(MCPService);
    
    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeTool with working directory', () => {
    it('should use provided working directory when specified', async () => {
      const toolCall = {
        name: 'read_file',
        arguments: { path: 'package.json' },
      };

      // Mock the file system to avoid actual file operations
      const readFileSpy = jest.spyOn(service as any, 'readFile').mockResolvedValue({
        success: true,
        content: '{"name": "test"}',
      });

      await service.executeTool(toolCall, mockProjectPath);

      expect(readFileSpy).toHaveBeenCalledWith('package.json', mockProjectPath);
    });

    it('should use default workspace root when working directory not provided', async () => {
      const toolCall = {
        name: 'read_file',
        arguments: { path: 'package.json' },
      };

      const readFileSpy = jest.spyOn(service as any, 'readFile').mockResolvedValue({
        success: true,
        content: '{"name": "test"}',
      });

      await service.executeTool(toolCall);

      expect(readFileSpy).toHaveBeenCalledWith('package.json', mockWorkspaceRoot);
    });

    it('should pass working directory to execute_command', async () => {
      const toolCall = {
        name: 'execute_command',
        arguments: { command: 'npm install' },
      };

      const executeCommandSpy = jest.spyOn(service as any, 'executeCommand').mockResolvedValue({
        success: true,
        stdout: 'installed',
        stderr: '',
      });

      await service.executeTool(toolCall, mockProjectPath);

      expect(executeCommandSpy).toHaveBeenCalledWith('npm install', mockProjectPath);
    });

    it('should pass working directory to write_file', async () => {
      const toolCall = {
        name: 'write_file',
        arguments: { 
          path: 'src/index.ts',
          content: 'console.log("hello");'
        },
      };

      const writeFileSpy = jest.spyOn(service as any, 'writeFile').mockResolvedValue({
        success: true,
      });

      await service.executeTool(toolCall, mockProjectPath);

      expect(writeFileSpy).toHaveBeenCalledWith(
        'src/index.ts',
        'console.log("hello");',
        mockProjectPath
      );
    });

    it('should pass working directory to list_directory', async () => {
      const toolCall = {
        name: 'list_directory',
        arguments: { path: '.' },
      };

      const listDirectorySpy = jest.spyOn(service as any, 'listDirectory').mockResolvedValue({
        success: true,
        files: ['package.json', 'src'],
      });

      await service.executeTool(toolCall, mockProjectPath);

      expect(listDirectorySpy).toHaveBeenCalledWith('.', mockProjectPath);
    });
  });

  describe('Tool execution in different directories', () => {
    it('should execute npm commands in project directory', async () => {
      const toolCall = {
        name: 'execute_command',
        arguments: { command: 'npm run build' },
      };

      const executeCommandSpy = jest.spyOn(service as any, 'executeCommand').mockResolvedValue({
        success: true,
        stdout: 'build complete',
        stderr: '',
      });

      await service.executeTool(toolCall, mockProjectPath);

      // Verify command executes in project directory
      expect(executeCommandSpy).toHaveBeenCalledWith('npm run build', mockProjectPath);
    });

    it('should create files in project directory', async () => {
      const toolCall = {
        name: 'write_file',
        arguments: {
          path: 'README.md',
          content: '# Test Project',
        },
      };

      const writeFileSpy = jest.spyOn(service as any, 'writeFile').mockResolvedValue({
        success: true,
      });

      await service.executeTool(toolCall, mockProjectPath);

      // File should be created in project directory
      expect(writeFileSpy).toHaveBeenCalledWith('README.md', '# Test Project', mockProjectPath);
    });

    it('should read files from project directory', async () => {
      const toolCall = {
        name: 'read_file',
        arguments: { path: 'src/App.tsx' },
      };

      const readFileSpy = jest.spyOn(service as any, 'readFile').mockResolvedValue({
        success: true,
        content: 'export default App;',
      });

      await service.executeTool(toolCall, mockProjectPath);

      // File should be read from project directory
      expect(readFileSpy).toHaveBeenCalledWith('src/App.tsx', mockProjectPath);
    });
  });

  describe('Error handling with working directory', () => {
    it('should handle errors when working directory does not exist', async () => {
      const toolCall = {
        name: 'list_directory',
        arguments: { path: '.' },
      };

      const invalidPath = '/workspace/projects/nonexistent';
      
      jest.spyOn(service as any, 'listDirectory').mockRejectedValue(
        new Error('ENOENT: no such file or directory')
      );

      await expect(service.executeTool(toolCall, invalidPath)).rejects.toThrow();
    });

    it('should timeout long-running commands', async () => {
      const toolCall = {
        name: 'execute_command',
        arguments: { command: 'sleep 1000' },
      };

      jest.spyOn(service as any, 'executeCommand').mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 400000)) // 400 seconds
      );

      await expect(service.executeTool(toolCall, mockProjectPath)).rejects.toThrow(
        /timeout/i
      );
    }, 10000); // Increase test timeout
  });

  describe('Path resolution', () => {
    it('should handle relative paths correctly', async () => {
      const toolCall = {
        name: 'read_file',
        arguments: { path: './src/index.ts' },
      };

      const readFileSpy = jest.spyOn(service as any, 'readFile').mockResolvedValue({
        success: true,
        content: 'code',
      });

      await service.executeTool(toolCall, mockProjectPath);

      expect(readFileSpy).toHaveBeenCalledWith('./src/index.ts', mockProjectPath);
    });

    it('should handle absolute paths within project', async () => {
      const toolCall = {
        name: 'read_file',
        arguments: { path: `${mockProjectPath}/package.json` },
      };

      const readFileSpy = jest.spyOn(service as any, 'readFile').mockResolvedValue({
        success: true,
        content: '{}',
      });

      await service.executeTool(toolCall, mockProjectPath);

      expect(readFileSpy).toHaveBeenCalled();
    });
  });

  describe('Multiple tool executions', () => {
    it('should maintain working directory across multiple tool calls', async () => {
      const tools = [
        { name: 'write_file', arguments: { path: 'file1.txt', content: 'test1' } },
        { name: 'write_file', arguments: { path: 'file2.txt', content: 'test2' } },
        { name: 'list_directory', arguments: { path: '.' } },
      ];

      const writeFileSpy = jest.spyOn(service as any, 'writeFile').mockResolvedValue({ success: true });
      const listDirectorySpy = jest.spyOn(service as any, 'listDirectory').mockResolvedValue({
        success: true,
        files: ['file1.txt', 'file2.txt'],
      });

      for (const tool of tools) {
        await service.executeTool(tool, mockProjectPath);
      }

      // All calls should use the same working directory
      expect(writeFileSpy).toHaveBeenCalledWith('file1.txt', 'test1', mockProjectPath);
      expect(writeFileSpy).toHaveBeenCalledWith('file2.txt', 'test2', mockProjectPath);
      expect(listDirectorySpy).toHaveBeenCalledWith('.', mockProjectPath);
    });
  });
});
