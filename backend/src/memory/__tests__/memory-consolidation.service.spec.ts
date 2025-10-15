import { Test, TestingModule } from '@nestjs/testing';
import { MemoryConsolidationService } from '../memory-consolidation.service';
import { ShortTermMemoryService } from '../short-term-memory.service';
import { LongTermMemoryService } from '../long-term-memory.service';
import {
  MemoryConsolidationRequest,
  ShortTermMemory,
} from '@agentdb9/shared';

describe('MemoryConsolidationService', () => {
  let service: MemoryConsolidationService;
  let stmService: ShortTermMemoryService;
  let ltmService: LongTermMemoryService;

  const mockSTMService = {
    getConsolidationCandidates: jest.fn(),
    archive: jest.fn(),
  };

  const mockLTMService = {
    create: jest.fn(),
    update: jest.fn(),
    getByCategory: jest.fn(),
  };

  const createMockMemory = (
    id: string,
    category: string,
    content: string,
    importance: number,
  ): ShortTermMemory => ({
    id,
    agentId: 'agent-1',
    sessionId: 'session-1',
    category: category as any,
    content,
    importance,
    metadata: {
      tags: [],
      keywords: [],
      confidence: 0.8,
      relevance: 0.7,
      source: 'chat',
    },
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryConsolidationService,
        {
          provide: ShortTermMemoryService,
          useValue: mockSTMService,
        },
        {
          provide: LongTermMemoryService,
          useValue: mockLTMService,
        },
      ],
    }).compile();

    service = module.get<MemoryConsolidationService>(
      MemoryConsolidationService,
    );
    stmService = module.get<ShortTermMemoryService>(ShortTermMemoryService);
    ltmService = module.get<LongTermMemoryService>(LongTermMemoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('consolidate', () => {
    it('should consolidate memories with summarize strategy', async () => {
      const candidates = [
        createMockMemory('stm-1', 'interaction', 'User asked about TypeScript', 0.7),
        createMockMemory('stm-2', 'interaction', 'User asked about React', 0.6),
        createMockMemory('stm-3', 'lesson', 'Learned about async/await', 0.8),
      ];

      mockSTMService.getConsolidationCandidates.mockResolvedValue(candidates);
      mockLTMService.create.mockResolvedValue({ id: 'ltm-1' });
      mockSTMService.archive.mockResolvedValue(undefined);

      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
        strategy: 'summarize',
        minImportance: 0.5,
      };

      const result = await service.consolidate(request);

      expect(result).toBeDefined();
      expect(result.agentId).toBe('agent-1');
      expect(result.strategy).toBe('summarize');
      expect(result.stmProcessed).toBe(3);
      expect(result.ltmCreated).toBe(2); // 2 categories
      expect(result.stmArchived).toBe(3);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.summary).toContain('summarize');

      expect(mockSTMService.getConsolidationCandidates).toHaveBeenCalledWith(
        'agent-1',
        0.5,
        0,
      );
      expect(mockLTMService.create).toHaveBeenCalledTimes(2);
      expect(mockSTMService.archive).toHaveBeenCalledWith([
        'stm-1',
        'stm-2',
        'stm-3',
      ]);
    });

    it('should use default strategy if not provided', async () => {
      mockSTMService.getConsolidationCandidates.mockResolvedValue([]);
      mockSTMService.archive.mockResolvedValue(undefined);

      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
      };

      const result = await service.consolidate(request);

      expect(result.strategy).toBe('summarize');
    });

    it('should use default minImportance if not provided', async () => {
      mockSTMService.getConsolidationCandidates.mockResolvedValue([]);
      mockSTMService.archive.mockResolvedValue(undefined);

      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
      };

      await service.consolidate(request);

      expect(mockSTMService.getConsolidationCandidates).toHaveBeenCalledWith(
        'agent-1',
        0.4,
        0,
      );
    });

    it('should handle empty candidates', async () => {
      mockSTMService.getConsolidationCandidates.mockResolvedValue([]);
      mockSTMService.archive.mockResolvedValue(undefined);

      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
        strategy: 'summarize',
      };

      const result = await service.consolidate(request);

      expect(result.stmProcessed).toBe(0);
      expect(result.ltmCreated).toBe(0);
      expect(result.stmArchived).toBe(0);
    });

    it('should handle consolidation errors', async () => {
      mockSTMService.getConsolidationCandidates.mockRejectedValue(
        new Error('Database error'),
      );

      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
      };

      await expect(service.consolidate(request)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('summarize strategy', () => {
    it('should group memories by category and create summaries', async () => {
      const candidates = [
        createMockMemory('stm-1', 'interaction', 'Question 1', 0.7),
        createMockMemory('stm-2', 'interaction', 'Question 2', 0.6),
        createMockMemory('stm-3', 'lesson', 'Lesson 1', 0.8),
        createMockMemory('stm-4', 'lesson', 'Lesson 2', 0.9),
      ];

      mockSTMService.getConsolidationCandidates.mockResolvedValue(candidates);
      mockLTMService.create.mockResolvedValue({ id: 'ltm-1' });
      mockSTMService.archive.mockResolvedValue(undefined);

      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
        strategy: 'summarize',
      };

      const result = await service.consolidate(request);

      expect(result.ltmCreated).toBe(2); // 2 categories
      expect(mockLTMService.create).toHaveBeenCalledTimes(2);

      // Verify LTM creation calls
      const createCalls = mockLTMService.create.mock.calls;
      expect(createCalls[0][2]).toEqual('agent-1'); // agentId (3rd param)
      expect(createCalls[0][3]).toMatch(/interaction|lesson/); // category (4th param)
    });

    it('should calculate average importance', async () => {
      const candidates = [
        createMockMemory('stm-1', 'interaction', 'Memory 1', 0.8),
        createMockMemory('stm-2', 'interaction', 'Memory 2', 0.6),
      ];

      mockSTMService.getConsolidationCandidates.mockResolvedValue(candidates);
      mockLTMService.create.mockResolvedValue({ id: 'ltm-1' });
      mockSTMService.archive.mockResolvedValue(undefined);

      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
        strategy: 'summarize',
      };

      await service.consolidate(request);

      const createCall = mockLTMService.create.mock.calls[0];
      const importance = createCall[5]; // importance parameter (6th param, index 5)
      expect(importance).toBeCloseTo(0.7, 1); // Average of 0.8 and 0.6
    });

    it('should merge metadata from multiple memories', async () => {
      const candidates = [
        {
          ...createMockMemory('stm-1', 'interaction', 'Memory 1', 0.7),
          metadata: {
            tags: ['typescript', 'question'],
            keywords: ['type'],
            confidence: 0.8,
            relevance: 0.7,
            source: 'chat' as const,
            workspaceId: 'ws-1',
          },
        },
        {
          ...createMockMemory('stm-2', 'interaction', 'Memory 2', 0.6),
          metadata: {
            tags: ['react', 'question'],
            keywords: ['component'],
            confidence: 0.8,
            relevance: 0.7,
            source: 'chat' as const,
            projectId: 'proj-1',
          },
        },
      ];

      mockSTMService.getConsolidationCandidates.mockResolvedValue(candidates);
      mockLTMService.create.mockResolvedValue({ id: 'ltm-1' });
      mockSTMService.archive.mockResolvedValue(undefined);

      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
        strategy: 'summarize',
      };

      await service.consolidate(request);

      const createCall = mockLTMService.create.mock.calls[0];
      const metadata = createCall[4]; // metadata parameter (5th param, index 4)

      expect(metadata.tags).toContain('typescript');
      expect(metadata.tags).toContain('react');
      expect(metadata.keywords).toContain('type');
      expect(metadata.keywords).toContain('component');
      expect(metadata.workspaceId).toBe('ws-1');
      expect(metadata.projectId).toBe('proj-1');
    });
  });

  describe('promote strategy', () => {
    it('should promote high-importance memories directly', async () => {
      const candidates = [
        createMockMemory('stm-1', 'interaction', 'Important memory', 0.9),
        createMockMemory('stm-2', 'interaction', 'Very important', 0.85),
        createMockMemory('stm-3', 'interaction', 'Low importance', 0.5),
      ];

      mockSTMService.getConsolidationCandidates.mockResolvedValue(candidates);
      mockLTMService.create.mockResolvedValue({ id: 'ltm-1' });
      mockSTMService.archive.mockResolvedValue(undefined);

      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
        strategy: 'promote',
      };

      const result = await service.consolidate(request);

      expect(result.ltmCreated).toBe(2); // Only >= 0.8
      expect(result.stmProcessed).toBe(2);
      expect(result.stmArchived).toBe(2);
      expect(mockLTMService.create).toHaveBeenCalledTimes(2);
    });

    it('should preserve original content and metadata', async () => {
      const candidates = [
        createMockMemory('stm-1', 'lesson', 'Important lesson content', 0.9),
      ];

      mockSTMService.getConsolidationCandidates.mockResolvedValue(candidates);
      mockLTMService.create.mockResolvedValue({ id: 'ltm-1' });
      mockSTMService.archive.mockResolvedValue(undefined);

      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
        strategy: 'promote',
      };

      await service.consolidate(request);

      const createCall = mockLTMService.create.mock.calls[0];
      expect(createCall[1]).toBe('Important lesson content'); // details (2nd param)
      expect(createCall[2]).toBe('agent-1'); // agentId (3rd param)
      expect(createCall[3]).toBe('lesson'); // category (4th param)
      expect(createCall[5]).toBe(0.9); // importance (6th param)
    });
  });

  describe('merge strategy', () => {
    it('should merge STMs with existing LTMs', async () => {
      const candidates = [
        createMockMemory('stm-1', 'lesson', 'New lesson 1', 0.7),
        createMockMemory('stm-2', 'lesson', 'New lesson 2', 0.6),
      ];

      const existingLTMs = [
        {
          id: 'ltm-1',
          agentId: 'agent-1',
          category: 'lesson',
          summary: 'Existing lesson summary',
          details: 'Existing details',
          metadata: { existing: 'data' },
          importance: 0.8,
        },
      ];

      mockSTMService.getConsolidationCandidates.mockResolvedValue(candidates);
      mockLTMService.getByCategory.mockResolvedValue(existingLTMs);
      mockLTMService.update.mockResolvedValue({ id: 'ltm-1' });
      mockSTMService.archive.mockResolvedValue(undefined);

      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
        strategy: 'merge',
      };

      const result = await service.consolidate(request);

      expect(result.ltmUpdated).toBe(1);
      expect(result.stmProcessed).toBe(2);
      expect(result.stmArchived).toBe(2);
      expect(mockLTMService.update).toHaveBeenCalledWith('ltm-1', {
        summary: expect.stringContaining('Updated with 2 new insights'),
        metadata: expect.objectContaining({
          existing: 'data',
          lastConsolidation: expect.any(Date),
        }),
      });
    });

    it('should handle categories without existing LTMs', async () => {
      const candidates = [
        createMockMemory('stm-1', 'lesson', 'New lesson', 0.7),
      ];

      mockSTMService.getConsolidationCandidates.mockResolvedValue(candidates);
      mockLTMService.getByCategory.mockResolvedValue([]);
      mockSTMService.archive.mockResolvedValue(undefined);

      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
        strategy: 'merge',
      };

      const result = await service.consolidate(request);

      expect(result.ltmUpdated).toBe(0);
      expect(result.stmProcessed).toBe(0);
      expect(mockLTMService.update).not.toHaveBeenCalled();
    });
  });

  describe('archive strategy', () => {
    it('should archive memories without creating LTMs', async () => {
      const candidates = [
        createMockMemory('stm-1', 'interaction', 'Old memory 1', 0.3),
        createMockMemory('stm-2', 'interaction', 'Old memory 2', 0.2),
      ];

      mockSTMService.getConsolidationCandidates.mockResolvedValue(candidates);
      mockSTMService.archive.mockResolvedValue(undefined);

      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
        strategy: 'archive',
      };

      const result = await service.consolidate(request);

      expect(result.stmProcessed).toBe(2);
      expect(result.ltmCreated).toBe(0);
      expect(result.ltmUpdated).toBe(0);
      expect(result.stmArchived).toBe(2);
      expect(mockLTMService.create).not.toHaveBeenCalled();
      expect(mockSTMService.archive).toHaveBeenCalledWith(['stm-1', 'stm-2']);
    });
  });

  describe('runAutoConsolidation', () => {
    it('should run consolidation with default parameters', async () => {
      mockSTMService.getConsolidationCandidates.mockResolvedValue([]);
      mockSTMService.archive.mockResolvedValue(undefined);

      const result = await service.runAutoConsolidation('agent-1');

      expect(result).toBeDefined();
      expect(result.agentId).toBe('agent-1');
      expect(result.strategy).toBe('summarize');
      expect(mockSTMService.getConsolidationCandidates).toHaveBeenCalledWith(
        'agent-1',
        0.6,
        24,
      );
    });

    it('should use summarize strategy by default', async () => {
      const candidates = [
        createMockMemory('stm-1', 'interaction', 'Memory 1', 0.7),
      ];

      mockSTMService.getConsolidationCandidates.mockResolvedValue(candidates);
      mockLTMService.create.mockResolvedValue({ id: 'ltm-1' });
      mockSTMService.archive.mockResolvedValue(undefined);

      const result = await service.runAutoConsolidation('agent-1');

      expect(result.strategy).toBe('summarize');
      expect(mockLTMService.create).toHaveBeenCalled();
    });
  });

  describe('helper methods', () => {
    it('should create appropriate summary text', async () => {
      const candidates = [
        createMockMemory('stm-1', 'interaction', 'Memory 1', 0.7),
        createMockMemory('stm-2', 'interaction', 'Memory 2', 0.6),
      ];

      mockSTMService.getConsolidationCandidates.mockResolvedValue(candidates);
      mockLTMService.create.mockResolvedValue({ id: 'ltm-1' });
      mockSTMService.archive.mockResolvedValue(undefined);

      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
        strategy: 'summarize',
      };

      await service.consolidate(request);

      const createCall = mockLTMService.create.mock.calls[0];
      const summary = createCall[0]; // summary parameter

      expect(summary).toContain('Consolidated');
      expect(summary).toContain('2');
      expect(summary).toContain('interaction');
    });

    it('should create detailed content from memories', async () => {
      const candidates = [
        createMockMemory('stm-1', 'interaction', 'First memory', 0.7),
        createMockMemory('stm-2', 'interaction', 'Second memory', 0.6),
      ];

      mockSTMService.getConsolidationCandidates.mockResolvedValue(candidates);
      mockLTMService.create.mockResolvedValue({ id: 'ltm-1' });
      mockSTMService.archive.mockResolvedValue(undefined);

      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
        strategy: 'summarize',
      };

      await service.consolidate(request);

      const createCall = mockLTMService.create.mock.calls[0];
      const details = createCall[1]; // details parameter

      expect(details).toContain('[1] First memory');
      expect(details).toContain('[2] Second memory');
    });

    it('should build comprehensive result summary', async () => {
      const candidates = [
        createMockMemory('stm-1', 'interaction', 'Memory 1', 0.7),
        createMockMemory('stm-2', 'lesson', 'Memory 2', 0.8),
      ];

      mockSTMService.getConsolidationCandidates.mockResolvedValue(candidates);
      mockLTMService.create.mockResolvedValue({ id: 'ltm-1' });
      mockSTMService.archive.mockResolvedValue(undefined);

      const request: MemoryConsolidationRequest = {
        agentId: 'agent-1',
        strategy: 'summarize',
      };

      const result = await service.consolidate(request);

      expect(result.summary).toContain('Strategy: summarize');
      expect(result.summary).toContain('Processed 2 STM entries');
      expect(result.summary).toContain('Created 2 LTM entries');
      expect(result.summary).toContain('Archived 2 STM entries');
    });
  });
});
