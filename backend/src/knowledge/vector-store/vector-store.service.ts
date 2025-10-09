import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentChunk } from '../../entities/document-chunk.entity';
import { VectorSearchQuery, VectorSearchResult, VectorSearchFilters } from '@agentdb9/shared';

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(
    @InjectRepository(DocumentChunk)
    private chunkRepository: Repository<DocumentChunk>,
  ) {}

  /**
   * Add document chunks to vector store
   */
  async addDocuments(chunks: DocumentChunk[]): Promise<void> {
    this.logger.log(`Adding ${chunks.length} chunks to vector store`);
    
    try {
      await this.chunkRepository.save(chunks);
      this.logger.log(`Successfully added ${chunks.length} chunks`);
    } catch (error) {
      this.logger.error('Failed to add chunks to vector store:', error);
      throw error;
    }
  }

  /**
   * Update document chunk
   */
  async updateDocument(chunkId: string, chunk: Partial<DocumentChunk>): Promise<void> {
    await this.chunkRepository.update(chunkId, chunk);
  }

  /**
   * Delete document chunk
   */
  async deleteDocument(chunkId: string): Promise<void> {
    await this.chunkRepository.delete(chunkId);
  }

  /**
   * Delete all chunks from a source
   */
  async deleteBySource(sourceId: string): Promise<void> {
    this.logger.log(`Deleting all chunks for source: ${sourceId}`);
    await this.chunkRepository.delete({ sourceId });
  }

  /**
   * Search for similar documents using vector similarity
   */
  async search(query: VectorSearchQuery, queryEmbedding: number[]): Promise<VectorSearchResult[]> {
    this.logger.log(`Searching for similar documents for agent: ${query.agentId}`);

    // Get all chunks for the agent
    const queryBuilder = this.chunkRepository
      .createQueryBuilder('chunk')
      .where('chunk.agentId = :agentId', { agentId: query.agentId })
      .andWhere('chunk.embedding IS NOT NULL');

    // Apply filters
    if (query.filters) {
      this.applyFilters(queryBuilder, query.filters);
    }

    const chunks = await queryBuilder.getMany();

    if (chunks.length === 0) {
      this.logger.warn(`No chunks found for agent: ${query.agentId}`);
      return [];
    }

    // Calculate cosine similarity for each chunk
    const results: VectorSearchResult[] = chunks
      .map(chunk => {
        if (!chunk.embedding) return null;
        
        const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
        
        return {
          chunk,
          score,
        };
      })
      .filter((result): result is { chunk: DocumentChunk; score: number } => result !== null)
      .filter(result => !query.minScore || result.score >= query.minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, query.topK || 5) as VectorSearchResult[];

    this.logger.log(`Found ${results.length} similar chunks`);
    return results;
  }

  /**
   * Get chunks by agent ID
   */
  async getChunksByAgent(agentId: string): Promise<DocumentChunk[]> {
    return this.chunkRepository.find({
      where: { agentId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get chunks by source ID
   */
  async getChunksBySource(sourceId: string): Promise<DocumentChunk[]> {
    return this.chunkRepository.find({
      where: { sourceId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get chunk count for agent
   */
  async getChunkCount(agentId: string): Promise<number> {
    return this.chunkRepository.count({ where: { agentId } });
  }

  /**
   * Get total token count for agent
   */
  async getTotalTokens(agentId: string): Promise<number> {
    const chunks = await this.chunkRepository.find({
      where: { agentId },
      select: ['metadata'],
    });

    return chunks.reduce((total, chunk) => {
      return total + (chunk.metadata.tokenCount || 0);
    }, 0);
  }

  /**
   * Apply search filters to query builder
   */
  private applyFilters(queryBuilder: any, filters: VectorSearchFilters): void {
    if (filters.sourceTypes && filters.sourceTypes.length > 0) {
      queryBuilder.andWhere(
        "chunk.metadata->>'sourceType' IN (:...sourceTypes)",
        { sourceTypes: filters.sourceTypes }
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere(
        "chunk.metadata->'tags' ?| array[:...tags]",
        { tags: filters.tags }
      );
    }

    if (filters.categories && filters.categories.length > 0) {
      queryBuilder.andWhere(
        "chunk.metadata->>'category' IN (:...categories)",
        { categories: filters.categories }
      );
    }

    if (filters.languages && filters.languages.length > 0) {
      queryBuilder.andWhere(
        "chunk.metadata->>'codeLanguage' IN (:...languages)",
        { languages: filters.languages }
      );
    }

    if (filters.dateRange) {
      if (filters.dateRange.start) {
        queryBuilder.andWhere('chunk.createdAt >= :startDate', {
          startDate: filters.dateRange.start,
        });
      }
      if (filters.dateRange.end) {
        queryBuilder.andWhere('chunk.createdAt <= :endDate', {
          endDate: filters.dateRange.end,
        });
      }
    }

    if (filters.version) {
      queryBuilder.andWhere(
        "chunk.metadata->>'version' = :version",
        { version: filters.version }
      );
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Calculate euclidean distance between two vectors
   */
  private euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Calculate dot product between two vectors
   */
  private dotProduct(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }

    return sum;
  }
}
