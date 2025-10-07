import { spawn, ChildProcess } from 'child_process';
import * as pty from 'node-pty';
import { MCPTool, CommandResult, TerminalInfo } from '@agentdb9/shared';
import { logger } from '../utils/logger';

export interface Terminal {
  id: string;
  name: string;
  cwd: string;
  process: pty.IPty;
  active: boolean;
}

export class TerminalTools {
  private terminals = new Map<string, Terminal>();
  private nextTerminalId = 1;

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

  public async executeCommand(
    command: string, 
    cwd?: string, 
    timeout: number = 30000,
    shell: string = '/bin/sh'
  ): Promise<CommandResult> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      let output = '';
      let error = '';
      let exitCode = 0;
      let timedOut = false;

      const options: any = {
        cwd: cwd || process.cwd(),
        shell: true,
        env: { ...process.env }
      };

      logger.info(`Executing command: ${command}`, { cwd: options.cwd });

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
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeoutHandle);
        exitCode = code || 0;
        
        const duration = Date.now() - startTime;
        const success = !timedOut && exitCode === 0;
        
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

  public async createTerminal(
    name: string, 
    cwd?: string, 
    shell: string = '/bin/bash'
  ): Promise<string> {
    try {
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
      ptyProcess.onData((data) => {
        // Handle terminal output if needed
        logger.debug(`Terminal ${terminalId} output:`, data);
      });

      ptyProcess.onExit((exitCode) => {
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