import { Injectable, Logger } from '@nestjs/common';
import {
  ShortTermMemory,
  CreateMemoryRequest,
  MemoryQuery,
  MemoryRetrievalResult,
  MemoryCategory,
  MemoryMetadata,
} from '@agentdb9/shared';
import { generateId } from '@agentdb9/shared';

@Injectable()
export class ShortTermMemoryService {
  private readonly logger = new Logger(ShortTermMemoryService.name);
  private readonly memoryStore = new Map<string, ShortTermMemory>();
  private readonly MAX_STM_PER_SESSION = 15;
  private readonly DEFAULT_TTL_HOURS = 24;

  /**
   * Create a short-term memory entry
   */
  async create(request: CreateMemoryRequest): Promise<ShortTermMemory> {
    try {
      const memory: ShortTermMemory = {
        id: generateId(),
        agentId: request.agentId,
        sessionId: request.sessionId || 'default',
        category: request.category,
        content: request.content,
        metadata: this.buildMetadata(request.metadata),
        importance: request.importance || 0.5,
        createdAt: new Date(),
        expiresAt: this.calculateExpiration(),
      };

      // Store in memory (in production, this would use Redis)
      this.memoryStore.set(memory.id, memory);

      // Cleanup old memories for this session
      await this.cleanupOldMemories(memory.agentId, memory.sessionId);

      this.logger.log(`Created STM: ${memory.id} for agent ${memory.agentId}`);
      return memory;
    } catch (error) {
      this.logger.error(`Failed to create STM: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get memory by ID
   */
  async get(id: string): Promise<ShortTermMemory | null> {
    const memory = this.memoryStore.get(id);
    
    if (!memory) {
      return null;
    }

    // Check if expired
    if (new Date() > memory.expiresAt) {
      this.memoryStore.delete(id);
      return null;
    }

    return memory;
  }

  /**
   * Query memories
   */
  async query(query: MemoryQuery): Promise<MemoryRetrievalResult> {
    const startTime = Date.now();

    try {
      let memories = Array.from(this.memoryStore.values())
        .filter(m => m.agentId === query.agentId)
        .filter(m => new Date() <= m.expiresAt); // Filter expired

      // Apply filters
      if (query.sessionId) {
        memories = memories.filter(m => m.sessionId === query.sessionId);
      }

      if (query.category) {
        memories = memories.filter(m => m.category === query.category);
      }

      if (query.workspaceId) {
        memories = memories.filter(m => m.metadata.workspaceId === query.workspaceId);
      }

      if (query.tags && query.tags.length > 0) {
        memories = memories.filter(m =>
          query.tags!.some(tag => m.metadata.tags.includes(tag)),
        );
      }

      if (query.minImportance !== undefined) {
        memories = memories.filter(m => m.importance >= query.minImportance!);
      }

      // Sort by importance and recency
      memories.sort((a, b) => {
        const importanceDiff = b.importance - a.importance;
        if (Math.abs(importanceDiff) > 0.1) {
          return importanceDiff;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      // Apply limit
      const limit = query.limit || 10;
      const limitedMemories = memories.slice(0, limit);

      return {
        memories: limitedMemories,
        totalCount: memories.length,
        query: query.query || '',
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Failed to query STM: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent interactions for a session
   */
  async getRecentInteractions(
    agentId: string,
    sessionId: string,
    limit: number = 10,
  ): Promise<ShortTermMemory[]> {
    const result = await this.query({
      agentId,
      sessionId,
      category: 'interaction',
      limit,
    });

    return result.memories as ShortTermMemory[];
  }

  /**
   * Update memory importance
   */
  async updateImportance(id: string, importance: number): Promise<void> {
    const memory = this.memoryStore.get(id);
    if (memory) {
      memory.importance = Math.max(0, Math.min(1, importance));
      this.memoryStore.set(id, memory);
    }
  }

  /**
   * Delete memory
   */
  async delete(id: string): Promise<void> {
    this.memoryStore.delete(id);
    this.logger.log(`Deleted STM: ${id}`);
  }

  /**
   * Get memories ready for consolidation
   */
  async getConsolidationCandidates(
    agentId: string,
    minImportance: number = 0.6,
    minAgeHours: number = 0, // Minimum age before consolidation (0 = consolidate immediately)
  ): Promise<ShortTermMemory[]> {
    const now = new Date();
    const allMemories = Array.from(this.memoryStore.values());
    
    this.logger.log(`Finding consolidation candidates for agent ${agentId}`);
    this.logger.log(`Total memories in store: ${allMemories.length}`);
    this.logger.log(`Filters: minImportance=${minImportance}, minAgeHours=${minAgeHours}`);
    
    let candidates = allMemories
      .filter(m => m.agentId === agentId)
      .filter(m => m.importance >= minImportance)
      .filter(m => now <= m.expiresAt); // Memory hasn't expired

    this.logger.log(`After filtering: ${candidates.length} candidates found`);

    // Apply age filter only if minAgeHours > 0
    if (minAgeHours > 0) {
      const minAgeDate = new Date(now.getTime() - minAgeHours * 60 * 60 * 1000);
      candidates = candidates.filter(m => m.createdAt <= minAgeDate);
      this.logger.log(`After age filter: ${candidates.length} candidates`);
    }

    return candidates.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Archive memories (mark for deletion after consolidation)
   */
  async archive(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.memoryStore.delete(id);
    }
    this.logger.log(`Archived ${ids.length} STM entries`);
  }

  /**
   * Get session statistics
   */
  async getSessionStats(agentId: string, sessionId: string): Promise<any> {
    let memories = Array.from(this.memoryStore.values())
      .filter(m => m.agentId === agentId)
      .filter(m => new Date() <= m.expiresAt);
    
    // If sessionId is provided and not 'all', filter by session
    if (sessionId && sessionId !== 'all') {
      memories = memories.filter(m => m.sessionId === sessionId);
    }

    const byCategory: Record<string, number> = {};
    let totalImportance = 0;

    for (const memory of memories) {
      byCategory[memory.category] = (byCategory[memory.category] || 0) + 1;
      totalImportance += memory.importance;
    }

    return {
      total: memories.length,
      byCategory,
      averageImportance: memories.length > 0 ? totalImportance / memories.length : 0,
      oldestEntry: memories.length > 0 ? memories[memories.length - 1].createdAt : null,
      newestEntry: memories.length > 0 ? memories[0].createdAt : null,
    };
  }

  /**
   * Clear all memories for a session
   */
  async clearSession(agentId: string, sessionId: string): Promise<void> {
    const toDelete: string[] = [];

    for (const [id, memory] of this.memoryStore.entries()) {
      if (memory.agentId === agentId && memory.sessionId === sessionId) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.memoryStore.delete(id);
    }

    this.logger.log(`Cleared ${toDelete.length} STM entries for session ${sessionId}`);
  }

  /**
   * Build metadata with defaults
   */
  private buildMetadata(partial?: Partial<MemoryMetadata>): MemoryMetadata {
    return {
      tags: partial?.tags || [],
      keywords: partial?.keywords || [],
      confidence: partial?.confidence || 0.8,
      relevance: partial?.relevance || 0.7,
      source: partial?.source || 'chat',
      workspaceId: partial?.workspaceId,
      projectId: partial?.projectId,
      userId: partial?.userId,
      relatedMemories: partial?.relatedMemories,
      parentMemoryId: partial?.parentMemoryId,
      sourceId: partial?.sourceId,
      custom: partial?.custom,
    };
  }

  /**
   * Calculate expiration time
   */
  private calculateExpiration(): Date {
    return new Date(Date.now() + this.DEFAULT_TTL_HOURS * 60 * 60 * 1000);
  }

  /**
   * Cleanup old memories to maintain limit
   */
  private async cleanupOldMemories(agentId: string, sessionId: string): Promise<void> {
    const sessionMemories = Array.from(this.memoryStore.values())
      .filter(m => m.agentId === agentId && m.sessionId === sessionId)
      .filter(m => new Date() <= m.expiresAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (sessionMemories.length > this.MAX_STM_PER_SESSION) {
      const toDelete = sessionMemories.slice(this.MAX_STM_PER_SESSION);
      for (const memory of toDelete) {
        this.memoryStore.delete(memory.id);
      }
      this.logger.log(`Cleaned up ${toDelete.length} old STM entries for session ${sessionId}`);
    }
  }

  /**
   * Cleanup expired memories (should be run periodically)
   */
  async cleanupExpired(): Promise<number> {
    const now = new Date();
    const toDelete: string[] = [];

    for (const [id, memory] of this.memoryStore.entries()) {
      if (now > memory.expiresAt) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.memoryStore.delete(id);
    }

    if (toDelete.length > 0) {
      this.logger.log(`Cleaned up ${toDelete.length} expired STM entries`);
    }

    return toDelete.length;
  }
}
