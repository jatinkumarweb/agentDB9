// API endpoint interfaces and types

// Agent Management API
export interface AgentAPI {
  // Agent CRUD operations
  createAgent(request: CreateAgentRequest): Promise<APIResponse<CodingAgent>>;
  getAgent(id: string): Promise<APIResponse<CodingAgent>>;
  updateAgent(id: string, request: UpdateAgentRequest): Promise<APIResponse<CodingAgent>>;
  deleteAgent(id: string): Promise<APIResponse<void>>;
  listAgents(userId: string): Promise<APIResponse<CodingAgent[]>>;
  
  // Agent execution
  executeTask(agentId: string, task: CodeTask): Promise<APIResponse<CodeTaskResult>>;
  getAgentStatus(agentId: string): Promise<APIResponse<AgentStatus>>;
  stopAgent(agentId: string): Promise<APIResponse<void>>;
}

// Project Management API
export interface ProjectAPI {
  createProject(request: CreateProjectRequest): Promise<APIResponse<Project>>;
  getProject(id: string): Promise<APIResponse<Project>>;
  updateProject(id: string, request: Partial<CreateProjectRequest>): Promise<APIResponse<Project>>;
  deleteProject(id: string): Promise<APIResponse<void>>;
  listProjects(userId: string): Promise<APIResponse<Project[]>>;
  
  // Project files
  getProjectFiles(projectId: string): Promise<APIResponse<ProjectFile[]>>;
  getFile(projectId: string, path: string): Promise<APIResponse<ProjectFile>>;
  updateFile(projectId: string, path: string, content: string): Promise<APIResponse<ProjectFile>>;
  createFile(projectId: string, path: string, content: string): Promise<APIResponse<ProjectFile>>;
  deleteFile(projectId: string, path: string): Promise<APIResponse<void>>;
}

// Conversation API
export interface ConversationAPI {
  createConversation(agentId: string, title?: string): Promise<APIResponse<AgentConversation>>;
  getConversation(id: string): Promise<APIResponse<AgentConversation>>;
  listConversations(agentId: string): Promise<APIResponse<AgentConversation[]>>;
  sendMessage(conversationId: string, content: string): Promise<APIResponse<ConversationMessage>>;
  getMessages(conversationId: string, limit?: number, offset?: number): Promise<APIResponse<ConversationMessage[]>>;
  deleteConversation(id: string): Promise<APIResponse<void>>;
}

// LLM Service API
export interface LLMServiceAPI {
  generateCode(request: CodeGenerationRequest): Promise<APIResponse<CodeGenerationResponse>>;
  analyzeCode(request: CodeAnalysisRequest): Promise<APIResponse<CodeAnalysisResponse>>;
  explainCode(request: CodeExplanationRequest): Promise<APIResponse<CodeExplanationResponse>>;
  reviewCode(request: CodeReviewRequest): Promise<APIResponse<CodeReviewResponse>>;
  generateTests(request: TestGenerationRequest): Promise<APIResponse<TestGenerationResponse>>;
  refactorCode(request: RefactorRequest): Promise<APIResponse<RefactorResponse>>;
  
  // Model management
  listModels(): Promise<APIResponse<ModelInfo[]>>;
  getModelStatus(modelId: string): Promise<APIResponse<ModelStatus>>;
}

// Vector Database API
export interface VectorAPI {
  indexCode(request: CodeIndexRequest): Promise<APIResponse<IndexResult>>;
  searchCode(request: CodeSearchRequest): Promise<APIResponse<CodeSearchResult[]>>;
  deleteIndex(projectId: string): Promise<APIResponse<void>>;
  getIndexStatus(projectId: string): Promise<APIResponse<IndexStatus>>;
}

// MCP Tools API
export interface MCPToolsAPI {
  executeVSCodeCommand(request: VSCodeCommandRequest): Promise<APIResponse<any>>;
  readFile(path: string): Promise<APIResponse<string>>;
  writeFile(path: string, content: string): Promise<APIResponse<void>>;
  createFile(path: string, content?: string): Promise<APIResponse<void>>;
  deleteFile(path: string): Promise<APIResponse<void>>;
  listFiles(directory: string): Promise<APIResponse<DirectoryEntry[]>>;
  
  // Editor operations
  openFile(path: string): Promise<APIResponse<void>>;
  insertText(text: string, position?: Position): Promise<APIResponse<void>>;
  replaceText(range: Range, text: string): Promise<APIResponse<void>>;
  formatDocument(path?: string): Promise<APIResponse<void>>;
  
  // Terminal operations
  executeCommand(command: string, cwd?: string): Promise<APIResponse<CommandResult>>;
  createTerminal(name: string, cwd?: string): Promise<APIResponse<string>>;
  
  // Git operations
  gitStatus(): Promise<APIResponse<GitStatus>>;
  gitAdd(files: string[]): Promise<APIResponse<void>>;
  gitCommit(message: string): Promise<APIResponse<void>>;
  gitPush(): Promise<APIResponse<void>>;
}

// Request/Response types
export interface CodeGenerationRequest {
  prompt: string;
  language: string;
  context?: CodeContext;
  style?: CodeStylePreferences;
  maxTokens?: number;
  temperature?: number;
}

export interface CodeGenerationResponse {
  code: string;
  explanation?: string;
  suggestions?: string[];
  confidence: number;
}

export interface CodeAnalysisRequest {
  code: string;
  language: string;
  analysisType: 'syntax' | 'performance' | 'security' | 'style' | 'all';
}

export interface CodeAnalysisResponse {
  issues: CodeIssue[];
  metrics: CodeMetrics;
  suggestions: string[];
}

export interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  category: 'syntax' | 'performance' | 'security' | 'style';
  message: string;
  line?: number;
  column?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CodeMetrics {
  linesOfCode: number;
  complexity: number;
  maintainabilityIndex: number;
  testCoverage?: number;
  duplicateLines?: number;
}

export interface CodeExplanationRequest {
  code: string;
  language: string;
  level: 'beginner' | 'intermediate' | 'advanced';
}

export interface CodeExplanationResponse {
  explanation: string;
  keyPoints: string[];
  examples?: CodeExample[];
}

export interface CodeExample {
  title: string;
  code: string;
  explanation: string;
}

export interface CodeReviewRequest {
  code: string;
  language: string;
  context?: string;
  focusAreas?: ('performance' | 'security' | 'maintainability' | 'style')[];
}

export interface CodeReviewResponse {
  overallRating: number; // 1-10
  issues: CodeIssue[];
  suggestions: ReviewSuggestion[];
  positiveAspects: string[];
}

export interface ReviewSuggestion {
  type: 'improvement' | 'refactor' | 'optimization';
  description: string;
  example?: string;
  impact: 'low' | 'medium' | 'high';
}

export interface TestGenerationRequest {
  code: string;
  language: string;
  testFramework?: string;
  testType: 'unit' | 'integration' | 'e2e';
}

export interface TestGenerationResponse {
  tests: GeneratedTest[];
  coverage: TestCoverage;
  suggestions: string[];
}

export interface GeneratedTest {
  name: string;
  code: string;
  description: string;
  type: 'unit' | 'integration' | 'e2e';
}

export interface TestCoverage {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

export interface RefactorRequest {
  code: string;
  language: string;
  refactorType: 'extract-method' | 'extract-class' | 'rename' | 'move' | 'inline' | 'optimize';
  target?: string; // specific element to refactor
}

export interface RefactorResponse {
  refactoredCode: string;
  changes: RefactorChange[];
  explanation: string;
  impact: RefactorImpact;
}

export interface RefactorChange {
  type: 'add' | 'remove' | 'modify';
  description: string;
  location: Range;
  oldCode?: string;
  newCode?: string;
}

export interface RefactorImpact {
  complexity: 'reduced' | 'same' | 'increased';
  readability: 'improved' | 'same' | 'degraded';
  performance: 'improved' | 'same' | 'degraded';
  maintainability: 'improved' | 'same' | 'degraded';
}

// Vector database types
export interface CodeIndexRequest {
  projectId: string;
  files: FileToIndex[];
  options?: IndexOptions;
}

export interface FileToIndex {
  path: string;
  content: string;
  language: string;
  metadata?: Record<string, any>;
}

export interface IndexOptions {
  chunkSize?: number;
  overlap?: number;
  includeComments?: boolean;
  includeTests?: boolean;
}

export interface IndexResult {
  projectId: string;
  indexedFiles: number;
  totalChunks: number;
  status: 'completed' | 'partial' | 'failed';
  errors?: string[];
}

export interface CodeSearchRequest {
  query: string;
  projectId?: string;
  language?: string;
  fileTypes?: string[];
  limit?: number;
  threshold?: number;
}

export interface CodeSearchResult {
  file: string;
  content: string;
  score: number;
  metadata: {
    language: string;
    startLine: number;
    endLine: number;
    function?: string;
    class?: string;
  };
}

export interface IndexStatus {
  projectId: string;
  status: 'indexing' | 'completed' | 'failed' | 'not_found';
  progress?: number; // 0-100
  totalFiles?: number;
  indexedFiles?: number;
  lastUpdated?: Date;
}

// Model information
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  capabilities: string[];
  maxTokens: number;
  costPer1kTokens?: number;
  available: boolean;
}

export interface ModelStatus {
  id: string;
  status: 'available' | 'unavailable' | 'loading' | 'error';
  health: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  errorRate?: number;
  lastChecked: Date;
}

// VSCode command types
export interface VSCodeCommandRequest {
  command: string;
  arguments?: any[];
  timeout?: number;
}

// WebSocket event types
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface AgentStatusEvent extends WebSocketEvent {
  type: 'agent_status';
  data: {
    agentId: string;
    status: AgentStatus;
    message?: string;
  };
}

export interface TaskProgressEvent extends WebSocketEvent {
  type: 'task_progress';
  data: {
    taskId: string;
    progress: number; // 0-100
    stage: string;
    message?: string;
  };
}

export interface CodeGenerationEvent extends WebSocketEvent {
  type: 'code_generation';
  data: {
    taskId: string;
    chunk: string;
    isComplete: boolean;
  };
}

export interface FileChangeEvent extends WebSocketEvent {
  type: 'file_change';
  data: {
    path: string;
    action: 'created' | 'modified' | 'deleted';
    content?: string;
  };
}

// Import required types
import { 
  CodingAgent, 
  CreateAgentRequest, 
  UpdateAgentRequest, 
  CodeTask, 
  CodeTaskResult, 
  AgentStatus,
  Project,
  CreateProjectRequest,
  ProjectFile,
  AgentConversation,
  ConversationMessage,
  APIResponse,
  CodeContext,
  CodeStylePreferences,
  Position,
  Range,
  DirectoryEntry,
  CommandResult,
  GitStatus
} from './agent';