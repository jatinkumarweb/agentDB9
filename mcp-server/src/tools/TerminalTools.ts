import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MCPTool, CommandResult, TerminalInfo } from '@agentdb9/shared';
import { logger } from '../utils/logger';

// Conditional import for node-pty (may not be available in all environments)
let pty: any;
try {
  pty = require('node-pty');
} catch (error) {
  logger.warn('node-pty not available, terminal features will be limited');
  pty = null;
}

export interface Terminal {
  id: string;
  name: string;
  cwd: string;
  process: any; // pty.IPty when available
  active: boolean;
}

export class TerminalTools {
  private terminals = new Map<string, Terminal>();
  private nextTerminalId = 1;
  private terminalLogPath: string;
  private terminalLogStream: fs.FileHandle | null = null;
  private terminalLogInitialized = false;

  constructor() {
    // Use Gitpod workspace if available, otherwise use WORKSPACE_PATH env var or default
    const workspacePath = process.env.GITPOD_REPO_ROOT || process.env.WORKSPACE_PATH || '/workspace';
    this.terminalLogPath = `${workspacePath}/.agent-terminal.log`;
    logger.info(`Terminal log path: ${this.terminalLogPath}`);
  }

  private async ensureTerminalLogInitialized(): Promise<void> {
    if (this.terminalLogInitialized) {
      return;
    }

    try {
      // Check if file exists
      try {
        await fs.access(this.terminalLogPath);
        this.terminalLogInitialized = true;
        return;
      } catch {
        // File doesn't exist, create it
      }

      const header = 
        '\x1b[1;35m' +
        '╔════════════════════════════════════════════════════════════════════════════════╗\n' +
        '║                           🤖 AGENT TERMINAL LOG                               ║\n' +
        '║                                                                                ║\n' +
        '║  This file shows all commands executed by the AI agent.                       ║\n' +
        '║  Commands are executed in the MCP server container with access to workspace.  ║\n' +
        '║  Output is streamed in real-time as commands execute.                         ║\n' +
        '╚════════════════════════════════════════════════════════════════════════════════╝\n' +
        '\x1b[0m\n' +
        `\x1b[1;90mLog started: ${new Date().toISOString()}\x1b[0m\n\n`;
      
      await fs.writeFile(this.terminalLogPath, header);
      this.terminalLogInitialized = true;
      logger.info(`Initialized agent terminal log at ${this.terminalLogPath}`);
    } catch (error) {
      logger.error('Failed to initialize terminal log:', error);
    }
  }

  public getTools(): MCPTool[] {
    return [
      {
        name: 'terminal_execute',
        description: 'Execute a command in the terminal and return the result',
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
            cwd: { type: 'string', description: 'Working directory for the command' },
            timeout: { type: 'number', description: 'Timeout in milliseconds', default: 30000 },
            shell: { type: 'string', description: 'Shell to use', default: '/bin/sh' }
          },
          required: ['command']
        }
      },
      {
        name: 'terminal_create',
        description: 'Create a new terminal session',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name for the terminal' },
            cwd: { type: 'string', description: 'Working directory for the terminal' },
            shell: { type: 'string', description: 'Shell to use', default: '/bin/sh' }
          },
          required: ['name']
        }
      },
      {
        name: 'terminal_send_text',
        description: 'Send text to a terminal session',
        inputSchema: {
          type: 'object',
          properties: {
            terminalId: { type: 'string', description: 'Terminal ID' },
            text: { type: 'string', description: 'Text to send' },
            addNewLine: { type: 'boolean', description: 'Whether to add a newline', default: true }
          },
          required: ['terminalId', 'text']
        }
      },
      {
        name: 'terminal_list',
        description: 'List all active terminal sessions',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'terminal_get_active',
        description: 'Get the active terminal session',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'terminal_set_active',
        description: 'Set a terminal as active',
        inputSchema: {
          type: 'object',
          properties: {
            terminalId: { type: 'string', description: 'Terminal ID to set as active' }
          },
          required: ['terminalId']
        }
      },
      {
        name: 'terminal_dispose',
        description: 'Dispose of a terminal session',
        inputSchema: {
          type: 'object',
          properties: {
            terminalId: { type: 'string', description: 'Terminal ID to dispose' }
          },
          required: ['terminalId']
        }
      },
      {
        name: 'terminal_resize',
        description: 'Resize a terminal session',
        inputSchema: {
          type: 'object',
          properties: {
            terminalId: { type: 'string', description: 'Terminal ID' },
            cols: { type: 'number', description: 'Number of columns' },
            rows: { type: 'number', description: 'Number of rows' }
          },
          required: ['terminalId', 'cols', 'rows']
        }
      },
      {
        name: 'terminal_clear',
        description: 'Clear a terminal session',
        inputSchema: {
          type: 'object',
          properties: {
            terminalId: { type: 'string', description: 'Terminal ID to clear' }
          },
          required: ['terminalId']
        }
      }
    ];
  }

  private async logToTerminal(message: string): Promise<void> {
    try {
      const logPath = this.terminalLogPath;
      await fs.appendFile(logPath, message);
    } catch (error) {
      logger.error('Failed to write to terminal log:', error);
    }
  }

  private formatTerminalHeader(command: string, cwd: string): string {
    const timestamp = new Date().toISOString();
    const separator = '═'.repeat(80);
    return `\n${separator}\n` +
           `\x1b[1;36m[${timestamp}]\x1b[0m \x1b[1;32mAgent Terminal\x1b[0m\n` +
           `\x1b[1;33mCommand:\x1b[0m ${command}\n` +
           `\x1b[1;33mDirectory:\x1b[0m ${cwd}\n` +
           `${separator}\n\n`;
  }

  private formatTerminalFooter(exitCode: number, duration: number): string {
    const separator = '─'.repeat(80);
    const status = exitCode === 0 
      ? '\x1b[1;32m✓ SUCCESS\x1b[0m' 
      : `\x1b[1;31m✗ FAILED (exit code: ${exitCode})\x1b[0m`;
    return `\n${separator}\n` +
           `${status} \x1b[1;90m(${duration}ms)\x1b[0m\n` +
           `${separator}\n\n`;
  }

  /**
   * Check if a command is a dev server command that runs indefinitely
   */
  private isDevServerCommand(command: string): boolean {
    const devServerPatterns = [
      /npm\s+(run\s+)?(dev|start|serve)/,
      /yarn\s+(run\s+)?(dev|start|serve)/,
      /pnpm\s+(run\s+)?(dev|start|serve)/,
      /vite(\s|$)/,
      /next\s+dev/,
      /react-scripts\s+start/,
      /ng\s+serve/,
      /vue-cli-service\s+serve/,
      /webpack-dev-server/,
      /parcel(\s|$)/
    ];
    
    return devServerPatterns.some(pattern => pattern.test(command));
  }

  public async executeCommand(
    command: string, 
    cwd?: string, 
    timeout: number = 30000,
    shell: string = '/bin/sh'
  ): Promise<CommandResult> {
    // Check if this is a dev server command
    if (this.isDevServerCommand(command)) {
      logger.info(`Detected dev server command: ${command}`);
      return this.executeDevServer(command, cwd, shell);
    }
    
    const startTime = Date.now();
    
    return new Promise(async (resolve) => {
      let output = '';
      let error = '';
      let exitCode = 0;
      let timedOut = false;

      // Use workspace directory if no cwd specified
      const workingDir = cwd || process.env.GITPOD_REPO_ROOT || process.env.WORKSPACE_PATH || '/workspace';
      
      // Prepare environment variables
      const env = { ...process.env };
      // Remove PORT to avoid conflicts with Next.js
      delete env.PORT;
      // Set proper Node environment
      env.NODE_ENV = 'development';
      
      const options: any = {
        cwd: workingDir,
        // Don't use shell: true when explicitly spawning a shell
        // This causes issues with npm and other commands
        env
      };

      logger.info(`Executing command: ${command}`, { cwd: options.cwd });

      // Ensure terminal log is initialized
      await this.ensureTerminalLogInitialized();

      // Log command start to terminal log
      await this.logToTerminal(this.formatTerminalHeader(command, workingDir));

      const child: ChildProcess = spawn(shell, ['-c', command], options);

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 5000);
      }, timeout);

      child.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        // Stream to terminal log in real-time
        this.logToTerminal(text).catch(err => 
          logger.error('Failed to stream stdout to terminal log:', err)
        );
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        error += text;
        // Stream stderr with red color
        this.logToTerminal(`\x1b[1;31m${text}\x1b[0m`).catch(err => 
          logger.error('Failed to stream stderr to terminal log:', err)
        );
      });

      child.on('close', async (code) => {
        clearTimeout(timeoutHandle);
        exitCode = code || 0;
        
        const duration = Date.now() - startTime;
        const success = !timedOut && exitCode === 0;
        
        // Log command completion to terminal log
        await this.logToTerminal(this.formatTerminalFooter(exitCode, duration));
        
        const result: CommandResult = {
          success,
          output: output.trim(),
          error: timedOut ? 'Command timed out' : error.trim(),
          exitCode,
          duration
        };

        logger.info(`Command completed: ${command}`, { 
          success, 
          exitCode, 
          duration,
          outputLength: output.length,
          errorLength: error.length
        });

        resolve(result);
      });

      child.on('error', (err) => {
        clearTimeout(timeoutHandle);
        const duration = Date.now() - startTime;
        
        const result: CommandResult = {
          success: false,
          output: output.trim(),
          error: err.message,
          exitCode: -1,
          duration
        };

        logger.error(`Command failed: ${command}`, err);
        resolve(result);
      });
    });
  }

  /**
   * Execute a dev server command in a persistent terminal
   * Returns immediately without waiting for the process to exit
   */
  private async executeDevServer(
    command: string,
    cwd?: string,
    shell: string = '/bin/sh'
  ): Promise<CommandResult> {
    const startTime = Date.now();
    const workingDir = cwd || process.env.GITPOD_REPO_ROOT || process.env.WORKSPACE_PATH || '/workspace';
    
    try {
      // Log command start
      await this.ensureTerminalLogInitialized();
      await this.logToTerminal(this.formatTerminalHeader(command, workingDir));
      await this.logToTerminal(`\x1b[1;33m⚠️  Dev server detected - running in background\x1b[0m\n\n`);
      
      // Prepare environment
      const env = { ...process.env };
      delete env.PORT; // Avoid port conflicts
      env.NODE_ENV = 'development';
      
      const options: any = {
        cwd: workingDir,
        env,
        detached: true, // Run in background
        stdio: ['ignore', 'pipe', 'pipe'] // Capture output
      };
      
      logger.info(`Starting dev server in background: ${command}`, { cwd: workingDir });
      
      // Start the process in background
      const child: ChildProcess = spawn(shell, ['-c', command], options);
      
      // Capture initial output for a few seconds
      let output = '';
      let error = '';
      
      const outputHandler = (data: Buffer) => {
        const text = data.toString();
        output += text;
        this.logToTerminal(text).catch(err => 
          logger.error('Failed to stream stdout:', err)
        );
      };
      
      const errorHandler = (data: Buffer) => {
        const text = data.toString();
        error += text;
        this.logToTerminal(`\x1b[1;31m${text}\x1b[0m`).catch(err => 
          logger.error('Failed to stream stderr:', err)
        );
      };
      
      child.stdout?.on('data', outputHandler);
      child.stderr?.on('data', errorHandler);
      
      // Wait for initial startup (3 seconds)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if process is still running
      const isRunning = child.pid && !child.killed;
      
      if (!isRunning) {
        // Process died immediately - probably an error
        const duration = Date.now() - startTime;
        await this.logToTerminal(this.formatTerminalFooter(1, duration));
        
        return {
          success: false,
          output: output.trim(),
          error: error.trim() || 'Dev server failed to start',
          exitCode: 1,
          duration
        };
      }
      
      // Process is running - detach and return success
      child.unref(); // Allow parent to exit without waiting
      
      const duration = Date.now() - startTime;
      const successMessage = 
        `\x1b[1;32m✓ Dev server started successfully\x1b[0m\n` +
        `\x1b[1;90mPID: ${child.pid}\x1b[0m\n` +
        `\x1b[1;90mRunning in background...\x1b[0m\n\n`;
      
      await this.logToTerminal(successMessage);
      await this.logToTerminal(this.formatTerminalFooter(0, duration));
      
      // Store terminal info for management
      const terminalId = `dev-server-${child.pid}`;
      
      logger.info(`Dev server started successfully`, { 
        pid: child.pid, 
        command, 
        cwd: workingDir 
      });
      
      return {
        success: true,
        output: output.trim() + '\n\n' +
                `Dev server started in background (PID: ${child.pid})\n` +
                `Command: ${command}\n` +
                `Working directory: ${workingDir}\n\n` +
                `The server is running and will continue in the background.\n` +
                `Check the terminal log for output: ${this.terminalLogPath}\n` +
                `Use 'stop_dev_server' tool with port number to stop it.`,
        error: error.trim(),
        exitCode: 0,
        duration
      };
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      await this.logToTerminal(`\x1b[1;31mERROR: ${errorMessage}\x1b[0m\n`);
      await this.logToTerminal(this.formatTerminalFooter(1, duration));
      
      logger.error(`Failed to start dev server: ${command}`, err);
      
      return {
        success: false,
        output: '',
        error: errorMessage,
        exitCode: 1,
        duration
      };
    }
  }

  public async createTerminal(
    name: string, 
    cwd?: string, 
    shell: string = '/bin/bash'
  ): Promise<string> {
    try {
      if (!pty) {
        throw new Error('node-pty not available - cannot create terminal');
      }
      
      const terminalId = `terminal_${this.nextTerminalId++}`;
      
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: cwd || process.cwd(),
        env: process.env as { [key: string]: string }
      });

      const terminal: Terminal = {
        id: terminalId,
        name,
        cwd: cwd || process.cwd(),
        process: ptyProcess,
        active: this.terminals.size === 0 // First terminal is active
      };

      // Set up data handler
      ptyProcess.onData((data: any) => {
        // Handle terminal output if needed
        logger.debug(`Terminal ${terminalId} output:`, data);
      });

      ptyProcess.onExit((exitCode: any) => {
        logger.info(`Terminal ${terminalId} exited with code ${exitCode}`);
        this.terminals.delete(terminalId);
      });

      this.terminals.set(terminalId, terminal);
      
      logger.info(`Created terminal: ${name} (ID: ${terminalId})`);
      return terminalId;
    } catch (error) {
      logger.error(`Failed to create terminal ${name}:`, error);
      throw new Error(`Failed to create terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async sendText(terminalId: string, text: string, addNewLine: boolean = true): Promise<void> {
    try {
      const terminal = this.terminals.get(terminalId);
      if (!terminal) {
        throw new Error(`Terminal ${terminalId} not found`);
      }

      const textToSend = addNewLine ? text + '\r' : text;
      terminal.process.write(textToSend);
      
      logger.info(`Sent text to terminal ${terminalId}: ${text}`);
    } catch (error) {
      logger.error(`Failed to send text to terminal ${terminalId}:`, error);
      throw new Error(`Failed to send text to terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async listTerminals(): Promise<TerminalInfo[]> {
    const terminals: TerminalInfo[] = [];
    
    for (const terminal of this.terminals.values()) {
      terminals.push({
        id: terminal.id,
        name: terminal.name,
        cwd: terminal.cwd,
        active: terminal.active
      });
    }
    
    return terminals;
  }

  public async getActiveTerminal(): Promise<string | null> {
    for (const terminal of this.terminals.values()) {
      if (terminal.active) {
        return terminal.id;
      }
    }
    return null;
  }

  public async setActiveTerminal(terminalId: string): Promise<void> {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`Terminal ${terminalId} not found`);
    }

    // Deactivate all terminals
    for (const t of this.terminals.values()) {
      t.active = false;
    }

    // Activate the specified terminal
    terminal.active = true;
    
    logger.info(`Set terminal ${terminalId} as active`);
  }

  public async disposeTerminal(terminalId: string): Promise<void> {
    try {
      const terminal = this.terminals.get(terminalId);
      if (!terminal) {
        throw new Error(`Terminal ${terminalId} not found`);
      }

      terminal.process.kill();
      this.terminals.delete(terminalId);
      
      // If this was the active terminal, make another one active
      if (terminal.active && this.terminals.size > 0) {
        const firstTerminal = this.terminals.values().next().value;
        if (firstTerminal) {
          firstTerminal.active = true;
        }
      }
      
      logger.info(`Disposed terminal: ${terminalId}`);
    } catch (error) {
      logger.error(`Failed to dispose terminal ${terminalId}:`, error);
      throw new Error(`Failed to dispose terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async resizeTerminal(terminalId: string, cols: number, rows: number): Promise<void> {
    try {
      const terminal = this.terminals.get(terminalId);
      if (!terminal) {
        throw new Error(`Terminal ${terminalId} not found`);
      }

      terminal.process.resize(cols, rows);
      logger.info(`Resized terminal ${terminalId} to ${cols}x${rows}`);
    } catch (error) {
      logger.error(`Failed to resize terminal ${terminalId}:`, error);
      throw new Error(`Failed to resize terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async clearTerminal(terminalId: string): Promise<void> {
    try {
      const terminal = this.terminals.get(terminalId);
      if (!terminal) {
        throw new Error(`Terminal ${terminalId} not found`);
      }

      // Send clear command
      terminal.process.write('clear\r');
      logger.info(`Cleared terminal: ${terminalId}`);
    } catch (error) {
      logger.error(`Failed to clear terminal ${terminalId}:`, error);
      throw new Error(`Failed to clear terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async cleanup(): Promise<void> {
    // Dispose all terminals
    for (const [terminalId] of this.terminals) {
      try {
        await this.disposeTerminal(terminalId);
      } catch (error) {
        logger.error(`Failed to dispose terminal ${terminalId} during cleanup:`, error);
      }
    }
  }

  public getTerminalCount(): number {
    return this.terminals.size;
  }

  public hasTerminal(terminalId: string): boolean {
    return this.terminals.has(terminalId);
  }
}