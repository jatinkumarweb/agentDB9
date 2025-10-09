import { Injectable, Logger } from '@nestjs/common';
import {
  CreateMemoryRequest,
  MemoryContext,
  MemoryStats,
  MemoryQuery,
  MemoryConsolidationRequest,
  MemoryConsolidationResult,
} from '@agentdb9/shared';
import { ShortTermMemoryService } from './short-term-memory.service';
import { LongTermMemoryService } from './long-term-memory.service';
import { MemoryConsolidationService } from './memory-consolidation.service';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private stmService: ShortTermMemoryService,
    private ltmService: LongTermMemoryService,
    private consolidationService: MemoryConsolidationService,
  ) {}

  /**
   * Create a memory entry
   */
  async createMemory(request: CreateMemoryRequest) {
    if (request.type === 'long-term') {
      return this.ltmService.create(
        request.content.substring(0, 200),
        request.content,
        request.agentId,
        request.category,
        request.metadata || {},
        request.importance,
      );
    }

    return this.stmService.create(request);
  }

  /**
   * Get memory context for agent session
   */
  async getMemoryContext(
    agentId: string,
    sessionId: string,
    query?: string,
  ): Promise<MemoryContext> {
    const startTime = Date.now();

    try {
      // Get recent interactions from STM
      const recentInteractions = await this.stmService.getRecentInteractions(
        agentId,
        sessionId,
        10,
      );

      // Get relevant lessons from LTM
      const relevantLessons = await this.ltmService.getByCategory(
        agentId,
        'lesson',
        5,
      );

      // Get relevant challenges from LTM
      const relevantChallenges = await this.ltmService.getByCategory(
        agentId,
        'challenge',
        5,
      );

      // Get relevant feedback from LTM
      const relevantFeedback = await this.ltmService.getByCategory(
        agentId,
        'feedback',
        5,
      );

      // Build summary
      const summary = this.buildContextSummary(
        recentInteractions.length,
        relevantLessons.length,
        relevantChallenges.length,
        relevantFeedback.length,
      );

      const totalMemories =
        recentInteractions.length +
        relevantLessons.length +
        relevantChallenges.length +
        relevantFeedback.length;

      return {
        agentId,
        sessionId,
        recentInteractions,
        relevantLessons,
        relevantChallenges,
        relevantFeedback,
        summary,
        totalMemories,
        retrievalTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Failed to get memory context: ${error.message}`);
      throw error;
    }
  }

  /**
   * Query memories (both STM and LTM)
   */
  async queryMemories(query: MemoryQuery) {
    const stmResult = await this.stmService.query(query);
    const ltmResult = await this.ltmService.query(query);

    return {
      memories: [...stmResult.memories, ...ltmResult.memories],
      totalCount: stmResult.totalCount + ltmResult.totalCount,
      query: query.query || '',
      processingTime: stmResult.processingTime + ltmResult.processingTime,
    };
  }

  /**
   * Get memory statistics
   */
  async getStats(agentId: string): Promise<MemoryStats> {
    const stmStats = await this.stmService.getSessionStats(agentId, 'all');
    const ltmStats = await this.ltmService.getStats(agentId);

    return {
      agentId,
      shortTerm: {
        total: stmStats.total,
        byCategory: stmStats.byCategory,
        averageImportance: stmStats.averageImportance,
        oldestEntry: stmStats.oldestEntry,
        newestEntry: stmStats.newestEntry,
      },
      longTerm: {
        total: ltmStats.total,
        byCategory: ltmStats.byCategory,
        averageImportance: ltmStats.averageImportance,
        totalAccesses: ltmStats.totalAccesses,
        mostAccessed: ltmStats.mostAccessed,
      },
      consolidation: {
        lastRun: undefined, // TODO: Track consolidation runs
        totalRuns: 0,
        averageDuration: 0,
      },
    };
  }

  /**
   * Consolidate memories
   */
  async consolidate(request: MemoryConsolidationRequest): Promise<MemoryConsolidationResult> {
    return this.consolidationService.consolidate(request);
  }

  /**
   * Run automatic consolidation for all agents
   */
  async runAutoConsolidation(agentIds: string[]): Promise<MemoryConsolidationResult[]> {
    const results: MemoryConsolidationResult[] = [];

    for (const agentId of agentIds) {
      try {
        const result = await this.consolidationService.runAutoConsolidation(agentId);
        results.push(result);
      } catch (error) {
        this.logger.error(`Auto-consolidation failed for agent ${agentId}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Clear session memories
   */
  async clearSession(agentId: string, sessionId: string): Promise<void> {
    await this.stmService.clearSession(agentId, sessionId);
  }

  /**
   * Build context summary
   */
  private buildContextSummary(
    interactions: number,
    lessons: number,
    challenges: number,
    feedback: number,
  ): string {
    const parts: string[] = [];

    if (interactions > 0) {
      parts.push(`${interactions} recent interactions`);
    }

    if (lessons > 0) {
      parts.push(`${lessons} learned lessons`);
    }

    if (challenges > 0) {
      parts.push(`${challenges} resolved challenges`);
    }

    if (feedback > 0) {
      parts.push(`${feedback} user feedback items`);
    }

    return parts.length > 0
      ? `Memory context includes: ${parts.join(', ')}`
      : 'No memory context available';
  }
}
