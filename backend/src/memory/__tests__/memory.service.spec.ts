import { Test, TestingModule } from '@nestjs/testing';
import { MemoryService } from '../memory.service';
import { ShortTermMemoryService } from '../short-term-memory.service';
import { LongTermMemoryService } from '../long-term-memory.service';
import { MemoryConsolidationService } from '../memory-consolidation.service';
import {
  CreateMemoryRequest,
  MemoryQuery,
  MemoryConsolidationRequest,
} from '@agentdb9/shared';

describe('MemoryService', () => {
  let service: MemoryService;
  let stmService: ShortTermMemoryService;
  let ltmService: LongTermMemoryService;
  let consolidationService: MemoryConsolidationService;

  const mockSTMService = {
    create: jest.fn(),
    get: jest.fn(),
    query: jest.fn(),
    getRecentInteractions: jest.fn(),
    getSessionStats: jest.fn(),
    clearSession: jest.fn(),
  };

  const mockLTMService = {
    create: jest.fn(),
    get: jest.fn(),
    query: jest.fn(),
    getByCategory: jest.fn(),
    getStats: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockConsolidationService = {
    consolidate: jest.fn(),
    runAutoConsolidation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryService,
        {
          provide: ShortTermMemoryService,
          useValue: mockSTMService,
        },
        {
          provide: LongTermMemoryService,
          useValue: mockLTMService,
        },
        {
          provide: MemoryConsolidationService,
          useValue: mockConsolidationService,
        },
      ],
    }).compile();

    service = module.get<MemoryService>(MemoryService);
    stmService = module.get<ShortTermMemoryService>(ShortTermMemoryService);
    ltmService = module.get<LongTermMemoryService>(LongTermMemoryService);
    consolidationService = module.get<MemoryConsolidationService>(
      MemoryConsolidationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMemory', () => {
    it('should create STM and auto-consolidate to LTM by default', async () => {
      const request: CreateMemoryRequest = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'User asked about TypeScript features',
        metadata: { topic: 'typescript' },
        importance: 0.7,
      };

      const mockSTM = {
        id: 'stm-1',
        ...request,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockSTMService.create.mockResolvedValue(mockSTM);
      mockLTMService.create.mockResolvedValue({
        id: 'ltm-1',
        agentId: 'agent-1',
        category: 'interaction',
        summary: 'User asked about TypeScript features',
        details: 'User asked about TypeScript features',
        importance: 0.7,
      });

      const result = await service.createMemory(request);

      expect(result).toEqual(mockSTM);
      expect(mockSTMService.create).toHaveBeenCalledWith(request);
      expect(mockLTMService.create).toHaveBeenCalledWith(
        'User asked about TypeScript features',
        'User asked about TypeScript features',
        'agent-1',
        'interaction',
        { topic: 'typescript' },
        0.7,
      );
    });

    it('should skip auto-consolidation when disabled in config', async () => {
      const request: CreateMemoryRequest = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Test content',
        importance: 0.5,
      };

      const mockSTM = {
        id: 'stm-1',
        ...request,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockSTMService.create.mockResolvedValue(mockSTM);

      const agentConfig = {
        memory: {
          longTerm: {
            autoConsolidate: false,
          },
        },
      };

      const result = await service.createMemory(request, agentConfig);

      expect(result).toEqual(mockSTM);
      expect(mockSTMService.create).toHaveBeenCalledWith(request);
      expect(mockLTMService.create).not.toHaveBeenCalled();
    });

    it('should handle LTM creation failure gracefully', async () => {
      const request: CreateMemoryRequest = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Test content',
        importance: 0.5,
      };

      const mockSTM = {
        id: 'stm-1',
        ...request,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockSTMService.create.mockResolvedValue(mockSTM);
      mockLTMService.create.mockRejectedValue(new Error('Database error'));

      // Should not throw, just log error
      const result = await service.createMemory(request);

      expect(result).toEqual(mockSTM);
      expect(mockSTMService.create).toHaveBeenCalled();
      expect(mockLTMService.create).toHaveBeenCalled();
    });

    it('should truncate long content for LTM summary', async () => {
      const longContent = 'a'.repeat(300);
      const request: CreateMemoryRequest = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: longContent,
        importance: 0.5,
      };

      mockSTMService.create.mockResolvedValue({
        id: 'stm-1',
        ...request,
        createdAt: new Date(),
        expiresAt: new Date(),
      });
      mockLTMService.create.mockResolvedValue({});

      await service.createMemory(request);

      expect(mockLTMService.create).toHaveBeenCalledWith(
        longContent.substring(0, 200),
        longContent,
        'agent-1',
        'interaction',
        {},
        0.5,
      );
    });
  });

  describe('getMemoryContext', () => {
    it('should retrieve and combine memory context', async () => {
      const agentId = 'agent-1';
      const sessionId = 'session-1';

      const mockInteractions = [
        { id: 'stm-1', content: 'Interaction 1', category: 'interaction' },
        { id: 'stm-2', content: 'Interaction 2', category: 'interaction' },
      ];

      const mockLessons = [
        { id: 'ltm-1', summary: 'Lesson 1', category: 'lesson' },
      ];

      const mockChallenges = [
        { id: 'ltm-2', summary: 'Challenge 1', category: 'challenge' },
      ];

      const mockFeedback = [
        { id: 'ltm-3', summary: 'Feedback 1', category: 'feedback' },
      ];

      mockSTMService.getRecentInteractions.mockResolvedValue(mockInteractions);
      mockLTMService.getByCategory
        .mockResolvedValueOnce(mockLessons)
        .mockResolvedValueOnce(mockChallenges)
        .mockResolvedValueOnce(mockFeedback);

      const result = await service.getMemoryContext(agentId, sessionId);

      expect(result).toBeDefined();
      expect(result.agentId).toBe(agentId);
      expect(result.sessionId).toBe(sessionId);
      expect(result.recentInteractions).toEqual(mockInteractions);
      expect(result.relevantLessons).toEqual(mockLessons);
      expect(result.relevantChallenges).toEqual(mockChallenges);
      expect(result.relevantFeedback).toEqual(mockFeedback);
      expect(result.totalMemories).toBe(5);
      expect(result.summary).toContain('2 recent interactions');
      expect(result.summary).toContain('1 learned lessons');
      expect(result.retrievalTime).toBeGreaterThanOrEqual(0);

      expect(mockSTMService.getRecentInteractions).toHaveBeenCalledWith(
        agentId,
        sessionId,
        10,
      );
      expect(mockLTMService.getByCategory).toHaveBeenCalledWith(
        agentId,
        'lesson',
        5,
      );
      expect(mockLTMService.getByCategory).toHaveBeenCalledWith(
        agentId,
        'challenge',
        5,
      );
      expect(mockLTMService.getByCategory).toHaveBeenCalledWith(
        agentId,
        'feedback',
        5,
      );
    });

    it('should handle empty memory context', async () => {
      mockSTMService.getRecentInteractions.mockResolvedValue([]);
      mockLTMService.getByCategory.mockResolvedValue([]);

      const result = await service.getMemoryContext('agent-1', 'session-1');

      expect(result.totalMemories).toBe(0);
      expect(result.summary).toBe('No memory context available');
    });

    it('should handle errors during context retrieval', async () => {
      mockSTMService.getRecentInteractions.mockRejectedValue(
        new Error('STM error'),
      );

      await expect(
        service.getMemoryContext('agent-1', 'session-1'),
      ).rejects.toThrow('STM error');
    });
  });

  describe('queryMemories', () => {
    it('should query both STM and LTM and combine results', async () => {
      const query: MemoryQuery = {
        agentId: 'agent-1',
        query: 'typescript',
        category: 'interaction',
        limit: 10,
      };

      const stmResult = {
        memories: [
          { id: 'stm-1', content: 'TypeScript question' },
          { id: 'stm-2', content: 'TypeScript answer' },
        ],
        totalCount: 2,
        processingTime: 10,
      };

      const ltmResult = {
        memories: [{ id: 'ltm-1', summary: 'TypeScript lesson' }],
        totalCount: 1,
        processingTime: 15,
      };

      mockSTMService.query.mockResolvedValue(stmResult);
      mockLTMService.query.mockResolvedValue(ltmResult);

      const result = await service.queryMemories(query);

      expect(result.memories).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(result.query).toBe('typescript');
      expect(result.processingTime).toBe(25);
      expect(mockSTMService.query).toHaveBeenCalledWith(query);
      expect(mockLTMService.query).toHaveBeenCalledWith(query);
    });

    it('should handle empty query results', async () => {
      const query: MemoryQuery = {
        agentId: 'agent-1',
        limit: 10,
      };

      mockSTMService.query.mockResolvedValue({
        memories: [],
        totalCount: 0,
        processingTime: 5,
      });
      mockLTMService.query.mockResolvedValue({
        memories: [],
        totalCount: 0,
        processingTime: 5,
      });

      const result = await service.queryMemories(query);

      expect(result.memories).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.query).toBe('');
    });
  });

  describe('getMemoriesByAgent', () => {
    it('should get both short-term and long-term memories by default', async () => {
      const agentId = 'agent-1';

      mockSTMService.query.mockResolvedValue({
        memories: [{ id: 'stm-1' }],
        totalCount: 1,
      });
      mockLTMService.query.mockResolvedValue({
        memories: [{ id: 'ltm-1' }],
        totalCount: 1,
      });

      const result = await service.getMemoriesByAgent(agentId);

      expect(result.shortTerm).toHaveLength(1);
      expect(result.longTerm).toHaveLength(1);
      expect(mockSTMService.query).toHaveBeenCalledWith({
        agentId,
        limit: 100,
      });
      expect(mockLTMService.query).toHaveBeenCalledWith({
        agentId,
        limit: 100,
      });
    });

    it('should get only short-term memories when specified', async () => {
      const agentId = 'agent-1';

      mockSTMService.query.mockResolvedValue({
        memories: [{ id: 'stm-1' }],
        totalCount: 1,
      });

      const result = await service.getMemoriesByAgent(agentId, 'short-term');

      expect(result.shortTerm).toHaveLength(1);
      expect(result.longTerm).toBeUndefined();
      expect(mockSTMService.query).toHaveBeenCalled();
      expect(mockLTMService.query).not.toHaveBeenCalled();
    });

    it('should get only long-term memories when specified', async () => {
      const agentId = 'agent-1';

      mockLTMService.query.mockResolvedValue({
        memories: [{ id: 'ltm-1' }],
        totalCount: 1,
      });

      const result = await service.getMemoriesByAgent(agentId, 'long-term');

      expect(result.shortTerm).toBeUndefined();
      expect(result.longTerm).toHaveLength(1);
      expect(mockSTMService.query).not.toHaveBeenCalled();
      expect(mockLTMService.query).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should combine STM and LTM statistics', async () => {
      const agentId = 'agent-1';

      const stmStats = {
        total: 10,
        byCategory: { interaction: 8, feedback: 2 },
        averageImportance: 0.6,
        oldestEntry: new Date('2024-01-01'),
        newestEntry: new Date('2024-01-10'),
      };

      const ltmStats = {
        total: 50,
        byCategory: { lesson: 30, challenge: 15, feedback: 5 },
        averageImportance: 0.75,
        totalAccesses: 200,
        mostAccessed: { id: 'ltm-1', accessCount: 50 },
      };

      mockSTMService.getSessionStats.mockResolvedValue(stmStats);
      mockLTMService.getStats.mockResolvedValue(ltmStats);

      const result = await service.getStats(agentId);

      expect(result.agentId).toBe(agentId);
      expect(result.shortTerm).toEqual(stmStats);
      expect(result.longTerm).toEqual(ltmStats);
      expect(result.consolidation).toBeDefined();
      expect(mockSTMService.getSessionStats).toHaveBeenCalledWith(
        agentId,
        'all',
      );
      expect(mockLTMService.getStats).toHaveBeenCalledWith(agentId);
    });
  });

  describe('consolidate', () => {
    it('should delegate to consolidation service', async () => {
      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        minImportance: 0.5,
      };

      const mockResult = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        consolidatedCount: 5,
        ltmCreated: 2,
        stmRetained: 3,
        duration: 100,
      };

      mockConsolidationService.consolidate.mockResolvedValue(mockResult);

      const result = await service.consolidate(request);

      expect(result).toEqual(mockResult);
      expect(mockConsolidationService.consolidate).toHaveBeenCalledWith(
        request,
      );
    });
  });

  describe('runAutoConsolidation', () => {
    it('should run auto-consolidation for multiple agents', async () => {
      const agentIds = ['agent-1', 'agent-2', 'agent-3'];

      const mockResults = agentIds.map((id) => ({
        agentId: id,
        consolidatedCount: 5,
        ltmCreated: 2,
        duration: 100,
      }));

      mockConsolidationService.runAutoConsolidation
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const results = await service.runAutoConsolidation(agentIds);

      expect(results).toHaveLength(3);
      expect(results).toEqual(mockResults);
      expect(
        mockConsolidationService.runAutoConsolidation,
      ).toHaveBeenCalledTimes(3);
    });

    it('should continue on individual agent failures', async () => {
      const agentIds = ['agent-1', 'agent-2', 'agent-3'];

      mockConsolidationService.runAutoConsolidation
        .mockResolvedValueOnce({ agentId: 'agent-1', consolidatedCount: 5 })
        .mockRejectedValueOnce(new Error('Agent 2 failed'))
        .mockResolvedValueOnce({ agentId: 'agent-3', consolidatedCount: 3 });

      const results = await service.runAutoConsolidation(agentIds);

      expect(results).toHaveLength(2);
      expect(results[0].agentId).toBe('agent-1');
      expect(results[1].agentId).toBe('agent-3');
    });
  });

  describe('clearSession', () => {
    it('should clear session memories from STM', async () => {
      const agentId = 'agent-1';
      const sessionId = 'session-1';

      mockSTMService.clearSession.mockResolvedValue(undefined);

      await service.clearSession(agentId, sessionId);

      expect(mockSTMService.clearSession).toHaveBeenCalledWith(
        agentId,
        sessionId,
      );
    });
  });
});
