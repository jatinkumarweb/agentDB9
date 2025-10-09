import { Injectable, Logger } from '@nestjs/common';
import { LoadedDocument, DocumentChunk as DocumentChunkType, ChunkingOptions } from '@agentdb9/shared';

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);

  /**
   * Chunk document into smaller pieces
   */
  chunk(document: LoadedDocument, agentId: string, sourceId: string, options: ChunkingOptions): DocumentChunkType[] {
    this.logger.log(`Chunking document: ${document.metadata.title}`);

    const chunks: DocumentChunkType[] = [];
    const { chunkSize, chunkOverlap, preserveStructure, splitOnSentences, respectCodeBlocks } = options;

    if (preserveStructure && document.sections && document.sections.length > 0) {
      // Chunk by sections
      for (const section of document.sections) {
        const sectionChunks = this.chunkText(
          section.content,
          chunkSize,
          chunkOverlap,
          splitOnSentences || false
        );

        sectionChunks.forEach((content, index) => {
          chunks.push(this.createChunk(
            content,
            agentId,
            sourceId,
            chunks.length,
            section.startOffset,
            section.endOffset,
            document,
            {
              heading: section.title,
              section: section.title,
            }
          ));
        });
      }
    } else {
      // Simple text chunking
      const textChunks = this.chunkText(
        document.content,
        chunkSize,
        chunkOverlap,
        splitOnSentences || false
      );

      textChunks.forEach((content, index) => {
        chunks.push(this.createChunk(
          content,
          agentId,
          sourceId,
          index,
          index * chunkSize,
          (index + 1) * chunkSize,
          document
        ));
      });
    }

    // Handle code blocks separately if requested
    if (respectCodeBlocks && document.codeBlocks && document.codeBlocks.length > 0) {
      for (const codeBlock of document.codeBlocks) {
        if (codeBlock.code.length > chunkSize / 2) {
          // Large code blocks get their own chunks
          chunks.push(this.createChunk(
            codeBlock.code,
            agentId,
            sourceId,
            chunks.length,
            0,
            codeBlock.code.length,
            document,
            {
              codeLanguage: codeBlock.language,
            }
          ));
        }
      }
    }

    this.logger.log(`Created ${chunks.length} chunks from document`);
    return chunks;
  }

  /**
   * Chunk text into smaller pieces with overlap
   */
  private chunkText(text: string, chunkSize: number, overlap: number, splitOnSentences: boolean): string[] {
    if (splitOnSentences) {
      return this.chunkBySentences(text, chunkSize, overlap);
    } else {
      return this.chunkByCharacters(text, chunkSize, overlap);
    }
  }

  /**
   * Chunk by characters
   */
  private chunkByCharacters(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.substring(start, end);
      chunks.push(chunk.trim());
      start += chunkSize - overlap;
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Chunk by sentences
   */
  private chunkBySentences(text: string, chunkSize: number, overlap: number): string[] {
    const sentences = this.splitIntoSentences(text);
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const sentence of sentences) {
      const sentenceLength = sentence.length;

      if (currentLength + sentenceLength > chunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push(currentChunk.join(' ').trim());

        // Start new chunk with overlap
        const overlapSentences = Math.floor(overlap / (currentLength / currentChunk.length));
        currentChunk = currentChunk.slice(-overlapSentences);
        currentLength = currentChunk.reduce((sum, s) => sum + s.length, 0);
      }

      currentChunk.push(sentence);
      currentLength += sentenceLength;
    }

    // Save last chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' ').trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting (can be improved with NLP libraries)
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Create a document chunk
   */
  private createChunk(
    content: string,
    agentId: string,
    sourceId: string,
    chunkIndex: number,
    startOffset: number,
    endOffset: number,
    document: LoadedDocument,
    additionalMetadata: any = {}
  ): DocumentChunkType {
    const tokenCount = this.estimateTokenCount(content);

    return {
      id: '', // Will be generated by database
      sourceId,
      agentId,
      content,
      metadata: {
        chunkIndex,
        startOffset,
        endOffset,
        tokenCount,
        characterCount: content.length,
        sourceType: 'document',
        sourceTitle: document.metadata.title,
        tags: document.metadata.tags || [],
        version: document.metadata.version,
        lastUpdated: new Date(),
        ...additionalMetadata,
      },
      createdAt: new Date(),
    };
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate optimal chunk size based on content
   */
  calculateOptimalChunkSize(document: LoadedDocument): number {
    const contentLength = document.content.length;
    const hasCodeBlocks = document.codeBlocks && document.codeBlocks.length > 0;
    const hasSections = document.sections && document.sections.length > 0;

    // Base chunk size
    let chunkSize = 1000;

    // Adjust based on content characteristics
    if (hasCodeBlocks) {
      chunkSize = 1500; // Larger chunks for code
    }

    if (hasSections) {
      // Try to fit sections in chunks
      const avgSectionLength = contentLength / (document.sections?.length || 1);
      if (avgSectionLength < 2000) {
        chunkSize = Math.ceil(avgSectionLength * 1.2);
      }
    }

    // Ensure reasonable bounds
    return Math.max(500, Math.min(chunkSize, 2000));
  }
}
