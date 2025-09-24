// VS Code integration types

export interface VSCodeBridge {
  editor: EditorAPI;
  workspace: WorkspaceAPI;
  terminal: TerminalAPI;
  extensions: ExtensionAPI;
}

export interface EditorAPI {
  openFile(path: string): Promise<void>;
  insertText(text: string, position?: Position): Promise<void>;
  replaceText(range: Range, text: string): Promise<void>;
  formatDocument(): Promise<void>;
  organizeImports(): Promise<void>;
  getActiveFile(): Promise<FileInfo | null>;
  getSelection(): Promise<string | null>;
  getCursorPosition(): Promise<Position>;
}

export interface WorkspaceAPI {
  findFiles(pattern: string): Promise<string[]>;
  createFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  renameFile(oldPath: string, newPath: string): Promise<void>;
  getWorkspaceRoot(): Promise<string>;
  watchFiles(pattern: string, callback: (event: FileEvent) => void): Promise<void>;
}

export interface TerminalAPI {
  create(name: string, cwd?: string): Promise<Terminal>;
  sendText(terminalId: string, text: string): Promise<void>;
  executeCommand(command: string): Promise<CommandResult>;
  getActiveTerminal(): Promise<Terminal | null>;
}

export interface ExtensionAPI {
  install(extensionId: string): Promise<void>;
  uninstall(extensionId: string): Promise<void>;
  list(): Promise<VSCodeExtension[]>;
  configure(extensionId: string, config: any): Promise<void>;
  isInstalled(extensionId: string): Promise<boolean>;
}

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface FileEvent {
  type: 'created' | 'modified' | 'deleted';
  path: string;
  timestamp: Date;
}

export interface Terminal {
  id: string;
  name: string;
  cwd: string;
  active: boolean;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}