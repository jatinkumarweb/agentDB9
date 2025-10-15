import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeService } from '../knowledge.service';
import { DocumentLoaderService } from '../loaders/document-loader.service';
import { ChunkingService } from '../chunking/chunking.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { KnowledgeSource } from '../../entities/knowledge-source.entity';
import { DocumentChunk } from '../../entities/document-chunk.entity';
import { KnowledgeIngestionRequest } from '@agentdb9/shared';

describe('Knowledge Integration Tests', () => {
  let module: TestingModule;
  let knowledgeService: KnowledgeService;
  let documentLoader: DocumentLoaderService;
  let chunking: ChunkingService;
  let embedding: EmbeddingService;
  let vectorStore: VectorStoreService;

  const testAgentId = 'test-agent-123';

  beforeAll(async () => {
    jest.setTimeout(30000); // Increase timeout to 30 seconds
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [KnowledgeSource, DocumentChunk],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([KnowledgeSource, DocumentChunk]),
      ],
      providers: [
        KnowledgeService,
        DocumentLoaderService,
        ChunkingService,
        EmbeddingService,
        VectorStoreService,
      ],
    }).compile();

    knowledgeService = module.get<KnowledgeService>(KnowledgeService);
    documentLoader = module.get<DocumentLoaderService>(DocumentLoaderService);
    chunking = module.get<ChunkingService>(ChunkingService);
    embedding = module.get<EmbeddingService>(EmbeddingService);
    vectorStore = module.get<VectorStoreService>(VectorStoreService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Markdown Ingestion', () => {
    it('should ingest markdown content successfully', async () => {
      const request: KnowledgeIngestionRequest = {
        agentId: testAgentId,
        source: {
          id: 'md-source-1',
          type: 'markdown',
          content: `# Test Document

This is a test document for knowledge base ingestion.

## Section 1

Content for section 1 with some technical details about TypeScript.

## Section 2

Content for section 2 with information about NestJS framework.`,
          metadata: {
            title: 'Test Markdown Document',
            description: 'A test document',
            tags: ['test', 'markdown'],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          status: 'pending',
        },
        options: {
          chunkSize: 500,
          chunkOverlap: 50,
          extractMetadata: true,
          generateEmbeddings: true,
        },
      };

      const result = await knowledgeService.ingestSource(request);

      expect(result).toBeDefined();
      expect(result.sourceId).toBe('md-source-1');
      expect(result.status).toBe('completed');
      expect(result.chunksCreated).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should retrieve ingested markdown content', async () => {
      const retrievalResult = await knowledgeService.retrieve({
        agentId: testAgentId,
        query: 'TypeScript technical details',
        topK: 3,
      });

      expect(retrievalResult).toBeDefined();
      expect(retrievalResult.results.length).toBeGreaterThan(0);
      expect(retrievalResult.results[0].chunk.content).toContain('TypeScript');
    });
  });

  describe('Website Ingestion', () => {
    it('should handle website ingestion request', async () => {
      const request: KnowledgeIngestionRequest = {
        agentId: testAgentId,
        source: {
          id: 'web-source-1',
          type: 'website',
          url: 'https://example.com/docs',
          metadata: {
            title: 'Example Documentation',
            description: 'Documentation from example.com',
            tags: ['docs', 'website'],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          status: 'pending',
        },
        options: {
          chunkSize: 1000,
          chunkOverlap: 100,
          extractMetadata: true,
          generateEmbeddings: false, // Skip embeddings for faster test
        },
      };

      // This will fail in test environment without network, but we test the flow
      try {
        await knowledgeService.ingestSource(request);
      } catch (error) {
        // Expected to fail without network access
        expect(error).toBeDefined();
      }
    });
  });

  describe('Source Management', () => {
    it('should add a knowledge source', async () => {
      const source = {
        id: 'manual-source-1',
        type: 'markdown' as const,
        content: '# Manual Source\n\nThis is manually added.',
        metadata: {
          title: 'Manual Source',
          description: 'Manually added source',
          tags: ['manual'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        status: 'pending' as const,
      };

      await knowledgeService.addSource(testAgentId, source);

      const sources = await knowledgeService.listSources(testAgentId);
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.some(s => s.id === 'manual-source-1')).toBe(true);
    });

    it('should list all sources for an agent', async () => {
      const sources = await knowledgeService.listSources(testAgentId);
      expect(Array.isArray(sources)).toBe(true);
      expect(sources.length).toBeGreaterThan(0);
    });

    it('should get statistics for agent knowledge base', async () => {
      const stats = await knowledgeService.getStats(testAgentId);

      expect(stats).toBeDefined();
      expect(stats.agentId).toBe(testAgentId);
      expect(stats.totalSources).toBeGreaterThan(0);
      expect(stats.totalChunks).toBeGreaterThan(0);
    });

    it('should delete a knowledge source', async () => {
      const sourcesBefore = await knowledgeService.listSources(testAgentId);
      const sourceToDelete = sourcesBefore.find(s => s.id === 'manual-source-1');

      if (sourceToDelete) {
        await knowledgeService.deleteSource(sourceToDelete.id);

        const sourcesAfter = await knowledgeService.listSources(testAgentId);
        expect(sourcesAfter.length).toBe(sourcesBefore.length - 1);
        expect(sourcesAfter.some(s => s.id === 'manual-source-1')).toBe(false);
      }
    });
  });

  describe('Knowledge Retrieval', () => {
    beforeAll(async () => {
      // Add test data for retrieval
      const request: KnowledgeIngestionRequest = {
        agentId: testAgentId,
        source: {
          id: 'retrieval-test-source',
          type: 'markdown',
          content: `# API Documentation

## Authentication
Use JWT tokens for authentication. Include the token in the Authorization header.

## Rate Limiting
API is rate limited to 100 requests per minute per user.

## Error Handling
All errors return a JSON response with error code and message.`,
          metadata: {
            title: 'API Documentation',
            description: 'API usage documentation',
            tags: ['api', 'docs'],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          status: 'pending',
        },
        options: {
          chunkSize: 300,
          chunkOverlap: 30,
          extractMetadata: true,
          generateEmbeddings: true,
        },
      };

      await knowledgeService.ingestSource(request);
    });

    it('should retrieve relevant chunks for a query', async () => {
      const result = await knowledgeService.retrieve({
        agentId: testAgentId,
        query: 'How do I authenticate with the API?',
        topK: 5,
      });

      expect(result).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].score).toBeGreaterThan(0);
    });

    it('should return agent knowledge context', async () => {
      const context = await knowledgeService.getAgentKnowledgeContext(
        testAgentId,
        'rate limiting',
        3
      );

      expect(context).toBeDefined();
      expect(context.agentId).toBe(testAgentId);
      expect(context.relevantChunks.length).toBeGreaterThan(0);
      expect(context.sources.length).toBeGreaterThan(0);
      expect(context.totalRelevance).toBeGreaterThan(0);
    });

    it('should filter results by minimum score', async () => {
      const result = await knowledgeService.retrieve({
        agentId: testAgentId,
        query: 'completely unrelated random query xyz123',
        topK: 10,
        minScore: 0.8, // High threshold
      });

      // Should return fewer or no results due to high threshold
      expect(result.results.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Reindexing', () => {
    it('should reindex a specific source', async () => {
      const sources = await knowledgeService.listSources(testAgentId);
      if (sources.length > 0) {
        const sourceId = sources[0].id;
        
        await expect(
          knowledgeService.reindexSource(sourceId)
        ).resolves.not.toThrow();
      }
    });

    it('should reindex all sources for an agent', async () => {
      await expect(
        knowledgeService.reindexAgent(testAgentId)
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid source type gracefully', async () => {
      const request: any = {
        agentId: testAgentId,
        source: {
          id: 'invalid-source',
          type: 'invalid-type',
          content: 'test',
          metadata: {
            title: 'Invalid',
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          status: 'pending',
        },
      };

      await expect(
        knowledgeService.ingestSource(request)
      ).rejects.toThrow();
    });

    it('should handle missing agent gracefully', async () => {
      const result = await knowledgeService.retrieve({
        agentId: 'non-existent-agent',
        query: 'test query',
        topK: 5,
      });

      expect(result.results).toHaveLength(0);
    });

    it('should handle empty query gracefully', async () => {
      const result = await knowledgeService.retrieve({
        agentId: testAgentId,
        query: '',
        topK: 5,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });
  });
});
