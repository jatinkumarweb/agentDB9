// Agent execution context and session management types

import { CodingAgent, Project, WorkspaceInfo, VSCodeContext } from './agent';

/**
 * AgentContext provides session and project awareness for agent execution
 * This is the primary context object passed to agents during task execution
 */
export interface AgentContext {
  // Session information
  sessionId: string;
  userId: string;
  conversationId?: string;
  
  // Agent information
  agent: CodingAgent;
  
  // Project context
  project?: Project;
  projectId?: string;
  
  // Workspace state
  workspace: WorkspaceInfo;
  
  // VSCode integration
  vscode: VSCodeContext;
  
  // Execution metadata
  metadata: AgentContextMetadata;
  
  // Short-term memory (conversation history)
  conversationHistory: ConversationHistoryEntry[];
  
  // Long-term memory (project knowledge)
  projectKnowledge?: ProjectKnowledge;
}

/**
 * Metadata about the agent execution context
 */
export interface AgentContextMetadata {
  // Timestamp when context was created
  createdAt: Date;
  
  // Last update timestamp
  updatedAt: Date;
  
  // Environment information
  environment: 'development' | 'staging' | 'production';
  
  // Feature flags
  features: {
    mcpToolsEnabled: boolean;
    vectorSearchEnabled: boolean;
    codeAnalysisEnabled: boolean;
    testGenerationEnabled: boolean;
  };
  
  // Resource limits
  limits: {
    maxTokens: number;
    maxConversationHistory: number;
    maxFileSize: number;
    timeoutMs: number;
  };
  
  // Custom metadata
  custom?: Record<string, any>;
}

/**
 * Entry in conversation history for short-term memory
 */
export interface ConversationHistoryEntry {
  id: string;
  role: 'user' | 'agent' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: {
    tokenCount?: number;
    toolCalls?: ToolCall[];
    fileReferences?: string[];
    codeBlocks?: CodeBlock[];
  };
}

/**
 * Tool call information
 */
export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  duration?: number;
}

// Import CodeBlock from agent types to avoid duplication
import type { CodeBlock } from './agent';

/**
 * Project knowledge for long-term memory
 */
export interface ProjectKnowledge {
  // Project structure
  structure: {
    framework?: string;
    language: string;
    packageManager?: string;
    buildTool?: string;
    testFramework?: string;
  };
  
  // Code patterns and conventions
  patterns: {
    namingConventions?: Record<string, string>;
    codeStyle?: Record<string, any>;
    architecturePatterns?: string[];
    commonImports?: Record<string, string[]>;
  };
  
  // Dependencies
  dependencies: {
    production: Record<string, string>;
    development: Record<string, string>;
  };
  
  // Recent changes
  recentChanges: {
    files: string[];
    commits: GitCommit[];
    lastUpdated: Date;
  };
  
  // Vector embeddings for semantic search
  embeddings?: {
    indexed: boolean;
    lastIndexed?: Date;
    chunkCount?: number;
  };
}

/**
 * Git commit information
 */
export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
}

/**
 * Context builder for creating AgentContext instances
 */
export interface AgentContextBuilder {
  withSession(sessionId: string, userId: string): AgentContextBuilder;
  withAgent(agent: CodingAgent): AgentContextBuilder;
  withProject(project: Project): AgentContextBuilder;
  withWorkspace(workspace: WorkspaceInfo): AgentContextBuilder;
  withVSCode(vscode: VSCodeContext): AgentContextBuilder;
  withConversation(conversationId: string, history: ConversationHistoryEntry[]): AgentContextBuilder;
  withMetadata(metadata: Partial<AgentContextMetadata>): AgentContextBuilder;
  build(): AgentContext;
}

/**
 * Context manager for maintaining and updating agent contexts
 */
export interface AgentContextManager {
  // Create new context
  createContext(params: CreateContextParams): Promise<AgentContext>;
  
  // Get existing context
  getContext(sessionId: string): Promise<AgentContext | null>;
  
  // Update context
  updateContext(sessionId: string, updates: Partial<AgentContext>): Promise<AgentContext>;
  
  // Add to conversation history
  addToHistory(sessionId: string, entry: ConversationHistoryEntry): Promise<void>;
  
  // Update workspace state
  updateWorkspace(sessionId: string, workspace: Partial<WorkspaceInfo>): Promise<void>;
  
  // Update project knowledge
  updateProjectKnowledge(sessionId: string, knowledge: Partial<ProjectKnowledge>): Promise<void>;
  
  // Clear context
  clearContext(sessionId: string): Promise<void>;
  
  // Get all active contexts for a user
  getUserContexts(userId: string): Promise<AgentContext[]>;
}

/**
 * Parameters for creating a new context
 */
export interface CreateContextParams {
  userId: string;
  agent: CodingAgent;
  conversationId?: string;
  project?: Project;
  workspace?: Partial<WorkspaceInfo>;
  vscode?: Partial<VSCodeContext>;
  metadata?: Partial<AgentContextMetadata>;
}

/**
 * Context snapshot for persistence
 */
export interface AgentContextSnapshot {
  sessionId: string;
  userId: string;
  agentId: string;
  conversationId?: string;
  projectId?: string;
  workspace: WorkspaceInfo;
  conversationHistory: ConversationHistoryEntry[];
  metadata: AgentContextMetadata;
  createdAt: Date;
  snapshotAt: Date;
}

/**
 * Context restore options
 */
export interface ContextRestoreOptions {
  includeHistory?: boolean;
  includeWorkspace?: boolean;
  includeProjectKnowledge?: boolean;
  maxHistoryEntries?: number;
}
