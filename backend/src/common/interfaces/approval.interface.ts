/**
 * Approval workflow interfaces for interactive agent operations
 */

export enum ApprovalType {
  COMMAND_EXECUTION = 'command_execution',
  DEPENDENCY_INSTALLATION = 'dependency_installation',
  FILE_OPERATION = 'file_operation',
  GIT_OPERATION = 'git_operation',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  TIMEOUT = 'timeout',
}

/**
 * Base approval request interface
 */
export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  conversationId: string;
  agentId: string;
  timestamp: Date;
  risk: RiskLevel;
  reason: string;
  autoApprove?: boolean;
  timeout?: number; // milliseconds
}

/**
 * Command execution approval request
 */
export interface CommandApprovalRequest extends ApprovalRequest {
  type: ApprovalType.COMMAND_EXECUTION;
  command: string;
  workingDir: string;
  estimatedDuration?: string;
  affectedFiles?: string[];
}

/**
 * Dependency installation approval request
 */
export interface DependencyApprovalRequest extends ApprovalRequest {
  type: ApprovalType.DEPENDENCY_INSTALLATION;
  packages: DependencyInfo[];
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
  workingDir: string;
  totalSize?: string;
}

export interface DependencyInfo {
  name: string;
  version?: string;
  size?: string;
  description?: string;
  devDependency: boolean;
  license?: string;
}

/**
 * File operation approval request
 */
export interface FileOperationApprovalRequest extends ApprovalRequest {
  type: ApprovalType.FILE_OPERATION;
  operation: 'create' | 'update' | 'delete' | 'move';
  path: string;
  newPath?: string; // for move operations
  contentPreview?: string;
  fileSize?: number;
}

/**
 * Git operation approval request
 */
export interface GitOperationApprovalRequest extends ApprovalRequest {
  type: ApprovalType.GIT_OPERATION;
  operation: 'commit' | 'push' | 'pull' | 'merge' | 'reset';
  message?: string;
  files?: string[];
  branch?: string;
}

/**
 * Approval response from user
 */
export interface ApprovalResponse {
  requestId: string;
  status: ApprovalStatus;
  timestamp: Date;
  modifiedCommand?: string; // For command modifications
  selectedPackages?: string[]; // For selective dependency installation
  comment?: string;
  rememberChoice?: boolean; // Remember for future similar operations
}

/**
 * Task plan for milestone-based execution
 */
export interface TaskPlan {
  id: string;
  objective: string;
  description: string;
  milestones: TaskMilestone[];
  estimatedSteps: number;
  estimatedDuration?: string;
  requiresApproval: boolean;
  createdAt: Date;
}

/**
 * Individual milestone in a task plan
 */
export interface TaskMilestone {
  id: string;
  order: number;
  title: string;
  description: string;
  type: 'analysis' | 'file_operation' | 'command_execution' | 'validation' | 'git_operation';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  requiresApproval: boolean;
  tools: string[];
  dependencies?: string[]; // IDs of milestones that must complete first
  result?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Progress update for task execution
 */
export interface TaskProgressUpdate {
  type: 'plan' | 'milestone_start' | 'milestone_progress' | 'milestone_complete' | 'tool_execution' | 'approval_required' | 'final_answer';
  taskPlanId?: string;
  objective?: string;
  currentMilestone?: TaskMilestone;
  currentStep?: number;
  totalSteps?: number;
  percentage?: number;
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Approval preferences for user
 */
export interface ApprovalPreferences {
  userId: string;
  autoApproveCommands?: string[]; // Whitelist of commands
  autoApproveDependencies?: string[]; // Whitelist of packages
  alwaysApproveHighRisk: boolean;
  alwaysApproveGitPush: boolean;
  defaultTimeout: number; // milliseconds
}
