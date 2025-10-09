// Model Context Protocol (MCP) types for VSCode integration
import type { AgentExecutionContext, GitStatus, CommandResult, DirectoryEntry } from './agent';

export interface MCPServer {
  id: string;
  name: string;
  version: string;
  capabilities: MCPCapabilities;
  status: 'connected' | 'disconnected' | 'error';
}

export interface MCPCapabilities {
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any; // JSON Schema
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description: string;
  required: boolean;
}

// VSCode MCP Tools
export interface VSCodeMCPTools {
  editor: EditorTools;
  workspace: WorkspaceTools;
  terminal: TerminalTools;
  git: GitTools;
  files: FileTools;
}

export interface EditorTools {
  openFile(path: string): Promise<void>;
  closeFile(path: string): Promise<void>;
  insertText(text: string, position?: Position): Promise<void>;
  replaceText(range: Range, text: string): Promise<void>;
  deleteText(range: Range): Promise<void>;
  formatDocument(path?: string): Promise<void>;
  organizeImports(path?: string): Promise<void>;
  getActiveFile(): Promise<string | null>;
  getOpenFiles(): Promise<string[]>;
  getSelection(): Promise<string | null>;
  getCursorPosition(): Promise<Position>;
  setCursorPosition(position: Position): Promise<void>;
  selectRange(range: Range): Promise<void>;
  showQuickPick(items: string[], options?: QuickPickOptions): Promise<string | null>;
  showInputBox(options?: InputBoxOptions): Promise<string | null>;
}

export interface WorkspaceTools {
  getWorkspaceRoot(): Promise<string>;
  findFiles(pattern: string, exclude?: string): Promise<string[]>;
  getWorkspaceFolders(): Promise<string[]>;
  openFolder(path: string): Promise<void>;
  reloadWindow(): Promise<void>;
  executeCommand(command: string, ...args: any[]): Promise<any>;
  getConfiguration(section?: string): Promise<any>;
  updateConfiguration(section: string, value: any, global?: boolean): Promise<void>;
}

export interface TerminalTools {
  createTerminal(name: string, cwd?: string): Promise<string>;
  sendText(terminalId: string, text: string, addNewLine?: boolean): Promise<void>;
  executeCommand(command: string, cwd?: string): Promise<CommandResult>;
  getActiveTerminal(): Promise<string | null>;
  showTerminal(terminalId: string): Promise<void>;
  disposeTerminal(terminalId: string): Promise<void>;
  listTerminals(): Promise<TerminalInfo[]>;
}

export interface GitTools {
  getStatus(): Promise<GitStatus>;
  add(files: string[]): Promise<void>;
  commit(message: string): Promise<void>;
  push(remote?: string, branch?: string): Promise<void>;
  pull(remote?: string, branch?: string): Promise<void>;
  checkout(branch: string): Promise<void>;
  createBranch(name: string): Promise<void>;
  getBranches(): Promise<string[]>;
  getCurrentBranch(): Promise<string>;
  getDiff(file?: string): Promise<string>;
  getLog(limit?: number): Promise<GitCommit[]>;
}

export interface FileTools {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  createFile(path: string, content?: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  renameFile(oldPath: string, newPath: string): Promise<void>;
  copyFile(source: string, destination: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  deleteDirectory(path: string, recursive?: boolean): Promise<void>;
  exists(path: string): Promise<boolean>;
  isDirectory(path: string): Promise<boolean>;
  isFile(path: string): Promise<boolean>;
  getFileStats(path: string): Promise<FileStats>;
  listDirectory(path: string): Promise<DirectoryEntry[]>;
  watchFile(path: string, callback: (event: FileWatchEvent) => void): Promise<string>;
  unwatchFile(watchId: string): Promise<void>;
}

// Supporting types
export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface QuickPickOptions {
  placeholder?: string;
  canPickMany?: boolean;
  ignoreFocusOut?: boolean;
}

export interface InputBoxOptions {
  placeholder?: string;
  prompt?: string;
  value?: string;
  password?: boolean;
  ignoreFocusOut?: boolean;
}

// CommandResult is imported from ./agent

export interface TerminalInfo {
  id: string;
  name: string;
  cwd: string;
  active: boolean;
}

// Import GitCommit from context to avoid duplication
import type { GitCommit } from './context';
export type { GitCommit };

export interface FileStats {
  size: number;
  created: Date;
  modified: Date;
  isDirectory: boolean;
  isFile: boolean;
  permissions: string;
}

// DirectoryEntry is imported from ./agent

export interface FileWatchEvent {
  type: 'created' | 'modified' | 'deleted';
  path: string;
  timestamp: Date;
}

// MCP Request/Response types
export interface MCPRequest {
  id: string;
  method: string;
  params?: any;
}

export interface MCPResponse {
  id: string;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPNotification {
  method: string;
  params?: any;
}

// Tool execution types
export interface ToolExecutionRequest {
  tool: string;
  parameters: Record<string, any>;
  context?: AgentExecutionContext;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
  metadata?: Record<string, any>;
}

// Agent-specific MCP integration
export interface AgentMCPSession {
  agentId: string;
  sessionId: string;
  server: MCPServer;
  tools: VSCodeMCPTools;
  status: 'active' | 'inactive' | 'error';
  createdAt: Date;
  lastUsedAt: Date;
}

// AgentExecutionContext is imported from ./agent