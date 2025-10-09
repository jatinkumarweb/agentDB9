import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeService } from '../knowledge.service';
import { DocumentLoaderService } from '../loaders/document-loader.service';
import { ChunkingService } from '../chunking/chunking.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { KnowledgeSource } from '../../entities/knowledge-source.entity';
import { DocumentChunk } from '../../entities/document-chunk.entity';

describe('KnowledgeService', () => {
  let service: KnowledgeService;
  let sourceRepository: Repository<KnowledgeSource>;
  let chunkRepository: Repository<DocumentChunk>;
  let documentLoader: DocumentLoaderService;
  let chunking: ChunkingService;
  let embedding: EmbeddingService;
  let vectorStore: VectorStoreService;

  const mockSourceRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };

  const mockChunkRepository = {
    find: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  };

  const mockDocumentLoader = {
    load: jest.fn(),
    loadDocument: jest.fn(),
  };

  const mockChunking = {
    chunk: jest.fn(),
  };

  const mockEmbedding = {
    generate: jest.fn(),
    generateSingle: jest.fn(),
  };

  const mockVectorStore = {
    addDocuments: jest.fn(),
    search: jest.fn(),
    deleteBySource: jest.fn(),
    deleteByAgent: jest.fn(),
    getChunkCount: jest.fn(),
    getTotalTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        {
          provide: getRepositoryToken(KnowledgeSource),
          useValue: mockSourceRepository,
        },
        {
          provide: getRepositoryToken(DocumentChunk),
          useValue: mockChunkRepository,
        },
        {
          provide: DocumentLoaderService,
          useValue: mockDocumentLoader,
        },
        {
          provide: ChunkingService,
          useValue: mockChunking,
        },
        {
          provide: EmbeddingService,
          useValue: mockEmbedding,
        },
        {
          provide: VectorStoreService,
          useValue: mockVectorStore,
        },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
    sourceRepository = module.get<Repository<KnowledgeSource>>(
      getRepositoryToken(KnowledgeSource),
    );
    chunkRepository = module.get<Repository<DocumentChunk>>(
      getRepositoryToken(DocumentChunk),
    );
    documentLoader = module.get<DocumentLoaderService>(DocumentLoaderService);
    chunking = module.get<ChunkingService>(ChunkingService);
    embedding = module.get<EmbeddingService>(EmbeddingService);
    vectorStore = module.get<VectorStoreService>(VectorStoreService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ingestSource', () => {
    it('should successfully ingest a markdown source', async () => {
      const request = {
        agentId: 'agent-1',
        source: {
          id: 'source-1',
          type: 'markdown' as const,
          content: '# Test\n\nContent here',
          metadata: {
            title: 'Test Doc',
            tags: ['test'],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          status: 'pending' as const,
        },
        options: {
          chunkSize: 500,
          chunkOverlap: 50,
          generateEmbeddings: true,
        },
      };

      const mockSource = {
        id: 'source-1',
        agentId: 'agent-1',
        type: 'markdown',
        content: '# Test\n\nContent here',
        metadata: request.source.metadata,
        status: 'pending',
      };

      const mockDocument = {
        content: '# Test\n\nContent here',
        metadata: {
          title: 'Test Doc',
          source: 'markdown',
          language: 'markdown',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        sections: [],
        codeBlocks: [],
      };

      const mockChunks = [
        {
          id: 'chunk-1',
          sourceId: 'source-1',
          agentId: 'agent-1',
          content: '# Test',
          embedding: [0.1, 0.2, 0.3],
          metadata: {
            title: 'Test Doc',
            chunkIndex: 0,
            totalChunks: 2,
            startOffset: 0,
            endOffset: 6,
          },
          createdAt: new Date(),
        },
        {
          id: 'chunk-2',
          sourceId: 'source-1',
          agentId: 'agent-1',
          content: 'Content here',
          embedding: [0.4, 0.5, 0.6],
          metadata: {
            title: 'Test Doc',
            chunkIndex: 1,
            totalChunks: 2,
            startOffset: 8,
            endOffset: 20,
          },
          createdAt: new Date(),
        },
      ];

      mockSourceRepository.findOne.mockResolvedValue(null);
      mockSourceRepository.create.mockReturnValue(mockSource);
      mockSourceRepository.save.mockResolvedValue(mockSource);
      mockDocumentLoader.loadDocument.mockResolvedValue(mockDocument);
      mockChunking.chunk.mockReturnValue(mockChunks);
      mockEmbedding.generate.mockResolvedValue([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ]);
      mockVectorStore.addDocuments.mockResolvedValue(undefined);

      const result = await service.ingestSource(request);

      expect(result).toBeDefined();
      expect(result.sourceId).toBe('source-1');
      expect(result.status).toBe('success');
      expect(result.chunksCreated).toBe(2);
      expect(mockDocumentLoader.loadDocument).toHaveBeenCalled();
      expect(mockChunking.chunk).toHaveBeenCalled();
      expect(mockEmbedding.generate).toHaveBeenCalled();
      expect(mockVectorStore.addDocuments).toHaveBeenCalled();
    });

    it('should handle ingestion errors gracefully', async () => {
      const request = {
        agentId: 'agent-1',
        source: {
          id: 'source-1',
          type: 'markdown' as const,
          content: '# Test',
          metadata: {
            title: 'Test',
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          status: 'pending' as const,
        },
      };

      mockSourceRepository.findOne.mockResolvedValue(null);
      mockSourceRepository.create.mockReturnValue({});
      mockSourceRepository.save.mockResolvedValue({});
      mockDocumentLoader.loadDocument.mockRejectedValue(new Error('Load failed'));

      const result = await service.ingestSource(request);

      expect(result.status).toBe('failed');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('retrieve', () => {
    it('should retrieve relevant chunks', async () => {
      const request = {
        agentId: 'agent-1',
        query: 'test query',
        topK: 5,
      };

      const mockSearchResults = [
        {
          chunk: {
            id: 'chunk-1',
            content: 'Relevant content',
            metadata: { title: 'Doc 1' },
          },
          score: 0.95,
        },
        {
          chunk: {
            id: 'chunk-2',
            content: 'More content',
            metadata: { title: 'Doc 2' },
          },
          score: 0.85,
        },
      ];

      mockEmbedding.generateSingle.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorStore.search.mockResolvedValue(mockSearchResults);

      const result = await service.retrieve(request);

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(2);
      expect(result.results[0].score).toBe(0.95);
      expect(mockEmbedding.generateSingle).toHaveBeenCalledWith('test query', expect.any(Object));
      expect(mockVectorStore.search).toHaveBeenCalled();
    });
  });

  describe('addSource', () => {
    it('should add a new knowledge source', async () => {
      const source = {
        id: 'source-1',
        type: 'markdown' as const,
        content: '# Test',
        metadata: {
          title: 'Test',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        status: 'pending' as const,
      };

      const mockSource = {
        ...source,
        agentId: 'agent-1',
      };

      mockSourceRepository.create.mockReturnValue(mockSource);
      mockSourceRepository.save.mockResolvedValue(mockSource);

      await service.addSource('agent-1', source);

      expect(mockSourceRepository.create).toHaveBeenCalled();
      expect(mockSourceRepository.save).toHaveBeenCalled();
    });
  });

  describe('listSources', () => {
    it('should list all sources for an agent', async () => {
      const mockSources = [
        {
          id: 'source-1',
          agentId: 'agent-1',
          type: 'markdown',
          metadata: { title: 'Doc 1' },
        },
        {
          id: 'source-2',
          agentId: 'agent-1',
          type: 'website',
          metadata: { title: 'Doc 2' },
        },
      ];

      mockSourceRepository.find.mockResolvedValue(mockSources);

      const result = await service.listSources('agent-1');

      expect(result).toHaveLength(2);
      expect(mockSourceRepository.find).toHaveBeenCalledWith({
        where: { agentId: 'agent-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('deleteSource', () => {
    it('should delete a source and its chunks', async () => {
      const mockSource = {
        id: 'source-1',
        agentId: 'agent-1',
      };

      mockSourceRepository.findOne.mockResolvedValue(mockSource);
      mockSourceRepository.delete.mockResolvedValue({ affected: 1 });
      mockVectorStore.deleteBySource.mockResolvedValue(undefined);

      await service.deleteSource('source-1');

      expect(mockVectorStore.deleteBySource).toHaveBeenCalledWith('source-1');
      expect(mockSourceRepository.delete).toHaveBeenCalledWith('source-1');
    });
  });

  describe('getStats', () => {
    it('should return knowledge base statistics', async () => {
      const mockSources = [
        { id: 'source-1', status: 'indexed' },
        { id: 'source-2', status: 'indexed' },
        { id: 'source-3', status: 'failed' },
      ];

      mockSourceRepository.find.mockResolvedValue(mockSources);
      mockVectorStore.getChunkCount.mockResolvedValue(150);
      mockVectorStore.getTotalTokens.mockResolvedValue(50000);

      const result = await service.getStats('agent-1');

      expect(result).toBeDefined();
      expect(result.agentId).toBe('agent-1');
      expect(result.totalSources).toBe(3);
      expect(result.totalChunks).toBe(150);
      expect(result.totalTokens).toBe(50000);
      expect(result.sourcesByType).toBeDefined();
    });
  });

  describe('getAgentKnowledgeContext', () => {
    it('should return agent knowledge context', async () => {
      const mockSearchResults = [
        {
          chunk: {
            id: 'chunk-1',
            content: 'Relevant content',
            metadata: { title: 'Doc 1' },
          },
          score: 0.95,
        },
      ];

      const mockSources = [
        {
          id: 'source-1',
          type: 'markdown',
          metadata: { title: 'Doc 1' },
        },
      ];

      mockEmbedding.generateSingle.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorStore.search.mockResolvedValue(mockSearchResults);
      mockSourceRepository.find.mockResolvedValue(mockSources);

      const result = await service.getAgentKnowledgeContext('agent-1', 'test query', 5);

      expect(result).toBeDefined();
      expect(result.agentId).toBe('agent-1');
      expect(result.relevantChunks).toHaveLength(1);
      expect(result.sources).toHaveLength(1);
      expect(result.totalRelevance).toBeGreaterThan(0);
    });
  });
});
