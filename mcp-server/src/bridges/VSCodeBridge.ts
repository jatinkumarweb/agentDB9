import axios from 'axios';
import { WebSocket } from 'ws';
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
}

export class VSCodeBridge {
  private config: VSCodeConfig;
  private ws: WebSocket | null = null;
  private isConnected = false;

  constructor(config: VSCodeConfig) {
    this.config = {
      timeout: 30000,
      ...config
    };
  }

  public async connect(): Promise<void> {
    try {
      // Test HTTP connection first
      const response = await axios.get(`http://${this.config.host}:${this.config.port}/`, {
        timeout: this.config.timeout
      });
      
      if (response.status === 200) {
        this.isConnected = true;
        logger.info(`Connected to VS Code server at ${this.config.host}:${this.config.port}`);
      }
    } catch (error) {
      logger.error('Failed to connect to VS Code server:', error);
      throw new Error('VS Code server not accessible');
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

  // Editor operations
  public async openFile(path: string): Promise<void> {
    return this.executeCommand('vscode.open', [{ path }]);
  }

  public async insertText(text: string, position?: Position): Promise<void> {
    return this.executeCommand('editor.action.insertText', [{ text, position }]);
  }

  public async replaceText(range: Range, text: string): Promise<void> {
    return this.executeCommand('editor.action.replaceText', [{ range, text }]);
  }

  public async formatDocument(path?: string): Promise<void> {
    if (path) {
      await this.openFile(path);
    }
    return this.executeCommand('editor.action.formatDocument');
  }

  public async organizeImports(path?: string): Promise<void> {
    if (path) {
      await this.openFile(path);
    }
    return this.executeCommand('editor.action.organizeImports');
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
    const result = await this.executeCommand('workspace.getWorkspaceFolder');
    return result?.uri?.fsPath || process.cwd();
  }

  public async findFiles(pattern: string, exclude?: string): Promise<string[]> {
    const result = await this.executeCommand('workspace.findFiles', [pattern, exclude]);
    return result?.map((file: any) => file.fsPath) || [];
  }

  public async getWorkspaceFolders(): Promise<string[]> {
    const result = await this.executeCommand('workspace.getWorkspaceFolders');
    return result?.map((folder: any) => folder.uri.fsPath) || [];
  }

  public async openFolder(path: string): Promise<void> {
    return this.executeCommand('vscode.openFolder', [{ path }]);
  }

  public async reloadWindow(): Promise<void> {
    return this.executeCommand('workbench.action.reloadWindow');
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