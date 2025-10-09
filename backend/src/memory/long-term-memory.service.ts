import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  LongTermMemory,
  CreateMemoryRequest,
  MemoryQuery,
  MemoryRetrievalResult,
  UpdateMemoryRequest,
  MemoryCategory,
} from '@agentdb9/shared';
import { LongTermMemoryEntity } from '../entities/long-term-memory.entity';
import { generateId } from '@agentdb9/shared';

@Injectable()
export class LongTermMemoryService {
  private readonly logger = new Logger(LongTermMemoryService.name);

  constructor(
    @InjectRepository(LongTermMemoryEntity)
    private ltmRepository: Repository<LongTermMemoryEntity>,
  ) {}

  /**
   * Create a long-term memory entry
   */
  async create(
    summary: string,
    details: string,
    agentId: string,
    category: MemoryCategory,
    metadata: any,
    importance: number = 0.7,
    consolidatedFrom?: string[],
  ): Promise<LongTermMemory> {
    try {
      const entity = this.ltmRepository.create({
        id: generateId(),
        agentId,
        category,
        summary,
        details,
        metadata,
        importance,
        accessCount: 0,
        consolidatedFrom,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await this.ltmRepository.save(entity);
      this.logger.log(`Created LTM: ${saved.id} for agent ${agentId}`);

      return this.entityToMemory(saved);
    } catch (error) {
      this.logger.error(`Failed to create LTM: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get memory by ID
   */
  async get(id: string): Promise<LongTermMemory | null> {
    try {
      const entity = await this.ltmRepository.findOne({ where: { id } });
      
      if (!entity) {
        return null;
      }

      // Update access count and timestamp
      entity.accessCount++;
      entity.lastAccessedAt = new Date();
      await this.ltmRepository.save(entity);

      return this.entityToMemory(entity);
    } catch (error) {
      this.logger.error(`Failed to get LTM: ${error.message}`);
      return null;
    }
  }

  /**
   * Query memories
   */
  async query(query: MemoryQuery): Promise<MemoryRetrievalResult> {
    const startTime = Date.now();

    try {
      const queryBuilder = this.ltmRepository
        .createQueryBuilder('ltm')
        .where('ltm.agentId = :agentId', { agentId: query.agentId });

      // Apply filters
      if (query.category) {
        queryBuilder.andWhere('ltm.category = :category', { category: query.category });
      }

      if (query.workspaceId) {
        queryBuilder.andWhere("ltm.metadata->>'workspaceId' = :workspaceId", {
          workspaceId: query.workspaceId,
        });
      }

      if (query.minImportance !== undefined) {
        queryBuilder.andWhere('ltm.importance >= :minImportance', {
          minImportance: query.minImportance,
        });
      }

      // Order by importance and access count
      queryBuilder
        .orderBy('ltm.importance', 'DESC')
        .addOrderBy('ltm.accessCount', 'DESC')
        .addOrderBy('ltm.updatedAt', 'DESC');

      // Apply limit
      const limit = query.limit || 10;
      queryBuilder.limit(limit);

      const entities = await queryBuilder.getMany();
      const memories = entities.map(e => this.entityToMemory(e));

      return {
        memories,
        totalCount: memories.length,
        query: query.query || '',
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Failed to query LTM: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get memories by category
   */
  async getByCategory(
    agentId: string,
    category: MemoryCategory,
    limit: number = 10,
  ): Promise<LongTermMemory[]> {
    const result = await this.query({
      agentId,
      category,
      limit,
    });

    return result.memories as LongTermMemory[];
  }

  /**
   * Update memory
   */
  async update(id: string, updates: UpdateMemoryRequest): Promise<LongTermMemory | null> {
    try {
      const entity = await this.ltmRepository.findOne({ where: { id } });
      
      if (!entity) {
        return null;
      }

      if (updates.importance !== undefined) {
        entity.importance = updates.importance;
      }

      if (updates.metadata) {
        entity.metadata = { ...entity.metadata, ...updates.metadata };
      }

      if (updates.summary) {
        entity.summary = updates.summary;
      }

      entity.updatedAt = new Date();
      const saved = await this.ltmRepository.save(entity);

      return this.entityToMemory(saved);
    } catch (error) {
      this.logger.error(`Failed to update LTM: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete memory
   */
  async delete(id: string): Promise<void> {
    await this.ltmRepository.delete(id);
    this.logger.log(`Deleted LTM: ${id}`);
  }

  /**
   * Get most accessed memories
   */
  async getMostAccessed(agentId: string, limit: number = 10): Promise<LongTermMemory[]> {
    const entities = await this.ltmRepository.find({
      where: { agentId },
      order: { accessCount: 'DESC' },
      take: limit,
    });

    return entities.map(e => this.entityToMemory(e));
  }

  /**
   * Get statistics
   */
  async getStats(agentId: string): Promise<any> {
    const memories = await this.ltmRepository.find({ where: { agentId } });

    const byCategory: Record<string, number> = {};
    let totalImportance = 0;
    let totalAccesses = 0;
    let mostAccessed: LongTermMemoryEntity | null = null;

    for (const memory of memories) {
      byCategory[memory.category] = (byCategory[memory.category] || 0) + 1;
      totalImportance += memory.importance;
      totalAccesses += memory.accessCount;

      if (!mostAccessed || memory.accessCount > mostAccessed.accessCount) {
        mostAccessed = memory;
      }
    }

    return {
      total: memories.length,
      byCategory,
      averageImportance: memories.length > 0 ? totalImportance / memories.length : 0,
      totalAccesses,
      mostAccessed: mostAccessed ? this.entityToMemory(mostAccessed) : null,
    };
  }

  /**
   * Search memories by text
   */
  async search(agentId: string, searchText: string, limit: number = 10): Promise<LongTermMemory[]> {
    const entities = await this.ltmRepository
      .createQueryBuilder('ltm')
      .where('ltm.agentId = :agentId', { agentId })
      .andWhere(
        '(ltm.summary ILIKE :search OR ltm.details ILIKE :search)',
        { search: `%${searchText}%` },
      )
      .orderBy('ltm.importance', 'DESC')
      .limit(limit)
      .getMany();

    return entities.map(e => this.entityToMemory(e));
  }

  /**
   * Convert entity to memory
   */
  private entityToMemory(entity: LongTermMemoryEntity): LongTermMemory {
    return {
      id: entity.id,
      agentId: entity.agentId,
      category: entity.category,
      summary: entity.summary,
      details: entity.details,
      metadata: entity.metadata,
      importance: entity.importance,
      accessCount: entity.accessCount,
      lastAccessedAt: entity.lastAccessedAt,
      embedding: entity.embedding,
      consolidatedFrom: entity.consolidatedFrom,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
