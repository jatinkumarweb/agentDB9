import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApprovalRequest,
  ApprovalResponse,
  ApprovalStatus,
  ApprovalType,
  CommandApprovalRequest,
  DependencyApprovalRequest,
  FileOperationApprovalRequest,
  GitOperationApprovalRequest,
  RiskLevel,
} from '../interfaces/approval.interface';
import { generateId } from '@agentdb9/shared';

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);
  private pendingApprovals = new Map<string, {
    request: ApprovalRequest;
    resolve: (response: ApprovalResponse) => void;
    reject: (error: Error) => void;
    timeoutId?: NodeJS.Timeout;
  }>();

  constructor(private eventEmitter: EventEmitter2) {}

  /**
   * Request approval for a command execution
   */
  async requestCommandApproval(
    command: string,
    workingDir: string,
    conversationId: string,
    agentId: string,
    reason: string,
  ): Promise<ApprovalResponse> {
    const risk = this.assessCommandRisk(command);
    const request: CommandApprovalRequest = {
      id: generateId(),
      type: ApprovalType.COMMAND_EXECUTION,
      conversationId,
      agentId,
      timestamp: new Date(),
      risk,
      reason,
      command,
      workingDir,
      estimatedDuration: this.estimateCommandDuration(command),
      affectedFiles: this.getAffectedFiles(command),
      timeout: 60000, // 60 seconds default
    };

    return this.requestApproval(request);
  }

  /**
   * Request approval for dependency installation
   */
  async requestDependencyApproval(
    packages: string[],
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun',
    workingDir: string,
    conversationId: string,
    agentId: string,
    devDependencies: boolean = false,
  ): Promise<ApprovalResponse> {
    const packageInfo = packages.map(pkg => ({
      name: pkg,
      devDependency: devDependencies,
    }));

    const request: DependencyApprovalRequest = {
      id: generateId(),
      type: ApprovalType.DEPENDENCY_INSTALLATION,
      conversationId,
      agentId,
      timestamp: new Date(),
      risk: RiskLevel.MEDIUM,
      reason: `Install ${packages.length} package(s) using ${packageManager}`,
      packages: packageInfo,
      packageManager,
      workingDir,
      timeout: 90000, // 90 seconds for dependency approval
    };

    return this.requestApproval(request);
  }

  /**
   * Request approval for file operations
   */
  async requestFileOperationApproval(
    operation: 'create' | 'update' | 'delete' | 'move',
    path: string,
    conversationId: string,
    agentId: string,
    contentPreview?: string,
    newPath?: string,
  ): Promise<ApprovalResponse> {
    const risk = operation === 'delete' ? RiskLevel.HIGH : RiskLevel.LOW;
    const request: FileOperationApprovalRequest = {
      id: generateId(),
      type: ApprovalType.FILE_OPERATION,
      conversationId,
      agentId,
      timestamp: new Date(),
      risk,
      reason: `${operation.charAt(0).toUpperCase() + operation.slice(1)} file: ${path}`,
      operation,
      path,
      newPath,
      contentPreview,
      timeout: 45000, // 45 seconds
    };

    return this.requestApproval(request);
  }

  /**
   * Request approval for git operations
   */
  async requestGitOperationApproval(
    operation: 'commit' | 'push' | 'pull' | 'merge' | 'reset',
    conversationId: string,
    agentId: string,
    message?: string,
    files?: string[],
    branch?: string,
  ): Promise<ApprovalResponse> {
    const risk = operation === 'push' || operation === 'reset' ? RiskLevel.HIGH : RiskLevel.MEDIUM;
    const request: GitOperationApprovalRequest = {
      id: generateId(),
      type: ApprovalType.GIT_OPERATION,
      conversationId,
      agentId,
      timestamp: new Date(),
      risk,
      reason: `Git ${operation}${branch ? ` on branch ${branch}` : ''}`,
      operation,
      message,
      files,
      branch,
      timeout: 60000,
    };

    return this.requestApproval(request);
  }

  /**
   * Generic approval request handler
   */
  private async requestApproval(request: ApprovalRequest): Promise<ApprovalResponse> {
    this.logger.log(`Requesting approval: ${request.type} (${request.id})`);

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.logger.warn(`Approval timeout for request ${request.id}`);
        this.pendingApprovals.delete(request.id);
        resolve({
          requestId: request.id,
          status: ApprovalStatus.TIMEOUT,
          timestamp: new Date(),
        });
      }, request.timeout || 60000);

      // Store pending approval
      this.pendingApprovals.set(request.id, {
        request,
        resolve,
        reject,
        timeoutId,
      });

      // Emit event for WebSocket gateway to broadcast
      this.eventEmitter.emit('approval.request', request);
    });
  }

  /**
   * Handle approval response from user
   */
  handleApprovalResponse(response: ApprovalResponse): void {
    const pending = this.pendingApprovals.get(response.requestId);
    
    if (!pending) {
      this.logger.warn(`No pending approval found for request ${response.requestId}`);
      return;
    }

    // Clear timeout
    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
    }

    // Remove from pending
    this.pendingApprovals.delete(response.requestId);

    // Resolve the promise
    this.logger.log(`Approval ${response.status} for request ${response.requestId}`);
    pending.resolve(response);
  }

  /**
   * Cancel a pending approval request
   */
  cancelApproval(requestId: string): void {
    const pending = this.pendingApprovals.get(requestId);
    
    if (pending) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      this.pendingApprovals.delete(requestId);
      pending.reject(new Error('Approval cancelled'));
    }
  }

  /**
   * Assess risk level of a command
   */
  private assessCommandRisk(command: string): RiskLevel {
    const criticalPatterns = [
      /rm\s+-rf\s+\//,
      /sudo\s+rm/,
      /format\s+/i,
      /dd\s+if=/,
    ];

    const highRiskPatterns = [
      /npm\s+install\s+-g/,
      /yarn\s+global/,
      /npx\s+create-/,
      /git\s+push\s+--force/,
      /docker\s+run/,
      /chmod\s+777/,
      /rm\s+-rf/,
    ];

    const mediumRiskPatterns = [
      /npm\s+install/,
      /yarn\s+add/,
      /pnpm\s+add/,
      /git\s+push/,
      /git\s+reset/,
      /npm\s+run\s+build/,
    ];

    if (criticalPatterns.some(pattern => pattern.test(command))) {
      return RiskLevel.CRITICAL;
    }

    if (highRiskPatterns.some(pattern => pattern.test(command))) {
      return RiskLevel.HIGH;
    }

    if (mediumRiskPatterns.some(pattern => pattern.test(command))) {
      return RiskLevel.MEDIUM;
    }

    return RiskLevel.LOW;
  }

  /**
   * Estimate command duration
   */
  private estimateCommandDuration(command: string): string {
    if (/npm\s+install|yarn\s+install|pnpm\s+install/.test(command)) {
      return '1-3 minutes';
    }
    if (/npx\s+create-/.test(command)) {
      return '2-5 minutes';
    }
    if (/npm\s+run\s+build|yarn\s+build/.test(command)) {
      return '30 seconds - 2 minutes';
    }
    if (/npm\s+test|yarn\s+test/.test(command)) {
      return '10-60 seconds';
    }
    return '< 10 seconds';
  }

  /**
   * Get files affected by command
   */
  private getAffectedFiles(command: string): string[] | undefined {
    // Extract file paths from common commands
    const fileMatch = command.match(/(?:>|>>)\s+([^\s]+)/);
    if (fileMatch) {
      return [fileMatch[1]];
    }
    return undefined;
  }

  /**
   * Check if command should require approval
   */
  shouldRequireApproval(command: string): boolean {
    const risk = this.assessCommandRisk(command);
    return risk !== RiskLevel.LOW;
  }

  /**
   * Get all pending approvals for a conversation
   */
  getPendingApprovals(conversationId: string): ApprovalRequest[] {
    const pending: ApprovalRequest[] = [];
    
    for (const [_, value] of this.pendingApprovals) {
      if (value.request.conversationId === conversationId) {
        pending.push(value.request);
      }
    }
    
    return pending;
  }
}
