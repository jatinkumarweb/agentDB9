// Enhanced agent profile and metadata types

import { CodingAgent, AgentConfiguration, AgentCapability, AgentStatus } from './agent';

// Rename to avoid conflict with testing.ts
export interface AgentPerformanceMetrics {
  // Response times
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  
  // Throughput
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  
  // Success rates
  successRate: number;
  completionRate: number;
  
  // Resource efficiency
  averageTokensPerRequest: number;
  averageMemoryPerRequest: number;
  averageCpuPerRequest: number;
}

/**
 * AgentProfile extends CodingAgent with additional metadata and runtime information
 * This is the production-ready interface for agent management
 */
export interface AgentProfile extends CodingAgent {
  // Enhanced metadata
  profile: AgentProfileMetadata;
  
  // Runtime state
  runtime: AgentRuntimeState;
  
  // Performance metrics
  metrics: AgentMetrics;
  
  // Capabilities with detailed configuration
  enhancedCapabilities: EnhancedCapability[];
}

/**
 * Agent profile metadata
 */
export interface AgentProfileMetadata {
  // Display information
  displayName: string;
  avatar?: string;
  color?: string;
  icon?: string;
  
  // Categorization
  category: AgentCategory;
  tags: string[];
  
  // Ownership and permissions
  owner: {
    userId: string;
    username: string;
  };
  visibility: 'private' | 'team' | 'public';
  permissions: AgentPermissions;
  
  // Version control
  version: string;
  changelog?: ChangelogEntry[];
  
  // Documentation
  documentation?: {
    description: string;
    examples: string[];
    limitations: string[];
    bestPractices: string[];
  };
}

/**
 * Agent category
 */
export type AgentCategory = 
  | 'general-coding'
  | 'frontend-development'
  | 'backend-development'
  | 'fullstack-development'
  | 'devops'
  | 'testing'
  | 'code-review'
  | 'documentation'
  | 'debugging'
  | 'refactoring'
  | 'architecture'
  | 'custom';

/**
 * Agent permissions
 */
export interface AgentPermissions {
  // File system permissions
  canReadFiles: boolean;
  canWriteFiles: boolean;
  canDeleteFiles: boolean;
  canExecuteCommands: boolean;
  
  // Git permissions
  canCommit: boolean;
  canPush: boolean;
  canCreateBranches: boolean;
  
  // External access
  canAccessNetwork: boolean;
  canAccessAPIs: boolean;
  
  // Resource limits
  maxFileSize: number;
  maxExecutionTime: number;
  maxTokensPerRequest: number;
  
  // Restricted paths
  allowedPaths?: string[];
  deniedPaths?: string[];
}

/**
 * Changelog entry
 */
export interface ChangelogEntry {
  version: string;
  date: Date;
  changes: string[];
  author: string;
}

/**
 * Agent runtime state
 */
export interface AgentRuntimeState {
  // Current status
  status: AgentStatus;
  statusMessage?: string;
  
  // Active tasks
  activeTasks: ActiveTask[];
  taskQueue: QueuedTask[];
  
  // Resource usage
  resources: ResourceUsage;
  
  // Connection state
  connections: {
    llmService: ServiceConnectionState;
    mcpServer: ServiceConnectionState;
    vscode: ServiceConnectionState;
    database: ServiceConnectionState;
  };
  
  // Health status
  health: HealthStatus;
  
  // Last activity
  lastActiveAt?: Date;
  lastTaskCompletedAt?: Date;
  lastErrorAt?: Date;
}

/**
 * Active task
 */
export interface ActiveTask {
  id: string;
  type: string;
  description: string;
  startedAt: Date;
  progress: number; // 0-100
  estimatedCompletion?: Date;
  metadata?: Record<string, any>;
}

/**
 * Queued task
 */
export interface QueuedTask {
  id: string;
  type: string;
  description: string;
  priority: number;
  queuedAt: Date;
  estimatedStartTime?: Date;
  metadata?: Record<string, any>;
}

/**
 * Resource usage
 */
export interface ResourceUsage {
  // Memory
  memoryUsed: number;
  memoryLimit: number;
  memoryPercent: number;
  
  // CPU
  cpuUsed: number;
  cpuLimit: number;
  cpuPercent: number;
  
  // Tokens
  tokensUsed: number;
  tokensLimit: number;
  tokensPercent: number;
  
  // API calls
  apiCallsUsed: number;
  apiCallsLimit: number;
  apiCallsPercent: number;
}

/**
 * Service connection state
 */
export interface ServiceConnectionState {
  connected: boolean;
  lastConnected?: Date;
  lastDisconnected?: Date;
  reconnectAttempts: number;
  latency?: number;
  error?: string;
}

/**
 * Health status
 */
export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  checks: HealthCheck[];
  lastChecked: Date;
}

/**
 * Health check
 */
export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  timestamp: Date;
  duration?: number;
}

/**
 * Agent metrics
 */
export interface AgentMetrics {
  // Usage statistics
  usage: UsageMetrics;
  
  // Performance statistics
  performance: AgentPerformanceMetrics;
  
  // Quality metrics
  quality: QualityMetrics;
  
  // Error tracking
  errors: ErrorMetrics;
}

/**
 * Usage metrics
 */
export interface UsageMetrics {
  totalConversations: number;
  totalMessages: number;
  totalTasks: number;
  totalTokens: number;
  
  // Time-based usage
  usageByDay: Record<string, number>;
  usageByWeek: Record<string, number>;
  usageByMonth: Record<string, number>;
  
  // Feature usage
  featureUsage: Record<string, number>;
  toolUsage: Record<string, number>;
  
  // User engagement
  activeUsers: number;
  averageSessionDuration: number;
  returnRate: number;
}

// AgentPerformanceMetrics already defined above to avoid conflict with testing.ts

/**
 * Quality metrics
 */
export interface QualityMetrics {
  // User satisfaction
  averageRating?: number;
  totalRatings?: number;
  positiveRatings?: number;
  negativeRatings?: number;
  
  // Code quality
  codeQualityScore?: number;
  testCoverage?: number;
  lintingScore?: number;
  
  // Accuracy
  accuracyScore?: number;
  relevanceScore?: number;
  
  // User feedback
  feedbackCount: number;
  commonIssues: string[];
  commonPraises: string[];
}

/**
 * Error metrics
 */
export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  
  // Error types
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  
  // Recent errors
  recentErrors: ErrorEntry[];
  
  // Error trends
  errorTrend: 'increasing' | 'stable' | 'decreasing';
  
  // Recovery
  averageRecoveryTime: number;
  autoRecoveryRate: number;
}

/**
 * Error entry
 */
export interface ErrorEntry {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  timestamp: Date;
  context?: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * Enhanced capability with detailed configuration
 */
export interface EnhancedCapability extends AgentCapability {
  // Configuration
  config: CapabilityConfig;
  
  // Performance
  performance: CapabilityPerformance;
  
  // Dependencies
  dependencies: string[];
  
  // Status
  status: 'active' | 'inactive' | 'error';
  statusMessage?: string;
}

/**
 * Capability configuration
 */
export interface CapabilityConfig {
  // Model settings
  model?: string;
  temperature?: number;
  maxTokens?: number;
  
  // Tool settings
  tools?: string[];
  toolConfig?: Record<string, any>;
  
  // Behavior settings
  autoExecute?: boolean;
  requireConfirmation?: boolean;
  maxRetries?: number;
  timeout?: number;
  
  // Custom settings
  custom?: Record<string, any>;
}

/**
 * Capability performance
 */
export interface CapabilityPerformance {
  usageCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  averageExecutionTime: number;
  lastUsed?: Date;
}

/**
 * Agent manager interface for managing agent profiles
 */
export interface AgentManager {
  // Profile management
  createProfile(params: CreateAgentProfileParams): Promise<AgentProfile>;
  getProfile(agentId: string): Promise<AgentProfile | null>;
  updateProfile(agentId: string, updates: Partial<AgentProfile>): Promise<AgentProfile>;
  deleteProfile(agentId: string): Promise<void>;
  
  // Profile queries
  listProfiles(userId: string, filters?: AgentProfileFilters): Promise<AgentProfile[]>;
  searchProfiles(query: string, filters?: AgentProfileFilters): Promise<AgentProfile[]>;
  
  // Runtime management
  startAgent(agentId: string): Promise<void>;
  stopAgent(agentId: string): Promise<void>;
  restartAgent(agentId: string): Promise<void>;
  
  // Status monitoring
  getStatus(agentId: string): Promise<AgentRuntimeState>;
  getMetrics(agentId: string): Promise<AgentMetrics>;
  getHealth(agentId: string): Promise<HealthStatus>;
  
  // Configuration
  updateConfiguration(agentId: string, config: Partial<AgentConfiguration>): Promise<void>;
  updateCapabilities(agentId: string, capabilities: AgentCapability[]): Promise<void>;
  updatePermissions(agentId: string, permissions: Partial<AgentPermissions>): Promise<void>;
  
  // Cloning and templates
  cloneProfile(agentId: string, newName: string): Promise<AgentProfile>;
  createFromTemplate(templateId: string, params: CreateFromTemplateParams): Promise<AgentProfile>;
  saveAsTemplate(agentId: string, templateName: string): Promise<string>;
}

/**
 * Parameters for creating an agent profile
 */
export interface CreateAgentProfileParams {
  name: string;
  description?: string;
  category: AgentCategory;
  configuration: AgentConfiguration;
  capabilities?: AgentCapability[];
  permissions?: Partial<AgentPermissions>;
  metadata?: Partial<AgentProfileMetadata>;
}

/**
 * Filters for querying agent profiles
 */
export interface AgentProfileFilters {
  category?: AgentCategory;
  tags?: string[];
  status?: AgentStatus;
  visibility?: 'private' | 'team' | 'public';
  createdAfter?: Date;
  createdBefore?: Date;
  sortBy?: 'name' | 'createdAt' | 'lastActiveAt' | 'usage';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Parameters for creating from template
 */
export interface CreateFromTemplateParams {
  name: string;
  description?: string;
  configuration?: Partial<AgentConfiguration>;
  overrides?: Record<string, any>;
}
