// Core coding agent types and interfaces

export interface CodingAgent {
  id: string;
  name: string;
  description?: string;
  userId: string;
  projectId?: string;
  configuration: AgentConfiguration;
  status: AgentStatus;
  capabilities: AgentCapability[];
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
}

export interface AgentConfiguration {
  llmProvider: 'ollama' | 'openai' | 'anthropic' | 'cohere';
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  codeStyle: CodeStylePreferences;
  autoSave: boolean;
  autoFormat: boolean;
  autoTest: boolean;
}

export interface CodeStylePreferences {
  indentSize: number;
  indentType: 'spaces' | 'tabs';
  lineLength: number;
  semicolons: boolean;
  quotes: 'single' | 'double';
  trailingCommas: boolean;
  bracketSpacing: boolean;
  arrowParens: 'always' | 'avoid';
}

export type AgentStatus = 'idle' | 'thinking' | 'coding' | 'testing' | 'error' | 'offline';

export interface AgentCapability {
  type: 'code-generation' | 'code-modification' | 'code-refactoring' | 'debugging' | 'testing' | 'documentation' | 'architecture-design';
  enabled: boolean;
  confidence: number; // 0-1
}

export interface CodeTask {
  id: string;
  agentId: string;
  type: 'generate' | 'modify' | 'refactor' | 'debug' | 'test' | 'document';
  language: string;
  description: string;
  context: CodeTaskContext;
  status: TaskStatus;
  result?: CodeTaskResult;
  createdAt: Date;
  completedAt?: Date;
}

export interface CodeTaskContext {
  existingFiles: string[];
  dependencies: string[];
  constraints: string[];
  targetFile?: string;
  selectedCode?: string;
  cursorPosition?: { line: number; character: number };
  projectStructure?: ProjectStructure;
}

export interface ProjectStructure {
  root: string;
  files: string[];
  directories: string[];
  packageJson?: any;
  tsconfig?: any;
  gitignore?: string[];
  framework?: string;
  language: string;
}

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';

export interface CodeTaskResult {
  success: boolean;
  generatedCode?: string;
  modifiedFiles?: FileModification[];
  explanation?: string;
  suggestions?: string[];
  error?: string;
  testResults?: TestResult[];
}

export interface FileModification {
  path: string;
  action: 'create' | 'update' | 'delete';
  content?: string;
  changes?: CodeChange[];
}

export interface CodeChange {
  type: 'insert' | 'delete' | 'replace';
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  text: string;
}

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
}

// Chat and conversation types
export interface AgentConversation {
  id: string;
  agentId: string;
  userId: string;
  projectId?: string;
  title: string;
  messages: ConversationMessage[];
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: string; // Allow any string for flexible role definitions
  content: string;
  metadata?: MessageMetadata;
  timestamp: Date;
}

export interface MessageMetadata {
  codeBlocks?: CodeBlock[];
  fileReferences?: string[];
  taskId?: string;
  executionTime?: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
  startLine?: number;
  endLine?: number;
}

// Agent creation and management
export interface CreateAgentRequest {
  name: string;
  description?: string;
  projectId?: string;
  configuration: Partial<AgentConfiguration>;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  configuration?: Partial<AgentConfiguration>;
  capabilities?: AgentCapability[];
}

// Agent execution context
export interface AgentExecutionContext {
  agent: CodingAgent;
  project?: Project;
  workspace: WorkspaceInfo;
  vscode: VSCodeContext;
}

export interface WorkspaceInfo {
  root: string;
  files: string[];
  openFiles: string[];
  activeFile?: string;
  gitBranch?: string;
  gitStatus?: GitStatus;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
}

// Additional types needed by API
export interface ProjectFile {
  path: string;
  content: string;
  language?: string;
  size: number;
  lastModified: Date;
}

export interface CodeContext {
  file: string;
  language: string;
  content: string;
  selection?: Range;
  cursor?: Position;
}

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface DirectoryEntry {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  lastModified?: Date;
}

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  duration: number;
}

export interface VSCodeContext {
  version: string;
  extensions: string[];
  settings: Record<string, any>;
  activeEditor?: {
    file: string;
    language: string;
    selection?: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
  };
}

// Project and repository types
export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  repositoryUrl?: string;
  localPath?: string;
  framework?: string;
  language: string;
  status: ProjectStatus;
  agents: string[]; // agent IDs
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectStatus = 'active' | 'archived' | 'template';

export interface CreateProjectRequest {
  name: string;
  description?: string;
  repositoryUrl?: string;
  template?: string;
  framework?: string;
  language: string;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}