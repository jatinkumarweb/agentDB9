import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeSource } from '../entities/knowledge-source.entity';
import { DocumentChunk } from '../entities/document-chunk.entity';
import { DocumentLoaderService } from './loaders/document-loader.service';
import { ChunkingService } from './chunking/chunking.service';
import { EmbeddingService } from './embedding/embedding.service';
import { VectorStoreService } from './vector-store/vector-store.service';
import {
  KnowledgeIngestionRequest,
  IngestionResult,
  KnowledgeRetrievalRequest,
  KnowledgeRetrievalResponse,
  KnowledgeBaseStats,
  AgentKnowledgeContext,
  KnowledgeSource as KnowledgeSourceType,
} from '@agentdb9/shared';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @InjectRepository(KnowledgeSource)
    private sourceRepository: Repository<KnowledgeSource>,
    @InjectRepository(DocumentChunk)
    private chunkRepository: Repository<DocumentChunk>,
    private documentLoader: DocumentLoaderService,
    private chunking: ChunkingService,
    private embedding: EmbeddingService,
    private vectorStore: VectorStoreService,
  ) {}

  /**
   * Ingest a knowledge source
   */
  async ingestSource(request: KnowledgeIngestionRequest): Promise<IngestionResult> {
    const startTime = Date.now();
    this.logger.log(`Starting ingestion for agent ${request.agentId}, source type: ${request.source.type}`);

    try {
      // Create or update source record
      let source = await this.sourceRepository.findOne({
        where: {
          agentId: request.agentId,
          url: request.source.url,
          type: request.source.type,
        },
      });

      if (!source) {
        source = this.sourceRepository.create({
          ...request.source,
          agentId: request.agentId,
          status: 'processing',
        });
      } else {
        source.status = 'processing';
        source.error = undefined;
      }

      source = await this.sourceRepository.save(source);

      // Load document
      const document = await this.documentLoader.loadDocument(request.source);

      // Chunk document
      const chunkSize = request.options?.chunkSize || 1000;
      const chunkOverlap = request.options?.chunkOverlap || 200;
      
      const chunks = this.chunking.chunk(document, request.agentId, source.id, {
        chunkSize,
        chunkOverlap,
        preserveStructure: true,
        splitOnSentences: true,
        respectCodeBlocks: true,
      });

      // Generate embeddings if requested
      if (request.options?.generateEmbeddings !== false) {
        const embeddingConfig = this.getEmbeddingConfig(request.agentId);
        const texts = chunks.map(c => c.content);
        const embeddings = await this.embedding.generate(texts, embeddingConfig);

        // Attach embeddings to chunks
        chunks.forEach((chunk, i) => {
          chunk.embedding = embeddings[i];
        });
      }

      // Delete existing chunks if overwrite is requested
      if (request.options?.overwrite) {
        await this.vectorStore.deleteBySource(source.id);
      }

      // Convert chunks to entities and store in vector store
      const chunkEntities = chunks.map(chunk => {
        const entity = new DocumentChunk();
        Object.assign(entity, chunk);
        return entity;
      });
      await this.vectorStore.addDocuments(chunkEntities);

      // Update source status
      source.status = 'indexed';
      source.lastIndexed = new Date();
      source.metadata = {
        ...source.metadata,
        chunkCount: chunks.length,
        tokenCount: chunks.reduce((sum, c) => sum + c.metadata.tokenCount, 0),
      };
      await this.sourceRepository.save(source);

      const duration = Date.now() - startTime;
      const result: IngestionResult = {
        sourceId: source.id,
        status: 'success',
        chunksCreated: chunks.length,
        tokensProcessed: source.metadata.tokenCount || 0,
        duration,
      };

      this.logger.log(`Ingestion completed in ${duration}ms: ${chunks.length} chunks created`);
      return result;

    } catch (error) {
      this.logger.error('Ingestion failed:', error);

      // Update source with error
      const source = await this.sourceRepository.findOne({
        where: {
          agentId: request.agentId,
          url: request.source.url,
        },
      });

      if (source) {
        source.status = 'failed';
        source.error = error instanceof Error ? error.message : 'Unknown error';
        await this.sourceRepository.save(source);
      }

      return {
        sourceId: source?.id || '',
        status: 'failed',
        chunksCreated: 0,
        tokensProcessed: 0,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Retrieve relevant knowledge for a query
   */
  async retrieve(request: KnowledgeRetrievalRequest): Promise<KnowledgeRetrievalResponse> {
    const startTime = Date.now();
    this.logger.log(`Retrieving knowledge for agent ${request.agentId}, query: ${request.query.substring(0, 50)}...`);

    try {
      // Generate query embedding
      const embeddingConfig = this.getEmbeddingConfig(request.agentId);
      const queryEmbedding = await this.embedding.generateSingle(request.query, embeddingConfig);

      // Search vector store
      const results = await this.vectorStore.search(
        {
          query: request.query,
          agentId: request.agentId,
          topK: request.topK || 5,
          filters: request.filters,
          includeMetadata: true,
        },
        queryEmbedding
      );

      const processingTime = Date.now() - startTime;

      this.logger.log(`Retrieved ${results.length} relevant chunks in ${processingTime}ms`);

      return {
        results,
        totalResults: results.length,
        query: request.query,
        processingTime,
        context: request.context,
      };

    } catch (error) {
      this.logger.error('Retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Get knowledge context for agent
   */
  async getAgentKnowledgeContext(agentId: string, query: string, topK: number = 5): Promise<AgentKnowledgeContext> {
    const retrieval = await this.retrieve({
      agentId,
      query,
      topK,
    });

    const sourceEntities = await this.listSources(agentId);
    const relevantChunks = retrieval.results.map(r => r.chunk);
    const totalRelevance = retrieval.results.reduce((sum, r) => sum + r.score, 0);

    // Convert entity sources to shared type
    const sources = sourceEntities.map(s => ({
      id: s.id,
      type: s.type,
      url: s.url,
      content: s.content,
      metadata: s.metadata,
      status: s.status,
      lastIndexed: s.lastIndexed,
      error: s.error,
    } as KnowledgeSourceType));

    return {
      agentId,
      relevantChunks,
      sources,
      totalRelevance,
      retrievalTime: retrieval.processingTime,
    };
  }

  /**
   * Add knowledge source to agent
   */
  async addSource(agentId: string, source: KnowledgeSourceType): Promise<KnowledgeSource> {
    const newSource = this.sourceRepository.create({
      ...source,
      agentId,
      status: 'pending',
    });

    return this.sourceRepository.save(newSource);
  }

  /**
   * Update knowledge source
   */
  async updateSource(sourceId: string, updates: Partial<KnowledgeSourceType>): Promise<KnowledgeSource> {
    const source = await this.sourceRepository.findOne({ where: { id: sourceId } });
    
    if (!source) {
      throw new NotFoundException(`Source ${sourceId} not found`);
    }

    Object.assign(source, updates);
    return this.sourceRepository.save(source);
  }

  /**
   * Delete knowledge source
   */
  async deleteSource(sourceId: string): Promise<void> {
    // Delete all chunks first
    await this.vectorStore.deleteBySource(sourceId);
    
    // Delete source
    await this.sourceRepository.delete(sourceId);
  }

  /**
   * List knowledge sources for agent
   */
  async listSources(agentId: string): Promise<KnowledgeSource[]> {
    return this.sourceRepository.find({
      where: { agentId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Reindex a source
   */
  async reindexSource(sourceId: string): Promise<IngestionResult> {
    const source = await this.sourceRepository.findOne({ where: { id: sourceId } });
    
    if (!source) {
      throw new NotFoundException(`Source ${sourceId} not found`);
    }

    return this.ingestSource({
      agentId: source.agentId,
      source: source as any,
      options: {
        overwrite: true,
        generateEmbeddings: true,
      },
    });
  }

  /**
   * Reindex all sources for an agent
   */
  async reindexAgent(agentId: string): Promise<IngestionResult[]> {
    const sources = await this.listSources(agentId);
    const results: IngestionResult[] = [];

    for (const source of sources) {
      try {
        const result = await this.reindexSource(source.id);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to reindex source ${source.id}:`, error);
        results.push({
          sourceId: source.id,
          status: 'failed',
          chunksCreated: 0,
          tokensProcessed: 0,
          duration: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        });
      }
    }

    return results;
  }

  /**
   * Get knowledge base statistics for agent
   */
  async getStats(agentId: string): Promise<KnowledgeBaseStats> {
    const sources = await this.listSources(agentId);
    const totalChunks = await this.vectorStore.getChunkCount(agentId);
    const totalTokens = await this.vectorStore.getTotalTokens(agentId);

    const sourcesByType = sources.reduce((acc, source) => {
      acc[source.type] = (acc[source.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const lastIndexed = sources
      .filter(s => s.lastIndexed)
      .sort((a, b) => b.lastIndexed!.getTime() - a.lastIndexed!.getTime())[0]?.lastIndexed;

    return {
      agentId,
      totalSources: sources.length,
      totalChunks,
      totalTokens,
      sourcesByType,
      lastIndexed,
    };
  }

  /**
   * Get embedding configuration for agent
   * TODO: Load from agent configuration
   */
  private getEmbeddingConfig(agentId: string) {
    // For now, use default configuration
    // In production, this should load from agent's knowledge base configuration
    return {
      provider: 'ollama' as const,
      model: 'nomic-embed-text',
      dimensions: 768,
    };
  }
}
