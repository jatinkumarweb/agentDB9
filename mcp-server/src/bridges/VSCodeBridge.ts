import axios from 'axios';
import { WebSocket } from 'ws';
import fs from 'fs/promises';
import path from 'path';
import { 
  Position, 
  Range, 
  VSCodeContext,
  CommandResult 
} from '@agentdb9/shared';
import { logger } from '../utils/logger';

export interface VSCodeConfig {
  host: string;
  port: number;
  timeout?: number;
  workspaceRoot?: string;
}

export class VSCodeBridge {
  private config: VSCodeConfig;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private workspaceRoot: string;

  constructor(config: VSCodeConfig) {
    this.config = {
      timeout: 30000,
      workspaceRoot: '/home/coder/workspace',
      ...config
    };
    this.workspaceRoot = this.config.workspaceRoot!;
  }

  public async connect(): Promise<void> {
    try {
      // Test HTTP connection to VS Code server
      const response = await axios.get(`http://${this.config.host}:${this.config.port}/`, {
        timeout: this.config.timeout,
        validateStatus: (status) => status < 500 // Accept redirects and auth errors
      });
      
      if (response.status < 500) {
        this.isConnected = true;
        logger.info(`Connected to VS Code server at ${this.config.host}:${this.config.port}`);
        
        // Ensure workspace directory exists
        await this.ensureWorkspaceExists();
      }
    } catch (error) {
      logger.error('Failed to connect to VS Code server:', error);
      throw new Error('VS Code server not accessible');
    }
  }

  private async ensureWorkspaceExists(): Promise<void> {
    try {
      await fs.access(this.workspaceRoot);
    } catch (error) {
      // Workspace doesn't exist, create it
      await fs.mkdir(this.workspaceRoot, { recursive: true });
      logger.info(`Created workspace directory: ${this.workspaceRoot}`);
    }
  }

  public async executeCommand(command: string, args?: any[]): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // Use VS Code's command API
      const response = await axios.post(
        `http://${this.config.host}:${this.config.port}/api/commands/execute`,
        {
          command,
          arguments: args || []
        },
        {
          timeout: this.config.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to execute VS Code command ${command}:`, error);
      throw error;
    }
  }

  // File operations (direct file system access)
  public async createFile(filePath: string, content: string = ''): Promise<void> {
    const fullPath = path.resolve(this.workspaceRoot, filePath);
    const dir = path.dirname(fullPath);
    
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, content, 'utf8');
    logger.info(`Created file: ${filePath}`);
  }

  public async readFile(filePath: string): Promise<string> {
    const fullPath = path.resolve(this.workspaceRoot, filePath);
    const content = await fs.readFile(fullPath, 'utf8');
    return content;
  }

  public async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.resolve(this.workspaceRoot, filePath);
    const dir = path.dirname(fullPath);
    
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, content, 'utf8');
    logger.info(`Updated file: ${filePath}`);
  }

  public async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.resolve(this.workspaceRoot, filePath);
    await fs.unlink(fullPath);
    logger.info(`Deleted file: ${filePath}`);
  }

  public async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.resolve(this.workspaceRoot, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  public async getActiveFile(): Promise<string | null> {
    const result = await this.executeCommand('workbench.action.files.getActiveFile');
    return result?.path || null;
  }

  public async getSelection(): Promise<string | null> {
    const result = await this.executeCommand('editor.action.getSelection');
    return result?.text || null;
  }

  public async getCursorPosition(): Promise<Position> {
    const result = await this.executeCommand('editor.action.getCursorPosition');
    return result || { line: 0, character: 0 };
  }

  public async setCursorPosition(position: Position): Promise<void> {
    return this.executeCommand('editor.action.setCursorPosition', [position]);
  }

  public async selectRange(range: Range): Promise<void> {
    return this.executeCommand('editor.action.selectRange', [range]);
  }

  // Workspace operations
  public async getWorkspaceRoot(): Promise<string> {
    return this.workspaceRoot;
  }

  public async listFiles(directory: string = '.'): Promise<string[]> {
    const fullPath = path.resolve(this.workspaceRoot, directory);
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isFile())
        .map(entry => path.join(directory, entry.name));
    } catch (error) {
      logger.warn(`Failed to list files in ${directory}:`, error);
      return [];
    }
  }

  public async listDirectories(directory: string = '.'): Promise<string[]> {
    const fullPath = path.resolve(this.workspaceRoot, directory);
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(directory, entry.name));
    } catch (error) {
      logger.warn(`Failed to list directories in ${directory}:`, error);
      return [];
    }
  }

  public async createDirectory(dirPath: string): Promise<void> {
    const fullPath = path.resolve(this.workspaceRoot, dirPath);
    await fs.mkdir(fullPath, { recursive: true });
    logger.info(`Created directory: ${dirPath}`);
  }

  public async deleteDirectory(dirPath: string): Promise<void> {
    const fullPath = path.resolve(this.workspaceRoot, dirPath);
    await fs.rmdir(fullPath, { recursive: true });
    logger.info(`Deleted directory: ${dirPath}`);
  }

  public async getConfiguration(section?: string): Promise<any> {
    return this.executeCommand('workspace.getConfiguration', [section]);
  }

  public async updateConfiguration(section: string, value: any, global?: boolean): Promise<void> {
    return this.executeCommand('workspace.updateConfiguration', [section, value, global]);
  }

  // Terminal operations
  public async createTerminal(name: string, cwd?: string): Promise<string> {
    const result = await this.executeCommand('workbench.action.terminal.new', [{ name, cwd }]);
    return result?.id || 'default';
  }

  public async sendText(terminalId: string, text: string, addNewLine?: boolean): Promise<void> {
    return this.executeCommand('workbench.action.terminal.sendSequence', [
      { terminalId, text: addNewLine !== false ? text + '\\n' : text }
    ]);
  }

  public async getActiveTerminal(): Promise<string | null> {
    const result = await this.executeCommand('workbench.action.terminal.getActive');
    return result?.id || null;
  }

  public async showTerminal(terminalId: string): Promise<void> {
    return this.executeCommand('workbench.action.terminal.show', [terminalId]);
  }

  public async disposeTerminal(terminalId: string): Promise<void> {
    return this.executeCommand('workbench.action.terminal.dispose', [terminalId]);
  }

  // UI operations
  public async showQuickPick(items: string[], options?: any): Promise<string | null> {
    const result = await this.executeCommand('workbench.action.quickOpen', [{ items, ...options }]);
    return result?.selected || null;
  }

  public async showInputBox(options?: any): Promise<string | null> {
    const result = await this.executeCommand('workbench.action.showInputBox', [options]);
    return result?.value || null;
  }

  public async showInformationMessage(message: string, ...items: string[]): Promise<string | null> {
    const result = await this.executeCommand('window.showInformationMessage', [message, ...items]);
    return result?.selected || null;
  }

  public async showWarningMessage(message: string, ...items: string[]): Promise<string | null> {
    const result = await this.executeCommand('window.showWarningMessage', [message, ...items]);
    return result?.selected || null;
  }

  public async showErrorMessage(message: string, ...items: string[]): Promise<string | null> {
    const result = await this.executeCommand('window.showErrorMessage', [message, ...items]);
    return result?.selected || null;
  }

  // Extension operations
  public async installExtension(extensionId: string): Promise<void> {
    return this.executeCommand('workbench.extensions.installExtension', [extensionId]);
  }

  public async uninstallExtension(extensionId: string): Promise<void> {
    return this.executeCommand('workbench.extensions.uninstallExtension', [extensionId]);
  }

  public async listExtensions(): Promise<any[]> {
    const result = await this.executeCommand('workbench.extensions.getInstalled');
    return result || [];
  }

  public async isExtensionInstalled(extensionId: string): Promise<boolean> {
    const extensions = await this.listExtensions();
    return extensions.some((ext: any) => ext.id === extensionId);
  }

  // Context operations
  public async getContext(): Promise<VSCodeContext> {
    const [version, extensions, settings, activeEditor] = await Promise.all([
      this.executeCommand('workbench.action.getVersion'),
      this.listExtensions(),
      this.getConfiguration(),
      this.getActiveEditorInfo()
    ]);

    return {
      version: version || 'unknown',
      extensions: extensions.map((ext: any) => ext.id),
      settings: settings || {},
      activeEditor
    };
  }

  private async getActiveEditorInfo(): Promise<any> {
    try {
      const [file, selection] = await Promise.all([
        this.getActiveFile(),
        this.getSelection()
      ]);

      if (!file) return undefined;

      return {
        file,
        language: this.getLanguageFromFile(file),
        selection: selection ? await this.getSelectionRange() : undefined
      };
    } catch (error) {
      logger.warn('Failed to get active editor info:', error);
      return undefined;
    }
  }

  private async getSelectionRange(): Promise<any> {
    try {
      return await this.executeCommand('editor.action.getSelectionRange');
    } catch (error) {
      return undefined;
    }
  }

  private getLanguageFromFile(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'tsx': 'typescriptreact',
      'jsx': 'javascriptreact',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'shellscript',
      'bash': 'shellscript',
      'zsh': 'shellscript',
      'fish': 'shellscript'
    };

    return languageMap[ext || ''] || 'plaintext';
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public getConfig(): VSCodeConfig {
    return this.config;
  }
}