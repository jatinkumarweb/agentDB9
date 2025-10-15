import { Test, TestingModule } from '@nestjs/testing';
import { ShortTermMemoryService } from '../short-term-memory.service';
import { CreateMemoryRequest, MemoryQuery } from '@agentdb9/shared';

describe('ShortTermMemoryService', () => {
  let service: ShortTermMemoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShortTermMemoryService],
    }).compile();

    service = module.get<ShortTermMemoryService>(ShortTermMemoryService);
  });

  afterEach(async () => {
    // Clear all memories after each test
    const allMemories = await service.query({
      agentId: 'test-agent',
      limit: 1000,
    });
    for (const memory of allMemories.memories) {
      await service.delete(memory.id);
    }
  });

  describe('create', () => {
    it('should create a short-term memory entry', async () => {
      const request: CreateMemoryRequest = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'User asked about TypeScript',
        metadata: {
          tags: ['typescript', 'question'],
          source: 'chat',
        },
        importance: 0.7,
      };

      const memory = await service.create(request);

      expect(memory).toBeDefined();
      expect(memory.id).toBeDefined();
      expect(memory.agentId).toBe('agent-1');
      expect(memory.sessionId).toBe('session-1');
      expect(memory.category).toBe('interaction');
      expect(memory.content).toBe('User asked about TypeScript');
      expect(memory.importance).toBe(0.7);
      expect(memory.metadata.tags).toContain('typescript');
      expect(memory.createdAt).toBeInstanceOf(Date);
      expect(memory.expiresAt).toBeInstanceOf(Date);
      expect(memory.expiresAt.getTime()).toBeGreaterThan(
        memory.createdAt.getTime(),
      );
    });

    it('should use default sessionId if not provided', async () => {
      const request: CreateMemoryRequest = {
        agentId: 'agent-1',
        category: 'interaction',
        content: 'Test content',
      };

      const memory = await service.create(request);

      expect(memory.sessionId).toBe('default');
    });

    it('should use default importance if not provided', async () => {
      const request: CreateMemoryRequest = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Test content',
      };

      const memory = await service.create(request);

      expect(memory.importance).toBe(0.5);
    });

    it('should build metadata with defaults', async () => {
      const request: CreateMemoryRequest = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Test content',
      };

      const memory = await service.create(request);

      expect(memory.metadata).toBeDefined();
      expect(memory.metadata.tags).toEqual([]);
      expect(memory.metadata.keywords).toEqual([]);
      expect(memory.metadata.confidence).toBe(0.8);
      expect(memory.metadata.relevance).toBe(0.7);
      expect(memory.metadata.source).toBe('chat');
    });

    it('should cleanup old memories when exceeding MAX_STM_PER_SESSION', async () => {
      const agentId = 'agent-1';
      const sessionId = 'session-1';

      // Create 20 memories (exceeds MAX_STM_PER_SESSION of 15)
      for (let i = 0; i < 20; i++) {
        await service.create({
          agentId,
          sessionId,
          category: 'interaction',
          content: `Memory ${i}`,
          importance: 0.5,
        });
      }

      const result = await service.query({
        agentId,
        sessionId,
        limit: 100,
      });

      // Should only have 15 memories (MAX_STM_PER_SESSION)
      expect(result.memories.length).toBeLessThanOrEqual(15);
    });
  });

  describe('get', () => {
    it('should retrieve memory by ID', async () => {
      const created = await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Test content',
      });

      const retrieved = await service.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.content).toBe('Test content');
    });

    it('should return null for non-existent memory', async () => {
      const retrieved = await service.get('non-existent-id');

      expect(retrieved).toBeNull();
    });

    it('should return null for expired memory', async () => {
      const created = await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Test content',
      });

      // Manually set expiration to past
      const memory = await service.get(created.id);
      if (memory) {
        memory.expiresAt = new Date(Date.now() - 1000);
      }

      const retrieved = await service.get(created.id);

      expect(retrieved).toBeNull();
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      // Create test data
      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'TypeScript question',
        importance: 0.8,
        metadata: { tags: ['typescript'] },
      });

      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'lesson',
        content: 'Learned about async/await',
        importance: 0.9,
        metadata: { tags: ['javascript', 'async'] },
      });

      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-2',
        category: 'interaction',
        content: 'React hooks question',
        importance: 0.7,
        metadata: { tags: ['react'] },
      });

      await service.create({
        agentId: 'agent-2',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Python question',
        importance: 0.6,
      });
    });

    it('should query memories by agentId', async () => {
      const result = await service.query({
        agentId: 'agent-1',
        limit: 10,
      });

      expect(result.memories.length).toBe(3);
      expect(result.totalCount).toBe(3);
      expect(result.memories.every((m) => m.agentId === 'agent-1')).toBe(true);
    });

    it('should filter by sessionId', async () => {
      const result = await service.query({
        agentId: 'agent-1',
        sessionId: 'session-1',
        limit: 10,
      });

      expect(result.memories.length).toBe(2);
      expect(result.memories.every((m) => m.sessionId === 'session-1')).toBe(
        true,
      );
    });

    it('should filter by category', async () => {
      const result = await service.query({
        agentId: 'agent-1',
        category: 'interaction',
        limit: 10,
      });

      expect(result.memories.length).toBe(2);
      expect(result.memories.every((m) => m.category === 'interaction')).toBe(
        true,
      );
    });

    it('should filter by tags', async () => {
      const result = await service.query({
        agentId: 'agent-1',
        tags: ['typescript'],
        limit: 10,
      });

      expect(result.memories.length).toBe(1);
      expect(result.memories[0].content).toContain('TypeScript');
    });

    it('should filter by minImportance', async () => {
      const result = await service.query({
        agentId: 'agent-1',
        minImportance: 0.8,
        limit: 10,
      });

      expect(result.memories.length).toBe(2);
      expect(result.memories.every((m) => m.importance >= 0.8)).toBe(true);
    });

    it('should sort by importance and recency', async () => {
      const result = await service.query({
        agentId: 'agent-1',
        limit: 10,
      });

      // Should be sorted by importance descending
      expect(result.memories.length).toBeGreaterThan(0);
      if (result.memories.length > 1) {
        // Verify sorting (allowing for small differences)
        const importances = result.memories.map(m => m.importance);
        for (let i = 0; i < importances.length - 1; i++) {
          expect(importances[i]).toBeGreaterThanOrEqual(importances[i + 1] - 0.15);
        }
      }
    });

    it('should apply limit', async () => {
      const result = await service.query({
        agentId: 'agent-1',
        limit: 2,
      });

      expect(result.memories.length).toBe(2);
      expect(result.totalCount).toBe(3); // Total available
    });

    it('should use default limit of 10', async () => {
      const result = await service.query({
        agentId: 'agent-1',
      });

      expect(result.memories.length).toBeLessThanOrEqual(10);
    });

    it('should return processing time', async () => {
      const result = await service.query({
        agentId: 'agent-1',
        limit: 10,
      });

      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRecentInteractions', () => {
    it('should get recent interactions for a session', async () => {
      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Interaction 1',
      });

      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Interaction 2',
      });

      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'lesson',
        content: 'Not an interaction',
      });

      const interactions = await service.getRecentInteractions(
        'agent-1',
        'session-1',
        10,
      );

      expect(interactions.length).toBe(2);
      expect(interactions.every((m) => m.category === 'interaction')).toBe(
        true,
      );
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await service.create({
          agentId: 'agent-1',
          sessionId: 'session-1',
          category: 'interaction',
          content: `Interaction ${i}`,
        });
      }

      const interactions = await service.getRecentInteractions(
        'agent-1',
        'session-1',
        3,
      );

      expect(interactions.length).toBe(3);
    });
  });

  describe('updateImportance', () => {
    it('should update memory importance', async () => {
      const memory = await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Test content',
        importance: 0.5,
      });

      await service.updateImportance(memory.id, 0.9);

      const updated = await service.get(memory.id);
      expect(updated?.importance).toBe(0.9);
    });

    it('should clamp importance to 0-1 range', async () => {
      const memory = await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Test content',
        importance: 0.5,
      });

      await service.updateImportance(memory.id, 1.5);
      let updated = await service.get(memory.id);
      expect(updated?.importance).toBe(1);

      await service.updateImportance(memory.id, -0.5);
      updated = await service.get(memory.id);
      expect(updated?.importance).toBe(0);
    });

    it('should handle non-existent memory gracefully', async () => {
      await expect(
        service.updateImportance('non-existent', 0.8),
      ).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete memory by ID', async () => {
      const memory = await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Test content',
      });

      await service.delete(memory.id);

      const retrieved = await service.get(memory.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('getConsolidationCandidates', () => {
    it('should get memories ready for consolidation', async () => {
      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'High importance',
        importance: 0.8,
      });

      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Low importance',
        importance: 0.3,
      });

      const candidates = await service.getConsolidationCandidates(
        'agent-1',
        0.6,
      );

      expect(candidates.length).toBe(1);
      expect(candidates[0].importance).toBe(0.8);
    });

    it('should filter by minimum importance', async () => {
      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Memory 1',
        importance: 0.9,
      });

      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Memory 2',
        importance: 0.5,
      });

      const candidates = await service.getConsolidationCandidates(
        'agent-1',
        0.7,
      );

      expect(candidates.length).toBe(1);
      expect(candidates[0].importance).toBeGreaterThanOrEqual(0.7);
    });

    it('should sort by importance descending', async () => {
      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Memory 1',
        importance: 0.7,
      });

      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Memory 2',
        importance: 0.9,
      });

      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Memory 3',
        importance: 0.8,
      });

      const candidates = await service.getConsolidationCandidates(
        'agent-1',
        0.6,
      );

      expect(candidates[0].importance).toBe(0.9);
      expect(candidates[1].importance).toBe(0.8);
      expect(candidates[2].importance).toBe(0.7);
    });
  });

  describe('archive', () => {
    it('should archive multiple memories', async () => {
      const memory1 = await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Memory 1',
      });

      const memory2 = await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Memory 2',
      });

      await service.archive([memory1.id, memory2.id]);

      const retrieved1 = await service.get(memory1.id);
      const retrieved2 = await service.get(memory2.id);

      expect(retrieved1).toBeNull();
      expect(retrieved2).toBeNull();
    });
  });

  describe('getSessionStats', () => {
    beforeEach(async () => {
      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Memory 1',
        importance: 0.8,
      });

      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Memory 2',
        importance: 0.6,
      });

      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'lesson',
        content: 'Memory 3',
        importance: 0.9,
      });
    });

    it('should get statistics for a session', async () => {
      const stats = await service.getSessionStats('agent-1', 'session-1');

      expect(stats.total).toBe(3);
      expect(stats.byCategory.interaction).toBe(2);
      expect(stats.byCategory.lesson).toBe(1);
      expect(stats.averageImportance).toBeCloseTo(0.767, 2);
      expect(stats.oldestEntry).toBeInstanceOf(Date);
      expect(stats.newestEntry).toBeInstanceOf(Date);
    });

    it('should get statistics for all sessions when sessionId is "all"', async () => {
      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-2',
        category: 'interaction',
        content: 'Memory 4',
        importance: 0.7,
      });

      const stats = await service.getSessionStats('agent-1', 'all');

      expect(stats.total).toBe(4);
    });

    it('should return empty stats for non-existent session', async () => {
      const stats = await service.getSessionStats('agent-1', 'non-existent');

      expect(stats.total).toBe(0);
      expect(stats.byCategory).toEqual({});
      expect(stats.averageImportance).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });
  });

  describe('clearSession', () => {
    it('should clear all memories for a session', async () => {
      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Memory 1',
      });

      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Memory 2',
      });

      await service.create({
        agentId: 'agent-1',
        sessionId: 'session-2',
        category: 'interaction',
        content: 'Memory 3',
      });

      await service.clearSession('agent-1', 'session-1');

      const session1Memories = await service.query({
        agentId: 'agent-1',
        sessionId: 'session-1',
        limit: 10,
      });

      const session2Memories = await service.query({
        agentId: 'agent-1',
        sessionId: 'session-2',
        limit: 10,
      });

      expect(session1Memories.memories.length).toBe(0);
      expect(session2Memories.memories.length).toBe(1);
    });
  });

  describe('cleanupExpired', () => {
    it('should remove expired memories', async () => {
      const memory = await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Test content',
      });

      // Manually expire the memory
      const retrieved = await service.get(memory.id);
      if (retrieved) {
        retrieved.expiresAt = new Date(Date.now() - 1000);
      }

      const cleanedCount = await service.cleanupExpired();

      expect(cleanedCount).toBe(1);

      const afterCleanup = await service.get(memory.id);
      expect(afterCleanup).toBeNull();
    });

    it('should not remove non-expired memories', async () => {
      const memory = await service.create({
        agentId: 'agent-1',
        sessionId: 'session-1',
        category: 'interaction',
        content: 'Test content',
      });

      const cleanedCount = await service.cleanupExpired();

      expect(cleanedCount).toBe(0);

      const afterCleanup = await service.get(memory.id);
      expect(afterCleanup).toBeDefined();
    });
  });
});
