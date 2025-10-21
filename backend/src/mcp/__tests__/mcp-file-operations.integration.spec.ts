import { Test, TestingModule } from '@nestjs/testing';
import { MCPService } from '../mcp.service';
import { ApprovalService } from '../../common/services/approval.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '@nestjs/common';

/**
 * Integration tests to verify actual file operations in project directories
 * These tests verify that when agent says it created files, they actually exist
 */
describe('MCPService - File Operations Integration', () => {
  let service: MCPService;
  const testProjectDir = '/tmp/test-project-' + Date.now();
  const mockWorkspaceRoot = '/workspace';

  const mockApprovalService = {
    shouldRequireApproval: jest.fn().mockReturnValue(false),
    requestCommandApproval: jest.fn().mockResolvedValue({ approved: true }),
    requestDependencyApproval: jest.fn().mockResolvedValue({ approved: true }),
    requestFileOperationApproval: jest.fn().mockResolvedValue({ approved: true }),
    requestGitOperationApproval: jest.fn().mockResolvedValue({ approved: true }),
  };

  beforeAll(async () => {
    // Create test project directory
    await fs.mkdir(testProjectDir, { recursive: true });
    console.log(`Created test project directory: ${testProjectDir}`);
  });

  afterAll(async () => {
    // Clean up test project directory
    try {
      await fs.rm(testProjectDir, { recursive: true, force: true });
      console.log(`Cleaned up test project directory: ${testProjectDir}`);
    } catch (error) {
      console.error('Failed to clean up test directory:', error);
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MCPService,
        {
          provide: ApprovalService,
          useValue: mockApprovalService,
        },
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

  describe('write_file - Actual File Creation', () => {
    it('should actually create a file in the project directory', async () => {
      const fileName = 'test-file.txt';
      const fileContent = 'Hello from test!';
      
      const toolCall = {
        name: 'write_file',
        arguments: {
          path: fileName,
          content: fileContent,
        },
      };

      // Execute the tool
      const result = await service.executeTool(toolCall, testProjectDir, {
        requireApproval: false,
      });

      // Verify the result says success
      expect(result.success).toBe(true);
      expect(result.result.success).toBe(true);

      // CRITICAL: Verify the file actually exists on disk
      const filePath = path.join(testProjectDir, fileName);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Verify the content is correct
      const actualContent = await fs.readFile(filePath, 'utf-8');
      expect(actualContent).toBe(fileContent);
    });

    it('should create nested directories when writing files', async () => {
      const fileName = 'src/components/Button.tsx';
      const fileContent = 'export const Button = () => <button>Click</button>;';
      
      const toolCall = {
        name: 'write_file',
        arguments: {
          path: fileName,
          content: fileContent,
        },
      };

      const result = await service.executeTool(toolCall, testProjectDir, {
        requireApproval: false,
      });

      expect(result.success).toBe(true);

      // Verify the file exists
      const filePath = path.join(testProjectDir, fileName);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Verify the content
      const actualContent = await fs.readFile(filePath, 'utf-8');
      expect(actualContent).toBe(fileContent);
    });

    it('should overwrite existing files', async () => {
      const fileName = 'overwrite-test.txt';
      const initialContent = 'Initial content';
      const updatedContent = 'Updated content';
      
      // Create initial file
      const filePath = path.join(testProjectDir, fileName);
      await fs.writeFile(filePath, initialContent);

      // Overwrite with tool
      const toolCall = {
        name: 'write_file',
        arguments: {
          path: fileName,
          content: updatedContent,
        },
      };

      const result = await service.executeTool(toolCall, testProjectDir, {
        requireApproval: false,
      });

      expect(result.success).toBe(true);

      // Verify the content was updated
      const actualContent = await fs.readFile(filePath, 'utf-8');
      expect(actualContent).toBe(updatedContent);
    });
  });

  describe('create_directory - Actual Directory Creation', () => {
    it('should actually create a directory in the project', async () => {
      const dirName = 'test-dir';
      
      const toolCall = {
        name: 'create_directory',
        arguments: {
          path: dirName,
        },
      };

      const result = await service.executeTool(toolCall, testProjectDir, {
        requireApproval: false,
      });

      expect(result.success).toBe(true);

      // Verify the directory exists
      const dirPath = path.join(testProjectDir, dirName);
      const dirExists = await fs.access(dirPath).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);

      // Verify it's actually a directory
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create nested directories', async () => {
      const dirName = 'src/utils/helpers';
      
      const toolCall = {
        name: 'create_directory',
        arguments: {
          path: dirName,
        },
      };

      const result = await service.executeTool(toolCall, testProjectDir, {
        requireApproval: false,
      });

      expect(result.success).toBe(true);

      // Verify all nested directories exist
      const dirPath = path.join(testProjectDir, dirName);
      const dirExists = await fs.access(dirPath).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });
  });

  describe('read_file - Actual File Reading', () => {
    it('should read actual file content from project directory', async () => {
      const fileName = 'read-test.txt';
      const fileContent = 'Content to read';
      
      // Create a file first
      const filePath = path.join(testProjectDir, fileName);
      await fs.writeFile(filePath, fileContent);

      // Read it with the tool
      const toolCall = {
        name: 'read_file',
        arguments: {
          path: fileName,
        },
      };

      const result = await service.executeTool(toolCall, testProjectDir, {
        requireApproval: false,
      });

      expect(result.success).toBe(true);
      expect(result.result.content).toBe(fileContent);
    });

    it('should fail gracefully when file does not exist', async () => {
      const toolCall = {
        name: 'read_file',
        arguments: {
          path: 'non-existent-file.txt',
        },
      };

      const result = await service.executeTool(toolCall, testProjectDir, {
        requireApproval: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read file');
    });
  });

  describe('list_files - Actual Directory Listing', () => {
    it('should list actual files in project directory', async () => {
      // Create some test files
      await fs.writeFile(path.join(testProjectDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(testProjectDir, 'file2.txt'), 'content2');
      await fs.mkdir(path.join(testProjectDir, 'subdir'), { recursive: true });

      const toolCall = {
        name: 'list_files',
        arguments: {
          path: '.',
        },
      };

      const result = await service.executeTool(toolCall, testProjectDir, {
        requireApproval: false,
      });

      expect(result.success).toBe(true);
      expect(result.result.files).toContain('file1.txt');
      expect(result.result.files).toContain('file2.txt');
      expect(result.result.directories).toContain('subdir');
    });
  });

  describe('delete_file - Actual File Deletion', () => {
    it('should actually delete a file from project directory', async () => {
      const fileName = 'delete-test.txt';
      const filePath = path.join(testProjectDir, fileName);
      
      // Create a file first
      await fs.writeFile(filePath, 'content to delete');

      // Verify it exists
      let fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Delete it with the tool
      const toolCall = {
        name: 'delete_file',
        arguments: {
          path: fileName,
        },
      };

      const result = await service.executeTool(toolCall, testProjectDir, {
        requireApproval: false,
      });

      expect(result.success).toBe(true);

      // Verify it's actually deleted
      fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(false);
    });
  });

  describe('execute_command - Actual Command Execution', () => {
    it('should execute commands in the project directory', async () => {
      const toolCall = {
        name: 'execute_command',
        arguments: {
          command: 'pwd',
        },
      };

      const result = await service.executeTool(toolCall, testProjectDir, {
        requireApproval: false,
      });

      console.log('Command execution result:', JSON.stringify(result, null, 2));
      expect(result.success).toBe(true);
      expect(result.result.stdout.trim()).toBe(testProjectDir);
    });

    it('should create files via command in project directory', async () => {
      const fileName = 'command-created.txt';
      const toolCall = {
        name: 'execute_command',
        arguments: {
          command: `echo "Created by command" > ${fileName}`,
        },
      };

      const result = await service.executeTool(toolCall, testProjectDir, {
        requireApproval: false,
      });

      expect(result.success).toBe(true);

      // Verify the file was actually created
      const filePath = path.join(testProjectDir, fileName);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });
  });

  describe('Multiple Operations - Simulating Agent Workflow', () => {
    it('should create a complete project structure', async () => {
      // Simulate agent creating a React app structure
      const operations = [
        {
          name: 'create_directory',
          arguments: { path: 'src' },
        },
        {
          name: 'create_directory',
          arguments: { path: 'public' },
        },
        {
          name: 'write_file',
          arguments: {
            path: 'package.json',
            content: JSON.stringify({ name: 'test-app', version: '1.0.0' }, null, 2),
          },
        },
        {
          name: 'write_file',
          arguments: {
            path: 'src/index.tsx',
            content: 'import React from "react";\nconsole.log("App started");',
          },
        },
        {
          name: 'write_file',
          arguments: {
            path: 'public/index.html',
            content: '<!DOCTYPE html><html><body><div id="root"></div></body></html>',
          },
        },
      ];

      // Execute all operations
      for (const op of operations) {
        const result = await service.executeTool(op, testProjectDir, {
          requireApproval: false,
        });
        expect(result.success).toBe(true);
      }

      // Verify all files and directories exist
      const srcExists = await fs.access(path.join(testProjectDir, 'src')).then(() => true).catch(() => false);
      const publicExists = await fs.access(path.join(testProjectDir, 'public')).then(() => true).catch(() => false);
      const packageJsonExists = await fs.access(path.join(testProjectDir, 'package.json')).then(() => true).catch(() => false);
      const indexTsxExists = await fs.access(path.join(testProjectDir, 'src/index.tsx')).then(() => true).catch(() => false);
      const indexHtmlExists = await fs.access(path.join(testProjectDir, 'public/index.html')).then(() => true).catch(() => false);

      expect(srcExists).toBe(true);
      expect(publicExists).toBe(true);
      expect(packageJsonExists).toBe(true);
      expect(indexTsxExists).toBe(true);
      expect(indexHtmlExists).toBe(true);

      // Verify content of package.json
      const packageJson = JSON.parse(await fs.readFile(path.join(testProjectDir, 'package.json'), 'utf-8'));
      expect(packageJson.name).toBe('test-app');
    });
  });
});
