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
  private readonly COMMAND_LOG = '/workspace/.agent-commands.log';
  private readonly TERMINAL_LOG = '/workspace/.agent-terminal.log';

  constructor() {}

  /**
   * Execute an MCP tool call for an agent
   */
  async executeTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    const startTime = Date.now();
    this.logger.log(`🔧 Executing MCP tool: ${toolCall.name} with args:`, JSON.stringify(toolCall.arguments));
    
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Tool execution timeout after 30s`)), 30000);
      });
      
      // Execute tool with timeout
      const result = await Promise.race([
        this.executeToolDirectly(toolCall),
        timeoutPromise
      ]);
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Tool ${toolCall.name} completed in ${duration}ms`);
      
      return {
        success: true,
        result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Failed to execute MCP tool ${toolCall.name} after ${duration}ms:`, error.message);
      this.logger.error(`Tool arguments:`, JSON.stringify(toolCall.arguments));
      this.logger.error(`Error stack:`, error.stack);
      
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
        'delete_file',
        'get_workspace_summary'
      ];
    } catch (error) {
      this.logger.error('Failed to get available MCP tools:', error);
      return [];
    }
  }

  /**
   * Parse agent response to extract tool calls (supports JSON and legacy formats)
   */
  parseToolCalls(agentResponse: string): MCPToolCall[] {
    const toolCalls: MCPToolCall[] = [];
    
    // Try JSON format with TOOL_CALL: marker
    const jsonMarkerRegex = /TOOL_CALL:\s*(\{[\s\S]*?\})\s*(?:\n|$)/g;
    let match;
    
    while ((match = jsonMarkerRegex.exec(agentResponse)) !== null) {
      try {
        const jsonStr = match[1].trim();
        const toolCallData = parseJSON(jsonStr);
        
        if (toolCallData && toolCallData.tool) {
          toolCalls.push({
            name: toolCallData.tool,
            arguments: toolCallData.arguments || {}
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to parse JSON tool call: ${match[0]}`, error);
      }
    }
    
    // If no JSON format found, try legacy format: [TOOL:tool_name:{"arg1":"value1"}]
    if (toolCalls.length === 0) {
      const legacyRegex = /\[TOOL:(\w+):(\{[^}]*\})\]/g;
      
      while ((match = legacyRegex.exec(agentResponse)) !== null) {
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
          this.logger.warn(`Failed to parse legacy tool call: ${match[0]}`, error);
        }
      }
    }
    
    return toolCalls;
  }

  /**
   * Execute tool directly on the file system
   */
  private async executeToolDirectly(toolCall: MCPToolCall): Promise<any> {
    const { name, arguments: args } = toolCall;
    
    this.logger.log(`📂 Executing tool directly: ${name}`);
    
    try {
      let result;
      switch (name) {
        case 'read_file':
          this.logger.log(`📖 Reading file: ${args.path}`);
          result = await this.readFile(args.path);
          this.logger.log(`✅ Read file success, size: ${result.size} bytes`);
          return result;
          
        case 'write_file':
          this.logger.log(`✍️ Writing file: ${args.path}`);
          result = await this.writeFile(args.path, args.content);
          this.logger.log(`✅ Write file success`);
          return result;
          
        case 'list_files':
          this.logger.log(`📋 Listing files in: ${args.path || '.'}`);
          result = await this.listFiles(args.path || '.');
          this.logger.log(`✅ List files success: ${result.total} items (${result.files.length} files, ${result.directories.length} dirs)`);
          return result;
          
        case 'execute_command':
          this.logger.log(`⚡ Executing command: ${args.command}`);
          result = await this.executeCommand(args.command);
          this.logger.log(`✅ Command executed, exit code: ${result.exitCode}`);
          return result;
          
        case 'git_status':
          this.logger.log(`🔍 Getting git status`);
          result = await this.getGitStatus();
          this.logger.log(`✅ Git status retrieved`);
          return result;
          
        case 'git_commit':
          this.logger.log(`💾 Git commit: ${args.message}`);
          result = await this.gitCommit(args.message, args.files);
          this.logger.log(`✅ Git commit success`);
          return result;
          
        case 'create_directory':
          this.logger.log(`📁 Creating directory: ${args.path}`);
          result = await this.createDirectory(args.path);
          this.logger.log(`✅ Directory created`);
          return result;
          
        case 'delete_file':
          this.logger.log(`🗑️ Deleting file: ${args.path}`);
          result = await this.deleteFile(args.path);
          this.logger.log(`✅ File deleted`);
          return result;
          
        case 'get_workspace_summary':
          this.logger.log(`📊 Getting workspace summary`);
          result = await this.getWorkspaceSummary();
          this.logger.log(`✅ Workspace summary retrieved`);
          return result;
          
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      this.logger.error(`❌ Tool execution failed for ${name}:`, error.message);
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
      
      // Parse command to extract cd directory if present
      let actualCommand = command;
      let workingDir = '/workspace';
      
      // Match patterns like: "cd dir && command" or "cd dir; command"
      const cdMatch = command.match(/^cd\s+([^\s;&|]+)\s*(?:&&|;)\s*(.+)$/);
      if (cdMatch) {
        const targetDir = cdMatch[1];
        actualCommand = cdMatch[2];
        
        // Handle relative paths
        if (targetDir.startsWith('/')) {
          workingDir = targetDir;
        } else {
          workingDir = `/workspace/${targetDir}`;
        }
        
        this.logger.log(`Parsed cd command: dir=${workingDir}, command=${actualCommand}`);
      }
      
      // Convert "npm run <script>" to direct binary execution
      // This works around npm issues with spawn in shell mode
      let isDevServer = false;
      const npmRunMatch = actualCommand.match(/^npm\s+run\s+(\S+)(.*)$/);
      if (npmRunMatch) {
        const scriptName = npmRunMatch[1];
        const extraArgs = npmRunMatch[2] || '';
        
        // Check if this is a dev server command
        isDevServer = scriptName === 'dev' || scriptName === 'start' || scriptName === 'serve';
        
        // Read package.json to get the actual script command
        try {
          const packageJsonPath = `${workingDir}/package.json`;
          const packageJsonResponse = await fetch(`${this.mcpServerUrl}/api/tools/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tool: 'fs_read_file',
              parameters: {
                path: packageJsonPath
              }
            })
          });
          
          if (packageJsonResponse.ok) {
            const packageJsonResult = await packageJsonResponse.json();
            if (packageJsonResult.success) {
              const packageJson = JSON.parse(packageJsonResult.result.content);
              const scriptCommand = packageJson.scripts?.[scriptName];
              
              if (scriptCommand) {
                actualCommand = `${scriptCommand}${extraArgs}`;
                this.logger.log(`Converted npm run ${scriptName} to: ${actualCommand}`);
                
                // For dev servers, we'll use terminal_create to create a persistent terminal
                // This allows users to see the output in real-time
                if (isDevServer) {
                  // Create a persistent terminal session
                  try {
                    const terminalName = `Agent Dev Server - ${scriptName}`;
                    const createTerminalResponse = await fetch(`${this.mcpServerUrl}/api/tools/execute`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        tool: 'terminal_create',
                        parameters: {
                          name: terminalName,
                          cwd: workingDir,
                          shell: '/bin/bash'
                        }
                      })
                    });
                    
                    if (createTerminalResponse.ok) {
                      const terminalResult = await createTerminalResponse.json();
                      if (terminalResult.success) {
                        const terminalId = terminalResult.result;
                        this.logger.log(`Created terminal ${terminalId} for dev server`);
                        
                        // Send the command to the terminal
                        await fetch(`${this.mcpServerUrl}/api/tools/execute`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            tool: 'terminal_send_text',
                            parameters: {
                              terminalId,
                              text: actualCommand,
                              addNewLine: true
                            }
                          })
                        });
                        
                        // Return success message with terminal info
                        return {
                          success: true,
                          output: `Dev server started in terminal: ${terminalName}\nTerminal ID: ${terminalId}\nCommand: ${actualCommand}\n\nThe server is running in a persistent terminal session.`,
                          error: '',
                          exitCode: 0
                        };
                      }
                    }
                  } catch (error) {
                    this.logger.error(`Failed to create terminal for dev server: ${error.message}`);
                    // Fall back to background execution
                  }
                  
                  // Fallback: run in background with nohup
                  actualCommand = `nohup ${actualCommand} > ${workingDir}/.dev-server.log 2>&1 & echo "Dev server started in background. PID: $!" && sleep 2 && tail -20 ${workingDir}/.dev-server.log`;
                  this.logger.log(`Running dev server in background (fallback)`);
                }
              }
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to convert npm run command: ${error.message}`);
          // Continue with original command
        }
      }
      
      const response = await fetch(`${this.mcpServerUrl}/api/tools/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'terminal_execute',
          parameters: {
            command: actualCommand,
            cwd: workingDir,
            // Use longer timeout for potentially long-running commands
            // Dev servers will be handled separately in the future
            timeout: 300000, // 5 minutes
            shell: '/bin/sh'
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
        terminalLog: this.TERMINAL_LOG,
        message: `Command executed. View real-time output in VSCode: ${this.TERMINAL_LOG}`
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
          timeout: 30000,
          env: {
            ...process.env,
            // Remove PORT to avoid conflicts with Next.js and other dev servers
            PORT: undefined,
            NODE_ENV: 'development'
          }
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
        const readResponse = await fetch(`${this.mcpServerUrl}/api/tools/execute`, {
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
      await fetch(`${this.mcpServerUrl}/api/tools/execute`, {
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

  private async getWorkspaceSummary(): Promise<any> {
    try {
      // Scan workspace and provide comprehensive summary
      const rootPath = this.workspaceRoot;
      
      // Get directory listing
      const files = await fs.readdir(rootPath, { withFileTypes: true });
      const directories = files.filter(f => f.isDirectory() && !f.name.startsWith('.')).map(f => f.name);
      const rootFiles = files.filter(f => f.isFile()).map(f => f.name);
      
      // Detect projects by looking for package.json, requirements.txt, etc.
      const projects: Array<{name: string; type: string; framework?: string; dependencies: number; devDependencies: number}> = [];
      for (const dir of directories) {
        const packageJsonPath = path.join(rootPath, dir, 'package.json');
        try {
          const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
          projects.push({
            name: dir,
            type: 'Node.js',
            framework: this.detectFramework(packageJson),
            dependencies: Object.keys(packageJson.dependencies || {}).length,
            devDependencies: Object.keys(packageJson.devDependencies || {}).length
          });
        } catch {
          // Not a Node.js project, check for other types
        }
      }
      
      // Count files by extension
      const fileStats = await this.countFilesByExtension(rootPath);
      
      return {
        workspace: rootPath,
        projects,
        directories: directories.length,
        rootFiles: rootFiles.length,
        fileStatistics: fileStats,
        detectedProjects: projects.map(p => `${p.name} (${p.framework || p.type})`).join(', ')
      };
    } catch (error) {
      throw new Error(`Failed to get workspace summary: ${error.message}`);
    }
  }

  private detectFramework(packageJson: any): string {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    if (deps['next']) return 'Next.js';
    if (deps['react']) return 'React';
    if (deps['vue']) return 'Vue.js';
    if (deps['@angular/core']) return 'Angular';
    if (deps['express']) return 'Express';
    if (deps['@nestjs/core']) return 'NestJS';
    return 'Node.js';
  }

  private async countFilesByExtension(rootPath: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    
    const countFiles = async (dir: string) => {
      const files = await fs.readdir(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          if (!file.name.startsWith('.') && file.name !== 'node_modules') {
            await countFiles(fullPath);
          }
        } else {
          const ext = path.extname(file.name) || 'no-extension';
          counts[ext] = (counts[ext] || 0) + 1;
        }
      }
    };
    
    await countFiles(rootPath);
    return counts;
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