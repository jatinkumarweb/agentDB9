import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseJSON } from '../common/utils/json-parser.util';

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  success: boolean;
  result?: any;
  error?: string;
}

@Injectable()
export class MCPService {
  private readonly logger = new Logger(MCPService.name);
  private readonly mcpServerUrl = process.env.MCP_SERVER_URL || 'http://mcp-server:9001';
  private readonly workspaceRoot = process.env.VSCODE_WORKSPACE || '/workspace';
  private readonly execAsync = promisify(exec);
  private readonly COMMAND_LOG = '/home/coder/workspace/.agent-commands.log';

  constructor() {}

  /**
   * Execute an MCP tool call for an agent
   */
  async executeTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    try {
      this.logger.log(`Executing MCP tool: ${toolCall.name}`);
      
      // Execute tool directly on the file system
      const result = await this.executeToolDirectly(toolCall);
      
      return {
        success: true,
        result
      };
    } catch (error) {
      this.logger.error(`Failed to execute MCP tool ${toolCall.name}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get available MCP tools
   */
  async getAvailableTools(): Promise<string[]> {
    try {
      // Simulate available tools
      return [
        'read_file',
        'write_file',
        'list_files',
        'execute_command',
        'git_status',
        'git_commit',
        'create_directory',
        'delete_file'
      ];
    } catch (error) {
      this.logger.error('Failed to get available MCP tools:', error);
      return [];
    }
  }

  /**
   * Parse agent response to extract tool calls
   */
  parseToolCalls(agentResponse: string): MCPToolCall[] {
    const toolCalls: MCPToolCall[] = [];
    
    // Look for tool call patterns in the agent response
    // Pattern: [TOOL:tool_name:{"arg1":"value1","arg2":"value2"}]
    const toolCallRegex = /\[TOOL:(\w+):(\{[^}]*\})\]/g;
    let match;
    
    while ((match = toolCallRegex.exec(agentResponse)) !== null) {
      try {
        const toolName = match[1];
        const args = parseJSON(match[2]);
        
        if (args) {
          toolCalls.push({
            name: toolName,
            arguments: args
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to parse tool call: ${match[0]}`, error);
      }
    }
    
    return toolCalls;
  }

  /**
   * Execute tool directly on the file system
   */
  private async executeToolDirectly(toolCall: MCPToolCall): Promise<any> {
    const { name, arguments: args } = toolCall;
    
    try {
      switch (name) {
        case 'read_file':
          return await this.readFile(args.path);
          
        case 'write_file':
          return await this.writeFile(args.path, args.content);
          
        case 'list_files':
          return await this.listFiles(args.path || '.');
          
        case 'execute_command':
          return await this.executeCommand(args.command);
          
        case 'git_status':
          return await this.getGitStatus();
          
        case 'git_commit':
          return await this.gitCommit(args.message, args.files);
          
        case 'create_directory':
          return await this.createDirectory(args.path);
          
        case 'delete_file':
          return await this.deleteFile(args.path);
          
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Tool execution failed for ${name}:`, error);
      throw error;
    }
  }

  private async readFile(filePath: string): Promise<any> {
    const fullPath = path.resolve(this.workspaceRoot, filePath);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return {
        content,
        path: filePath,
        size: content.length
      };
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  private async writeFile(filePath: string, content: string): Promise<any> {
    const fullPath = path.resolve(this.workspaceRoot, filePath);
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      return {
        success: true,
        path: filePath,
        bytesWritten: content.length
      };
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  private async listFiles(dirPath: string): Promise<any> {
    const fullPath = path.resolve(this.workspaceRoot, dirPath);
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const files = entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name);
      const directories = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
      
      return {
        files,
        directories,
        directory: dirPath,
        total: files.length + directories.length
      };
    } catch (error) {
      throw new Error(`Failed to list files in ${dirPath}: ${error.message}`);
    }
  }

  private async executeCommand(command: string): Promise<any> {
    const timestamp = new Date().toISOString();
    const separator = '='.repeat(80);
    
    try {
      // Log command execution start
      await this.logToFile(
        `\n${separator}\n` +
        `[${timestamp}] Executing Command\n` +
        `${separator}\n` +
        `$ ${command}\n\n`
      );
      
      // ALL commands execute in VSCode container via MCP Server
      // This ensures consistency, proper environment, and user visibility
      this.logger.log(`Executing command in VSCode container: ${command}`);
      
      const response = await fetch(`${this.mcpServerUrl}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'terminal_execute',
          parameters: {
            command,
            cwd: '/home/coder/workspace',
            timeout: 60000,
            shell: '/bin/bash'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`MCP Server returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Command execution failed');
      }

      // Log output
      const stdout = result.result?.output || '';
      const stderr = result.result?.error || '';
      const exitCode = result.result?.exitCode || 0;
      
      await this.logToFile(
        `STDOUT:\n${stdout || '(no output)'}\n\n` +
        (stderr ? `STDERR:\n${stderr}\n\n` : '') +
        `Exit Code: ${exitCode}\n` +
        `Completed at: ${new Date().toISOString()}\n` +
        `${separator}\n`
      );

      // Return formatted result
      return {
        stdout,
        stderr,
        exitCode,
        command,
        logFile: this.COMMAND_LOG,
        message: `Command executed. View details in VSCode: ${this.COMMAND_LOG}`
      };
    } catch (error) {
      this.logger.error(`Failed to execute command in VSCode container: ${error.message}`);
      
      // Log error
      await this.logToFile(
        `ERROR: ${error.message}\n` +
        `${separator}\n`
      );
      
      // Fallback to local execution only if MCP Server is unavailable
      this.logger.warn('MCP Server unavailable, falling back to local execution');
      try {
        const { stdout, stderr } = await this.execAsync(command, {
          cwd: this.workspaceRoot,
          timeout: 30000
        });
        
        // Log fallback execution
        await this.logToFile(
          `FALLBACK EXECUTION (Backend Container):\n` +
          `STDOUT:\n${stdout.trim() || '(no output)'}\n\n` +
          (stderr ? `STDERR:\n${stderr.trim()}\n\n` : '') +
          `${separator}\n`
        );
        
        return {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0,
          command,
          fallback: true,
          logFile: this.COMMAND_LOG
        };
      } catch (execError) {
        await this.logToFile(
          `FALLBACK EXECUTION FAILED: ${execError.message}\n` +
          `${separator}\n`
        );
        
        return {
          stdout: '',
          stderr: execError.message,
          exitCode: execError.code || 1,
          command
        };
      }
    }
  }

  /**
   * Log command execution to file visible in VSCode
   */
  private async logToFile(content: string): Promise<void> {
    try {
      // Read existing content
      let existingContent = '';
      try {
        const readResponse = await fetch(`${this.mcpServerUrl}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: 'read_file',
            parameters: { path: this.COMMAND_LOG }
          })
        });
        
        if (readResponse.ok) {
          const readResult = await readResponse.json();
          existingContent = readResult.result?.content || '';
        }
      } catch (readError) {
        // File doesn't exist yet, that's okay
      }
      
      // Append new content
      const newContent = existingContent + content;
      
      // Write to file
      await fetch(`${this.mcpServerUrl}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'write_file',
          parameters: {
            path: this.COMMAND_LOG,
            content: newContent
          }
        })
      });
    } catch (error) {
      // Don't fail command execution if logging fails
      this.logger.warn('Failed to log to file:', error.message);
    }
  }

  private async getGitStatus(): Promise<any> {
    try {
      const { stdout } = await this.execAsync('git status --porcelain', {
        cwd: this.workspaceRoot
      });
      
      const lines = stdout.trim().split('\n').filter(line => line.length > 0);
      const modified: string[] = [];
      const untracked: string[] = [];
      const staged: string[] = [];
      
      for (const line of lines) {
        const status = line.substring(0, 2);
        const file = line.substring(3);
        
        if (status.startsWith('M')) modified.push(file);
        else if (status.startsWith('??')) untracked.push(file);
        else if (status.startsWith('A')) staged.push(file);
      }
      
      const { stdout: branchOutput } = await this.execAsync('git branch --show-current', {
        cwd: this.workspaceRoot
      });
      
      return {
        branch: branchOutput.trim(),
        modified,
        untracked,
        staged
      };
    } catch (error) {
      throw new Error(`Failed to get git status: ${error.message}`);
    }
  }

  private async gitCommit(message: string, files?: string[]): Promise<any> {
    try {
      if (files && files.length > 0) {
        await this.execAsync(`git add ${files.join(' ')}`, {
          cwd: this.workspaceRoot
        });
      }
      
      const { stdout } = await this.execAsync(`git commit -m "${message}"`, {
        cwd: this.workspaceRoot
      });
      
      const { stdout: hashOutput } = await this.execAsync('git rev-parse HEAD', {
        cwd: this.workspaceRoot
      });
      
      return {
        hash: hashOutput.trim().substring(0, 7),
        message,
        files: files || [],
        output: stdout.trim()
      };
    } catch (error) {
      throw new Error(`Failed to commit: ${error.message}`);
    }
  }

  private async createDirectory(dirPath: string): Promise<any> {
    const fullPath = path.resolve(this.workspaceRoot, dirPath);
    try {
      await fs.mkdir(fullPath, { recursive: true });
      return {
        success: true,
        path: dirPath
      };
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
  }

  private async deleteFile(filePath: string): Promise<any> {
    const fullPath = path.resolve(this.workspaceRoot, filePath);
    try {
      await fs.unlink(fullPath);
      return {
        success: true,
        path: filePath
      };
    } catch (error) {
      throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Format tool results for agent response
   */
  formatToolResults(toolCalls: MCPToolCall[], results: MCPToolResult[]): string {
    let formatted = '\n\n**Tool Execution Results:**\n\n';
    
    for (let i = 0; i < toolCalls.length; i++) {
      const toolCall = toolCalls[i];
      const result = results[i];
      
      formatted += `🔧 **${toolCall.name}**\n`;
      
      if (result.success) {
        formatted += `✅ Success\n`;
        if (result.result) {
          formatted += `\`\`\`json\n${JSON.stringify(result.result, null, 2)}\n\`\`\`\n\n`;
        }
      } else {
        formatted += `❌ Error: ${result.error}\n\n`;
      }
    }
    
    return formatted;
  }
}