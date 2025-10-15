import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LongTermMemoryService } from '../long-term-memory.service';
import { LongTermMemoryEntity } from '../../entities/long-term-memory.entity';
import { MemoryQuery, UpdateMemoryRequest } from '@agentdb9/shared';

describe('LongTermMemoryService', () => {
  let service: LongTermMemoryService;
  let repository: Repository<LongTermMemoryEntity>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LongTermMemoryService,
        {
          provide: getRepositoryToken(LongTermMemoryEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<LongTermMemoryService>(LongTermMemoryService);
    repository = module.get<Repository<LongTermMemoryEntity>>(
      getRepositoryToken(LongTermMemoryEntity),
    );

    // Reset query builder
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a long-term memory entry', async () => {
      const mockEntity = {
        id: 'ltm-1',
        agentId: 'agent-1',
        category: 'lesson',
        summary: 'Learned about TypeScript',
        details: 'User learned about TypeScript generics and type inference',
        metadata: { topic: 'typescript' },
        importance: 0.8,
        accessCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockResolvedValue(mockEntity);

      const result = await service.create(
        'Learned about TypeScript',
        'User learned about TypeScript generics and type inference',
        'agent-1',
        'lesson',
        { topic: 'typescript' },
        0.8,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('ltm-1');
      expect(result.agentId).toBe('agent-1');
      expect(result.category).toBe('lesson');
      expect(result.summary).toBe('Learned about TypeScript');
      expect(result.importance).toBe(0.8);
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should use default importance if not provided', async () => {
      const mockEntity = {
        id: 'ltm-1',
        agentId: 'agent-1',
        category: 'lesson',
        summary: 'Test',
        details: 'Test details',
        metadata: {},
        importance: 0.7,
        accessCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockResolvedValue(mockEntity);

      const result = await service.create(
        'Test',
        'Test details',
        'agent-1',
        'lesson',
        {},
      );

      expect(result.importance).toBe(0.7);
    });

    it('should handle optional parameters', async () => {
      const mockEntity = {
        id: 'ltm-1',
        agentId: 'agent-1',
        category: 'lesson',
        summary: 'Test',
        details: 'Test details',
        metadata: {},
        importance: 0.7,
        accessCount: 0,
        consolidatedFrom: ['stm-1', 'stm-2'],
        projectId: 'project-1',
        workspaceId: 'workspace-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockResolvedValue(mockEntity);

      const result = await service.create(
        'Test',
        'Test details',
        'agent-1',
        'lesson',
        {},
        0.7,
        ['stm-1', 'stm-2'],
        'project-1',
        'workspace-1',
      );

      expect(result.consolidatedFrom).toEqual(['stm-1', 'stm-2']);
      expect(result.projectId).toBe('project-1');
      expect(result.workspaceId).toBe('workspace-1');
    });

    it('should handle creation errors', async () => {
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.create('Test', 'Test details', 'agent-1', 'lesson', {}),
      ).rejects.toThrow('Database error');
    });
  });

  describe('get', () => {
    it('should retrieve memory by ID and update access count', async () => {
      const mockEntity = {
        id: 'ltm-1',
        agentId: 'agent-1',
        category: 'lesson',
        summary: 'Test',
        details: 'Test details',
        metadata: {},
        importance: 0.7,
        accessCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockEntity);
      mockRepository.save.mockResolvedValue({
        ...mockEntity,
        accessCount: 6,
        lastAccessedAt: new Date(),
      });

      const result = await service.get('ltm-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('ltm-1');
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'ltm-1' },
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should return null for non-existent memory', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.get('non-existent');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockRepository.findOne.mockRejectedValue(new Error('Database error'));

      const result = await service.get('ltm-1');

      expect(result).toBeNull();
    });
  });

  describe('query', () => {
    it('should query memories by agentId', async () => {
      const mockEntities = [
        {
          id: 'ltm-1',
          agentId: 'agent-1',
          category: 'lesson',
          summary: 'Lesson 1',
          details: 'Details 1',
          metadata: {},
          importance: 0.8,
          accessCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'ltm-2',
          agentId: 'agent-1',
          category: 'challenge',
          summary: 'Challenge 1',
          details: 'Details 2',
          metadata: {},
          importance: 0.7,
          accessCount: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);

      const query: MemoryQuery = {
        agentId: 'agent-1',
        limit: 10,
      };

      const result = await service.query(query);

      expect(result.memories).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'ltm.agentId = :agentId',
        { agentId: 'agent-1' },
      );
    });

    it('should filter by category', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const query: MemoryQuery = {
        agentId: 'agent-1',
        category: 'lesson',
        limit: 10,
      };

      await service.query(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'ltm.category = :category',
        { category: 'lesson' },
      );
    });

    it('should filter by workspaceId', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const query: MemoryQuery = {
        agentId: 'agent-1',
        workspaceId: 'workspace-1',
        limit: 10,
      };

      await service.query(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "ltm.metadata->>'workspaceId' = :workspaceId",
        { workspaceId: 'workspace-1' },
      );
    });

    it('should filter by minImportance', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const query: MemoryQuery = {
        agentId: 'agent-1',
        minImportance: 0.7,
        limit: 10,
      };

      await service.query(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'ltm.importance >= :minImportance',
        { minImportance: 0.7 },
      );
    });

    it('should order by importance, access count, and updated date', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const query: MemoryQuery = {
        agentId: 'agent-1',
        limit: 10,
      };

      await service.query(query);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'ltm.importance',
        'DESC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'ltm.accessCount',
        'DESC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'ltm.updatedAt',
        'DESC',
      );
    });

    it('should apply limit', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const query: MemoryQuery = {
        agentId: 'agent-1',
        limit: 5,
      };

      await service.query(query);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
    });

    it('should use default limit of 10', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const query: MemoryQuery = {
        agentId: 'agent-1',
      };

      await service.query(query);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should return processing time', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const query: MemoryQuery = {
        agentId: 'agent-1',
        limit: 10,
      };

      const result = await service.query(query);

      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getByCategory', () => {
    it('should get memories by category', async () => {
      const mockEntities = [
        {
          id: 'ltm-1',
          agentId: 'agent-1',
          category: 'lesson',
          summary: 'Lesson 1',
          details: 'Details 1',
          metadata: {},
          importance: 0.8,
          accessCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);

      const result = await service.getByCategory('agent-1', 'lesson', 5);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('lesson');
    });
  });

  describe('update', () => {
    it('should update memory importance', async () => {
      const mockEntity = {
        id: 'ltm-1',
        agentId: 'agent-1',
        category: 'lesson',
        summary: 'Test',
        details: 'Test details',
        metadata: {},
        importance: 0.7,
        accessCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockEntity);
      mockRepository.save.mockResolvedValue({
        ...mockEntity,
        importance: 0.9,
        updatedAt: new Date(),
      });

      const updates: UpdateMemoryRequest = {
        importance: 0.9,
      };

      const result = await service.update('ltm-1', updates);

      expect(result).toBeDefined();
      expect(result?.importance).toBe(0.9);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should update memory metadata', async () => {
      const mockEntity = {
        id: 'ltm-1',
        agentId: 'agent-1',
        category: 'lesson',
        summary: 'Test',
        details: 'Test details',
        metadata: { existing: 'value' },
        importance: 0.7,
        accessCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockEntity);
      mockRepository.save.mockResolvedValue({
        ...mockEntity,
        metadata: { existing: 'value', new: 'data' },
      });

      const updates: UpdateMemoryRequest = {
        metadata: { new: 'data' },
      };

      const result = await service.update('ltm-1', updates);

      expect(result?.metadata).toEqual({ existing: 'value', new: 'data' });
    });

    it('should update memory summary', async () => {
      const mockEntity = {
        id: 'ltm-1',
        agentId: 'agent-1',
        category: 'lesson',
        summary: 'Old summary',
        details: 'Test details',
        metadata: {},
        importance: 0.7,
        accessCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockEntity);
      mockRepository.save.mockResolvedValue({
        ...mockEntity,
        summary: 'New summary',
      });

      const updates: UpdateMemoryRequest = {
        summary: 'New summary',
      };

      const result = await service.update('ltm-1', updates);

      expect(result?.summary).toBe('New summary');
    });

    it('should return null for non-existent memory', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const updates: UpdateMemoryRequest = {
        importance: 0.9,
      };

      const result = await service.update('non-existent', updates);

      expect(result).toBeNull();
    });

    it('should handle update errors', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 'ltm-1',
        metadata: {},
      });
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      const updates: UpdateMemoryRequest = {
        importance: 0.9,
      };

      const result = await service.update('ltm-1', updates);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete memory by ID', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.delete('ltm-1');

      expect(mockRepository.delete).toHaveBeenCalledWith('ltm-1');
    });
  });

  describe('getMostAccessed', () => {
    it('should get most accessed memories', async () => {
      const mockEntities = [
        {
          id: 'ltm-1',
          agentId: 'agent-1',
          category: 'lesson',
          summary: 'Most accessed',
          details: 'Details',
          metadata: {},
          importance: 0.8,
          accessCount: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'ltm-2',
          agentId: 'agent-1',
          category: 'lesson',
          summary: 'Second most',
          details: 'Details',
          metadata: {},
          importance: 0.7,
          accessCount: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.find.mockResolvedValue(mockEntities);

      const result = await service.getMostAccessed('agent-1', 5);

      expect(result).toHaveLength(2);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { agentId: 'agent-1' },
        order: { accessCount: 'DESC' },
        take: 5,
      });
    });
  });

  describe('getStats', () => {
    it('should calculate memory statistics', async () => {
      const mockEntities = [
        {
          id: 'ltm-1',
          agentId: 'agent-1',
          category: 'lesson',
          summary: 'Lesson 1',
          details: 'Details',
          metadata: {},
          importance: 0.8,
          accessCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'ltm-2',
          agentId: 'agent-1',
          category: 'lesson',
          summary: 'Lesson 2',
          details: 'Details',
          metadata: {},
          importance: 0.6,
          accessCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'ltm-3',
          agentId: 'agent-1',
          category: 'challenge',
          summary: 'Challenge 1',
          details: 'Details',
          metadata: {},
          importance: 0.9,
          accessCount: 15,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.find.mockResolvedValue(mockEntities);

      const stats = await service.getStats('agent-1');

      expect(stats.total).toBe(3);
      expect(stats.byCategory.lesson).toBe(2);
      expect(stats.byCategory.challenge).toBe(1);
      expect(stats.averageImportance).toBeCloseTo(0.767, 2);
      expect(stats.totalAccesses).toBe(30);
      expect(stats.mostAccessed).toBeDefined();
      expect(stats.mostAccessed.id).toBe('ltm-3');
    });

    it('should handle empty memory set', async () => {
      mockRepository.find.mockResolvedValue([]);

      const stats = await service.getStats('agent-1');

      expect(stats.total).toBe(0);
      expect(stats.byCategory).toEqual({});
      expect(stats.averageImportance).toBe(0);
      expect(stats.totalAccesses).toBe(0);
      expect(stats.mostAccessed).toBeNull();
    });
  });

  describe('search', () => {
    it('should search memories by text', async () => {
      const mockEntities = [
        {
          id: 'ltm-1',
          agentId: 'agent-1',
          category: 'lesson',
          summary: 'TypeScript lesson',
          details: 'Details about TypeScript',
          metadata: {},
          importance: 0.8,
          accessCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);

      const result = await service.search('agent-1', 'TypeScript', 10);

      expect(result).toHaveLength(1);
      expect(result[0].summary).toContain('TypeScript');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'ltm.agentId = :agentId',
        { agentId: 'agent-1' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(ltm.summary ILIKE :search OR ltm.details ILIKE :search)',
        { search: '%TypeScript%' },
      );
    });

    it('should filter by projectId', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.search('agent-1', 'test', 10, 'project-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(ltm.projectId = :projectId OR ltm.projectId IS NULL)',
        { projectId: 'project-1' },
      );
    });

    it('should filter by workspaceId', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.search('agent-1', 'test', 10, undefined, 'workspace-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(ltm.workspaceId = :workspaceId OR ltm.workspaceId IS NULL)',
        { workspaceId: 'workspace-1' },
      );
    });

    it('should order by importance', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.search('agent-1', 'test', 10);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'ltm.importance',
        'DESC',
      );
    });
  });
});
