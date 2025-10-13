import { Injectable, Logger } from '@nestjs/common';
import {
  MemoryConsolidationRequest,
  MemoryConsolidationResult,
  ConsolidationStrategy,
  ShortTermMemory,
  MemoryCategory,
} from '@agentdb9/shared';
import { ShortTermMemoryService } from './short-term-memory.service';
import { LongTermMemoryService } from './long-term-memory.service';

@Injectable()
export class MemoryConsolidationService {
  private readonly logger = new Logger(MemoryConsolidationService.name);

  constructor(
    private stmService: ShortTermMemoryService,
    private ltmService: LongTermMemoryService,
  ) {}

  /**
   * Consolidate short-term memories into long-term storage
   */
  async consolidate(request: MemoryConsolidationRequest): Promise<MemoryConsolidationResult> {
    const startTime = Date.now();
    const strategy = request.strategy || 'summarize';

    this.logger.log(`Starting consolidation for agent ${request.agentId} with strategy: ${strategy}`);

    try {
      // Get candidates for consolidation
      const candidates = await this.stmService.getConsolidationCandidates(
        request.agentId,
        request.minImportance || 0.4, // Lower threshold to include more conversations
        request.maxAge || 0.01, // Allow consolidation after ~36 seconds for testing (0.01 hours)
      );

      this.logger.log(`Found ${candidates.length} STM candidates for consolidation`);

      let stmProcessed = 0;
      let ltmCreated = 0;
      let ltmUpdated = 0;
      let stmArchived = 0;

      switch (strategy) {
        case 'summarize':
          ({ stmProcessed, ltmCreated, stmArchived } = await this.summarizeStrategy(
            request.agentId,
            candidates,
          ));
          break;

        case 'promote':
          ({ stmProcessed, ltmCreated, stmArchived } = await this.promoteStrategy(
            request.agentId,
            candidates,
          ));
          break;

        case 'merge':
          ({ stmProcessed, ltmUpdated, stmArchived } = await this.mergeStrategy(
            request.agentId,
            candidates,
          ));
          break;

        case 'archive':
          stmArchived = await this.archiveStrategy(candidates);
          stmProcessed = stmArchived;
          break;
      }

      const duration = Date.now() - startTime;
      const summary = this.buildSummary(strategy, stmProcessed, ltmCreated, ltmUpdated, stmArchived);

      this.logger.log(`Consolidation completed: ${summary}`);

      return {
        agentId: request.agentId,
        strategy,
        stmProcessed,
        ltmCreated,
        ltmUpdated,
        stmArchived,
        duration,
        summary,
      };
    } catch (error) {
      this.logger.error(`Consolidation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Summarize strategy: Group similar STMs and create summarized LTMs
   */
  private async summarizeStrategy(
    agentId: string,
    candidates: ShortTermMemory[],
  ): Promise<{ stmProcessed: number; ltmCreated: number; stmArchived: number }> {
    // Group by category
    const byCategory = this.groupByCategory(candidates);

    let stmProcessed = 0;
    let ltmCreated = 0;
    const toArchive: string[] = [];

    for (const [category, memories] of Object.entries(byCategory)) {
      if (memories.length === 0) continue;

      // Create summary
      const summary = this.createSummary(memories);
      const details = this.createDetails(memories);
      const importance = this.calculateAverageImportance(memories);
      const consolidatedFrom = memories.map(m => m.id);

      // Merge metadata
      const metadata = this.mergeMetadata(memories);

      // Create LTM
      await this.ltmService.create(
        summary,
        details,
        agentId,
        category as MemoryCategory,
        metadata,
        importance,
        consolidatedFrom,
      );

      ltmCreated++;
      stmProcessed += memories.length;
      toArchive.push(...consolidatedFrom);
    }

    // Archive processed STMs
    await this.stmService.archive(toArchive);
    const stmArchived = toArchive.length;

    return { stmProcessed, ltmCreated, stmArchived };
  }

  /**
   * Promote strategy: Promote high-importance STMs directly to LTM
   */
  private async promoteStrategy(
    agentId: string,
    candidates: ShortTermMemory[],
  ): Promise<{ stmProcessed: number; ltmCreated: number; stmArchived: number }> {
    const highImportance = candidates.filter(m => m.importance >= 0.8);

    let ltmCreated = 0;
    const toArchive: string[] = [];

    for (const memory of highImportance) {
      await this.ltmService.create(
        memory.content.substring(0, 200), // Summary
        memory.content, // Full details
        agentId,
        memory.category,
        memory.metadata,
        memory.importance,
        [memory.id],
      );

      ltmCreated++;
      toArchive.push(memory.id);
    }

    await this.stmService.archive(toArchive);

    return {
      stmProcessed: highImportance.length,
      ltmCreated,
      stmArchived: toArchive.length,
    };
  }

  /**
   * Merge strategy: Merge similar STMs with existing LTMs
   */
  private async mergeStrategy(
    agentId: string,
    candidates: ShortTermMemory[],
  ): Promise<{ stmProcessed: number; ltmUpdated: number; stmArchived: number }> {
    let stmProcessed = 0;
    let ltmUpdated = 0;
    const toArchive: string[] = [];

    // Group by category
    const byCategory = this.groupByCategory(candidates);

    for (const [category, memories] of Object.entries(byCategory)) {
      if (memories.length === 0) continue;

      // Get existing LTMs for this category
      const existingLTMs = await this.ltmService.getByCategory(
        agentId,
        category as MemoryCategory,
        5,
      );

      if (existingLTMs.length > 0) {
        // Merge with most relevant LTM
        const targetLTM = existingLTMs[0];
        const additionalDetails = memories.map(m => m.content).join('\n\n');

        await this.ltmService.update(targetLTM.id, {
          summary: `${targetLTM.summary} (Updated with ${memories.length} new insights)`,
          metadata: {
            ...targetLTM.metadata,
            lastConsolidation: new Date(),
          },
        });

        ltmUpdated++;
        stmProcessed += memories.length;
        toArchive.push(...memories.map(m => m.id));
      }
    }

    await this.stmService.archive(toArchive);

    return {
      stmProcessed,
      ltmUpdated,
      stmArchived: toArchive.length,
    };
  }

  /**
   * Archive strategy: Simply archive old STMs without creating LTMs
   */
  private async archiveStrategy(candidates: ShortTermMemory[]): Promise<number> {
    const toArchive = candidates.map(m => m.id);
    await this.stmService.archive(toArchive);
    return toArchive.length;
  }

  /**
   * Group memories by category
   */
  private groupByCategory(memories: ShortTermMemory[]): Record<string, ShortTermMemory[]> {
    const grouped: Record<string, ShortTermMemory[]> = {};

    for (const memory of memories) {
      if (!grouped[memory.category]) {
        grouped[memory.category] = [];
      }
      grouped[memory.category].push(memory);
    }

    return grouped;
  }

  /**
   * Create summary from multiple memories
   */
  private createSummary(memories: ShortTermMemory[]): string {
    const category = memories[0].category;
    const count = memories.length;
    const timeRange = this.getTimeRange(memories);

    return `Consolidated ${count} ${category} memories from ${timeRange}`;
  }

  /**
   * Create detailed content from multiple memories
   */
  private createDetails(memories: ShortTermMemory[]): string {
    return memories
      .map((m, i) => `[${i + 1}] ${m.content}`)
      .join('\n\n');
  }

  /**
   * Calculate average importance
   */
  private calculateAverageImportance(memories: ShortTermMemory[]): number {
    const sum = memories.reduce((acc, m) => acc + m.importance, 0);
    return sum / memories.length;
  }

  /**
   * Merge metadata from multiple memories
   */
  private mergeMetadata(memories: ShortTermMemory[]): any {
    const allTags = new Set<string>();
    const allKeywords = new Set<string>();
    let workspaceId: string | undefined;
    let projectId: string | undefined;

    for (const memory of memories) {
      memory.metadata.tags.forEach(tag => allTags.add(tag));
      memory.metadata.keywords.forEach(kw => allKeywords.add(kw));
      workspaceId = workspaceId || memory.metadata.workspaceId;
      projectId = projectId || memory.metadata.projectId;
    }

    return {
      tags: Array.from(allTags),
      keywords: Array.from(allKeywords),
      workspaceId,
      projectId,
      confidence: this.calculateAverageImportance(memories),
      relevance: this.calculateAverageImportance(memories),
      source: 'consolidation' as const,
      consolidatedCount: memories.length,
    };
  }

  /**
   * Get time range string
   */
  private getTimeRange(memories: ShortTermMemory[]): string {
    const dates = memories.map(m => m.createdAt.getTime());
    const oldest = new Date(Math.min(...dates));
    const newest = new Date(Math.max(...dates));

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return `${formatDate(oldest)} to ${formatDate(newest)}`;
  }

  /**
   * Build summary message
   */
  private buildSummary(
    strategy: ConsolidationStrategy,
    stmProcessed: number,
    ltmCreated: number,
    ltmUpdated: number,
    stmArchived: number,
  ): string {
    const parts: string[] = [];

    parts.push(`Strategy: ${strategy}`);
    parts.push(`Processed ${stmProcessed} STM entries`);

    if (ltmCreated > 0) {
      parts.push(`Created ${ltmCreated} LTM entries`);
    }

    if (ltmUpdated > 0) {
      parts.push(`Updated ${ltmUpdated} LTM entries`);
    }

    parts.push(`Archived ${stmArchived} STM entries`);

    return parts.join(', ');
  }

  /**
   * Run automatic consolidation (should be scheduled)
   */
  async runAutoConsolidation(agentId: string): Promise<MemoryConsolidationResult> {
    this.logger.log(`Running automatic consolidation for agent ${agentId}`);

    return this.consolidate({
      agentId,
      minImportance: 0.6,
      maxAge: 24,
      strategy: 'summarize',
    });
  }
}
