import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseJSON } from '../common/utils/json-parser.util';
import { ApprovalService } from '../common/services/approval.service';
import { ApprovalStatus } from '../common/interfaces/approval.interface';

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  success: boolean;
  result?: any;
  error?: string;
  approvalRequired?: boolean;
  approvalRejected?: boolean;
}

export interface MCPExecutionContext {
  conversationId?: string;
  agentId?: string;
  requireApproval?: boolean;
}

@Injectable()
export class MCPService {
  private readonly logger = new Logger(MCPService.name);
  private readonly mcpServerUrl = process.env.MCP_SERVER_URL || 'http://mcp-server:9001';
  private readonly workspaceRoot = process.env.GITPOD_REPO_ROOT || process.env.VSCODE_WORKSPACE || '/workspace';
  private readonly execAsync = promisify(exec);
  private readonly COMMAND_LOG = `${process.env.GITPOD_REPO_ROOT || '/workspace'}/.agent-commands.log`;
  private readonly TERMINAL_LOG = `${process.env.GITPOD_REPO_ROOT || '/workspace'}/.agent-terminal.log`;
  private terminals = new Map<string, {
    process: any;
    port: number;
    command: string;
    workingDir: string;
    startTime: Date;
  }>();

  constructor(
    @Inject(forwardRef(() => ApprovalService))
    private approvalService: ApprovalService,
  ) {}

  /**
   * Execute an MCP tool call for an agent with approval workflow
   * @param toolCall The tool call to execute
   * @param workingDir Optional working directory for file operations and commands (defaults to workspaceRoot)
   * @param context Execution context including conversationId and agentId for approval workflow
   */
  async executeTool(
    toolCall: MCPToolCall, 
    workingDir?: string,
    context?: MCPExecutionContext
  ): Promise<MCPToolResult> {
    const startTime = Date.now();
    const effectiveWorkingDir = workingDir || this.workspaceRoot;
    console.log(`[MCP] Tool: ${toolCall.name}`);
    console.log(`[MCP] Working dir param: ${workingDir || 'undefined (will use default)'}`);
    console.log(`[MCP] Effective working dir: ${effectiveWorkingDir}`);
    console.log(`[MCP] Default workspace root: ${this.workspaceRoot}`);
    this.logger.log(`🔧 Executing MCP tool: ${toolCall.name} in ${effectiveWorkingDir} with args:`, JSON.stringify(toolCall.arguments));
    
    try {
      // Check if approval is required for this tool
      const requireApproval = context?.requireApproval !== false; // Default to true
      
      if (requireApproval && context?.conversationId && context?.agentId) {
        this.logger.log(`🔔 [APPROVAL] Checking approval for tool: ${toolCall.name}, conversation: ${context.conversationId}`);
        const approvalResult = await this.checkAndRequestApproval(
          toolCall,
          effectiveWorkingDir,
          context.conversationId,
          context.agentId
        );
        this.logger.log(`🔔 [APPROVAL] Result: ${approvalResult.approved ? 'APPROVED' : 'REJECTED'} for ${toolCall.name}`);
        
        if (!approvalResult.approved) {
          this.logger.warn(`❌ [APPROVAL] Operation rejected: ${toolCall.name} - ${approvalResult.reason}`);
          return {
            success: false,
            error: approvalResult.reason || 'Operation rejected by user',
            approvalRejected: true
          };
        }
        
        // Use modified command if provided
        if (approvalResult.modifiedCommand && toolCall.name === 'execute_command') {
          toolCall.arguments.command = approvalResult.modifiedCommand;
        }
      }
      
      // Add timeout to prevent hanging (5 minutes for long-running commands like npm install)
      const timeoutMs = 300000; // 5 minutes
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Tool execution timeout after ${timeoutMs/1000}s`)), timeoutMs);
      });
      
      // Execute tool with timeout
      const result = await Promise.race([
        this.executeToolDirectly(toolCall, effectiveWorkingDir),
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
   * Check if tool requires approval and request it
   */
  private async checkAndRequestApproval(
    toolCall: MCPToolCall,
    workingDir: string,
    conversationId: string,
    agentId: string
  ): Promise<{ approved: boolean; reason?: string; modifiedCommand?: string }> {
    try {
      // Check tool type and request appropriate approval
      switch (toolCall.name) {
        case 'execute_command': {
          const command = toolCall.arguments.command as string;
          
          // Special handling for dependency installation commands
          if (this.isDependencyInstallCommand(command)) {
            const packages = this.extractPackagesFromCommand(command);
            const packageManager = this.detectPackageManager(command);
            const isDevDependency = command.includes('--save-dev') || command.includes('-D');
            
            if (packages.length > 0) {
              this.logger.log(`⏸️ Requesting approval for dependency installation: ${packages.join(', ')}`);
              const response = await this.approvalService.requestDependencyApproval(
                packages,
                packageManager,
                workingDir,
                conversationId,
                agentId,
                isDevDependency
              );
              
              if (response.status === ApprovalStatus.APPROVED) {
                // If user selected specific packages, modify command
                if (response.selectedPackages && response.selectedPackages.length > 0) {
                  const baseCommand = command.split(/\s+/)[0]; // npm, yarn, pnpm
                  const action = packageManager === 'npm' ? 'install' : 'add';
                  const devFlag = isDevDependency ? (packageManager === 'npm' ? '--save-dev' : '-D') : '';
                  const modifiedCommand = `${baseCommand} ${action} ${response.selectedPackages.join(' ')} ${devFlag}`.trim();
                  return { approved: true, modifiedCommand };
                }
                return { approved: true };
              } else if (response.status === ApprovalStatus.TIMEOUT) {
                return { approved: false, reason: 'Approval timeout - dependency installation cancelled' };
              } else {
                return { approved: false, reason: 'User rejected dependency installation' };
              }
            }
          }
          
          // Check if command requires approval (for non-dependency commands)
          if (!this.approvalService.shouldRequireApproval(command)) {
            return { approved: true };
          }
          
          this.logger.log(`⏸️ Requesting approval for command: ${command}`);
          const response = await this.approvalService.requestCommandApproval(
            command,
            workingDir,
            conversationId,
            agentId,
            `Execute command: ${command}`
          );
          
          if (response.status === ApprovalStatus.APPROVED) {
            return { 
              approved: true, 
              modifiedCommand: response.modifiedCommand 
            };
          } else if (response.status === ApprovalStatus.TIMEOUT) {
            return { approved: false, reason: 'Approval timeout - operation cancelled' };
          } else {
            return { approved: false, reason: 'User rejected the operation' };
          }
        }
        
        case 'delete_file': {
          this.logger.log(`⏸️ Requesting approval for file deletion: ${toolCall.arguments.path}`);
          const response = await this.approvalService.requestFileOperationApproval(
            'delete',
            toolCall.arguments.path as string,
            conversationId,
            agentId
          );
          
          return { 
            approved: response.status === ApprovalStatus.APPROVED,
            reason: response.status === ApprovalStatus.REJECTED ? 'User rejected file deletion' : undefined
          };
        }
        
        case 'git_commit':
        case 'git_push': {
          const operation = toolCall.name === 'git_commit' ? 'commit' : 'push';
          this.logger.log(`⏸️ Requesting approval for git ${operation}`);
          const response = await this.approvalService.requestGitOperationApproval(
            operation,
            conversationId,
            agentId,
            toolCall.arguments.message as string,
            toolCall.arguments.files as string[]
          );
          
          return { 
            approved: response.status === ApprovalStatus.APPROVED,
            reason: response.status === ApprovalStatus.REJECTED ? `User rejected git ${operation}` : undefined
          };
        }
        
        default:
          // No approval required for other tools
          return { approved: true };
      }
    } catch (error) {
      this.logger.error('Error in approval workflow:', error);
      // On error, reject to be safe
      return { approved: false, reason: 'Approval workflow error' };
    }
  }

  /**
   * Check if command is a dependency installation command
   */
  private isDependencyInstallCommand(command: string): boolean {
    const patterns = [
      /npm\s+install\s+[^-]/,
      /npm\s+i\s+[^-]/,
      /yarn\s+add\s+/,
      /pnpm\s+add\s+/,
      /bun\s+add\s+/,
    ];
    return patterns.some(pattern => pattern.test(command));
  }

  /**
   * Extract package names from install command
   */
  private extractPackagesFromCommand(command: string): string[] {
    const packages: string[] = [];
    
    // Match npm install, yarn add, pnpm add, bun add patterns
    const patterns = [
      /npm\s+(?:install|i)\s+(.+?)(?:\s+--|$)/,
      /yarn\s+add\s+(.+?)(?:\s+--|$)/,
      /pnpm\s+add\s+(.+?)(?:\s+--|$)/,
      /bun\s+add\s+(.+?)(?:\s+--|$)/,
    ];
    
    for (const pattern of patterns) {
      const match = command.match(pattern);
      if (match) {
        const packageString = match[1].trim();
        // Split by space and filter out flags
        const pkgs = packageString.split(/\s+/).filter(pkg => !pkg.startsWith('-') && pkg.length > 0);
        packages.push(...pkgs);
        break;
      }
    }
    
    return packages;
  }

  /**
   * Detect package manager from command
   */
  private detectPackageManager(command: string): 'npm' | 'yarn' | 'pnpm' | 'bun' {
    if (command.includes('yarn')) return 'yarn';
    if (command.includes('pnpm')) return 'pnpm';
    if (command.includes('bun')) return 'bun';
    return 'npm';
  }

  /**
   * Get available MCP tools
   */
  async getAvailableTools(): Promise<string[]> {
    try {
      // Return all available tools including dev server management
      return [
        'read_file',
        'write_file',
        'list_files',
        'execute_command',
        'git_status',
        'git_commit',
        'create_directory',
        'delete_file',
        'get_workspace_summary',
        'stop_dev_server',
        'stop_all_dev_servers',
        'check_dev_server',
        'list_dev_servers'
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
  private async executeToolDirectly(toolCall: MCPToolCall, workingDir: string): Promise<any> {
    const { name, arguments: args } = toolCall;
    
    this.logger.log(`📂 Executing tool directly: ${name} in ${workingDir}`);
    
    try {
      let result;
      switch (name) {
        case 'read_file':
          this.logger.log(`📖 Reading file: ${args.path}`);
          result = await this.readFile(args.path, workingDir);
          this.logger.log(`✅ Read file success, size: ${result.size} bytes`);
          return result;
          
        case 'write_file':
          this.logger.log(`✍️ Writing file: ${args.path}`);
          result = await this.writeFile(args.path, args.content, workingDir);
          this.logger.log(`✅ Write file success`);
          return result;
          
        case 'list_files':
          this.logger.log(`📋 Listing files in: ${args.path || '.'}`);
          result = await this.listFiles(args.path || '.', workingDir);
          this.logger.log(`✅ List files success: ${result.total} items (${result.files.length} files, ${result.directories.length} dirs)`);
          return result;
          
        case 'execute_command':
          this.logger.log(`⚡ Executing command: ${args.command}`);
          result = await this.executeCommand(args.command, workingDir);
          this.logger.log(`✅ Command executed, exit code: ${result.exitCode}`);
          return result;
          
        case 'git_status':
          this.logger.log(`🔍 Getting git status`);
          result = await this.getGitStatus(workingDir);
          this.logger.log(`✅ Git status retrieved`);
          return result;
          
        case 'git_commit':
          this.logger.log(`💾 Git commit: ${args.message}`);
          result = await this.gitCommit(args.message, args.files, workingDir);
          this.logger.log(`✅ Git commit success`);
          return result;
          
        case 'create_directory':
          this.logger.log(`📁 Creating directory: ${args.path}`);
          result = await this.createDirectory(args.path, workingDir);
          this.logger.log(`✅ Directory created`);
          return result;
          
        case 'stop_dev_server':
          this.logger.log(`🛑 Stopping dev server`);
          result = await this.stopDevServer(args.terminalId, args.port, workingDir);
          this.logger.log(`✅ Dev server stopped`);
          return result;
          
        case 'stop_all_dev_servers':
          this.logger.log(`🛑 Stopping all dev servers`);
          result = await this.stopAllDevServers();
          this.logger.log(`✅ All dev servers stopped`);
          return result;
          
        case 'check_dev_server':
          this.logger.log(`🔍 Checking dev server on port ${args.port}`);
          result = await this.checkDevServer(args.port);
          this.logger.log(`✅ Dev server check complete`);
          return result;
          
        case 'list_dev_servers':
          this.logger.log(`📋 Listing dev servers`);
          result = await this.listDevServers();
          this.logger.log(`✅ Dev servers listed`);
          return result;
          
        case 'delete_file':
          this.logger.log(`🗑️ Deleting file: ${args.path}`);
          result = await this.deleteFile(args.path, workingDir);
          this.logger.log(`✅ File deleted`);
          return result;
          
        case 'get_workspace_summary':
          this.logger.log(`📊 Getting workspace summary`);
          result = await this.getWorkspaceSummary(workingDir);
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

  private async readFile(filePath: string, workingDir: string = this.workspaceRoot): Promise<any> {
    const fullPath = path.resolve(workingDir, filePath);
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

  private async writeFile(filePath: string, content: string, workingDir: string = this.workspaceRoot): Promise<any> {
    const fullPath = path.resolve(workingDir, filePath);
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

  private async listFiles(dirPath: string, workingDir: string = this.workspaceRoot): Promise<any> {
    const fullPath = path.resolve(workingDir, dirPath);
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

  private async executeCommand(command: string, workingDir: string = this.workspaceRoot): Promise<any> {
    const timestamp = new Date().toISOString();
    const separator = '='.repeat(80);
    
    // Parse command to extract cd directory if present - declare outside try block
    let actualCommand = command;
    let effectiveWorkingDir = workingDir;
    
    try {
      // Log command execution start
      await this.logToFile(
        `\n${separator}\n` +
        `[${timestamp}] Executing Command\n` +
        `${separator}\n` +
        `$ ${command}\n` +
        `Working Directory: ${workingDir}\n\n`
      );
      
      // ALL commands execute in VSCode container via MCP Server
      // This ensures consistency, proper environment, and user visibility
      this.logger.log(`Executing command in VSCode container: ${command} (cwd: ${workingDir})`);
      
      // Match patterns like: "cd dir && command" or "cd dir; command"
      const cdMatch = command.match(/^cd\s+([^\s;&|]+)\s*(?:&&|;)\s*(.+)$/);
      if (cdMatch) {
        const targetDir = cdMatch[1];
        actualCommand = cdMatch[2];
        
        // Handle relative paths
        if (targetDir.startsWith('/')) {
          effectiveWorkingDir = targetDir;
        } else {
          effectiveWorkingDir = path.resolve(workingDir, targetDir);
        }
        
        this.logger.log(`Parsed cd command: dir=${effectiveWorkingDir}, command=${actualCommand}`);
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
            cwd: effectiveWorkingDir,
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
      this.logger.warn(`MCP Server unavailable, falling back to local execution in ${workingDir}`);
      try {
        const { stdout, stderr } = await this.execAsync(actualCommand, {
          cwd: effectiveWorkingDir,
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

  private async getGitStatus(workingDir: string = this.workspaceRoot): Promise<any> {
    try {
      const { stdout } = await this.execAsync('git status --porcelain', {
        cwd: workingDir
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
        cwd: workingDir
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

  private async gitCommit(message: string, files?: string[], workingDir: string = this.workspaceRoot): Promise<any> {
    try {
      if (files && files.length > 0) {
        await this.execAsync(`git add ${files.join(' ')}`, {
          cwd: workingDir
        });
      }
      
      const { stdout } = await this.execAsync(`git commit -m "${message}"`, {
        cwd: workingDir
      });
      
      const { stdout: hashOutput } = await this.execAsync('git rev-parse HEAD', {
        cwd: workingDir
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

  private async createDirectory(dirPath: string, workingDir: string = this.workspaceRoot): Promise<any> {
    const fullPath = path.resolve(workingDir, dirPath);
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

  private async deleteFile(filePath: string, workingDir: string = this.workspaceRoot): Promise<any> {
    const fullPath = path.resolve(workingDir, filePath);
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

  private async getWorkspaceSummary(workingDir: string = this.workspaceRoot): Promise<any> {
    try {
      // Scan workspace and provide comprehensive summary
      const rootPath = workingDir;
      
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

  /**
   * Stop a dev server by terminal ID or port
   */
  private async stopDevServer(
    terminalId?: string,
    port?: number,
    workingDir?: string,
  ): Promise<string> {
    try {
      // If terminal ID provided, kill it directly
      if (terminalId) {
        const response = await fetch(`${this.mcpServerUrl}/api/tools/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: 'terminal_kill',
            arguments: { terminalId },
          }),
        });

        if (!response.ok) {
          return `Failed to stop terminal ${terminalId}`;
        }

        const result = await response.json();
        this.terminals.delete(terminalId);
        return result.result || `Terminal ${terminalId} stopped successfully`;
      }

      // If port provided, find PID and kill it
      if (port) {
        // Find PID using lsof
        const findPidResponse = await fetch(`${this.mcpServerUrl}/api/tools/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: 'execute_command',
            arguments: {
              command: `lsof -ti:${port}`,
              workingDir: workingDir || this.workspaceRoot,
            },
          }),
        });

        if (!findPidResponse.ok) {
          return `Failed to find process on port ${port}`;
        }

        const findPidResult = await findPidResponse.json();
        const pid = findPidResult.result?.output?.trim();

        if (!pid) {
          return `No dev server found on port ${port}`;
        }

        // Kill the process
        const killResponse = await fetch(`${this.mcpServerUrl}/api/tools/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: 'execute_command',
            arguments: {
              command: `kill -9 ${pid}`,
              workingDir: workingDir || this.workspaceRoot,
            },
          }),
        });

        if (!killResponse.ok) {
          return `Failed to kill process ${pid}`;
        }

        // Remove from terminals map if exists
        for (const [id, term] of this.terminals.entries()) {
          if (term.port === port && (!workingDir || term.workingDir === workingDir)) {
            this.terminals.delete(id);
            break;
          }
        }

        return `Dev server on port ${port} stopped successfully`;
      }

      return 'Either terminalId or port must be provided';
    } catch (error) {
      return `Failed to stop dev server: ${error.message}`;
    }
  }

  /**
   * Stop all running dev servers
   */
  private async stopAllDevServers(): Promise<string> {
    try {
      // Get list of terminals from MCP server
      const listResponse = await fetch(`${this.mcpServerUrl}/api/tools/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'terminal_list',
          arguments: {},
        }),
      });

      if (!listResponse.ok) {
        return 'Failed to list terminals';
      }

      const listResult = await listResponse.json();
      const terminalIds = listResult.result || [];

      if (terminalIds.length === 0) {
        return 'No dev servers running';
      }

      // Stop each terminal
      const results = await Promise.all(
        terminalIds.map(id => this.stopDevServer(id))
      );

      const stopped = results.filter(r => r.includes('successfully')).length;
      return `Stopped ${stopped} dev servers`;
    } catch (error) {
      return `Failed to stop dev servers: ${error.message}`;
    }
  }

  /**
   * Check if a dev server is running on a specific port
   */
  private async checkDevServer(port: number, workingDir?: string): Promise<string> {
    try {
      // Check in terminals map first
      for (const [id, terminal] of this.terminals.entries()) {
        if (terminal.port === port && (!workingDir || terminal.workingDir === workingDir)) {
          const uptime = Date.now() - terminal.startTime.getTime();
          const uptimeStr = this.formatUptime(uptime);
          return `Dev server running on port ${port}\nTerminal ID: ${id}\nCommand: ${terminal.command}\nUptime: ${uptimeStr}`;
        }
      }

      // Check using lsof
      const checkCmd = `lsof -ti:${port}`;
      const { stdout } = await this.execAsync(checkCmd, { cwd: workingDir || this.workspaceRoot });
      
      if (stdout.trim()) {
        return `Dev server running on port ${port} (PID: ${stdout.trim()})`;
      }

      return `Dev server not running on port ${port}`;
    } catch (error) {
      return `Dev server not running on port ${port}`;
    }
  }

  /**
   * List all running dev servers
   */
  private async listDevServers(): Promise<string> {
    try {
      // Get list of terminals from MCP server
      const listResponse = await fetch(`${this.mcpServerUrl}/api/tools/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'terminal_list',
          arguments: {},
        }),
      });

      if (!listResponse.ok) {
        return 'Failed to list terminals';
      }

      const listResult = await listResponse.json();
      const terminals = listResult.result || [];

      if (terminals.length === 0) {
        return 'No dev servers running';
      }

      let output = `Running dev servers (${terminals.length}):\n\n`;
      
      for (const terminal of terminals) {
        output += `Terminal ID: ${terminal.id}\n`;
        output += `Name: ${terminal.name}\n`;
        output += `Working Dir: ${terminal.cwd}\n\n`;
      }
      
      return output;
    } catch (error) {
      return `Failed to list dev servers: ${error.message}`;
    }
  }

  /**
   * Format uptime in human-readable format
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}