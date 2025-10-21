import { Test, TestingModule } from '@nestjs/testing';
import { ChunkingService } from '../chunking.service';
import { LoadedDocument, ChunkingOptions } from '@agentdb9/shared';

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChunkingService],
    }).compile();

    service = module.get<ChunkingService>(ChunkingService);
  });

  const createMockDocument = (content: string): LoadedDocument => ({
    content,
    metadata: {
      title: 'Test Document',
      source: 'test',
      language: 'markdown',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    sections: [],
    codeBlocks: [],
  });

  describe('chunk', () => {
    it('should chunk document into smaller pieces', () => {
      const document = createMockDocument('a'.repeat(1000));
      const options: ChunkingOptions = {
        chunkSize: 200,
        chunkOverlap: 50,
      };

      const chunks = service.chunk(document, 'agent-1', 'source-1', options);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].content.length).toBeLessThanOrEqual(200);
      expect(chunks[0].agentId).toBe('agent-1');
      expect(chunks[0].sourceId).toBe('source-1');
    });

    it('should handle small documents', () => {
      const document = createMockDocument('Small content');
      const options: ChunkingOptions = {
        chunkSize: 500,
        chunkOverlap: 50,
      };

      const chunks = service.chunk(document, 'agent-1', 'source-1', options);

      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toBe('Small content');
    });

    it('should apply chunk overlap', () => {
      const document = createMockDocument('a'.repeat(500));
      const options: ChunkingOptions = {
        chunkSize: 200,
        chunkOverlap: 50,
      };

      const chunks = service.chunk(document, 'agent-1', 'source-1', options);

      expect(chunks.length).toBeGreaterThan(1);
      // Overlap means chunks should share some content
      // With overlap of 50, chunk 1 should start before chunk 0 ends
      if (chunks.length > 1) {
        const chunk0End = chunks[0].metadata.endOffset;
        const chunk1Start = chunks[1].metadata.startOffset;
        // Chunk 1 should start at (chunk0End - overlap)
        expect(chunk1Start).toBeLessThanOrEqual(chunk0End);
        expect(chunk0End - chunk1Start).toBeLessThanOrEqual(options.chunkOverlap);
      }
    });

    it('should preserve document structure when requested', () => {
      const document: LoadedDocument = {
        content: 'Full content',
        metadata: {
          title: 'Test',
          source: 'test',
          language: 'markdown',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        sections: [
          {
            title: 'Section 1',
            content: 'Section 1 content',
            level: 1,
            startOffset: 0,
            endOffset: 17,
          },
          {
            title: 'Section 2',
            content: 'Section 2 content',
            level: 1,
            startOffset: 18,
            endOffset: 35,
          },
        ],
        codeBlocks: [],
      };

      const options: ChunkingOptions = {
        chunkSize: 500,
        chunkOverlap: 50,
        preserveStructure: true,
      };

      const chunks = service.chunk(document, 'agent-1', 'source-1', options);

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[0].metadata.section).toBe('Section 1');
      expect(chunks[1].metadata.section).toBe('Section 2');
    });

    it('should include chunk metadata', () => {
      const document = createMockDocument('Test content');
      const options: ChunkingOptions = {
        chunkSize: 500,
        chunkOverlap: 50,
      };

      const chunks = service.chunk(document, 'agent-1', 'source-1', options);

      expect(chunks[0].metadata).toBeDefined();
      expect(chunks[0].metadata.chunkIndex).toBe(0);
      expect(chunks[0].metadata.startOffset).toBeDefined();
      expect(chunks[0].metadata.endOffset).toBeDefined();
    });
  });
});
