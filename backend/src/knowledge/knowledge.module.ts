import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { DocumentLoaderService } from './loaders/document-loader.service';
import { ChunkingService } from './chunking/chunking.service';
import { EmbeddingService } from './embedding/embedding.service';
import { VectorStoreService } from './vector-store/vector-store.service';
import { KnowledgeSource } from '../entities/knowledge-source.entity';
import { DocumentChunk } from '../entities/document-chunk.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeSource, DocumentChunk]),
  ],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    DocumentLoaderService,
    ChunkingService,
    EmbeddingService,
    VectorStoreService,
  ],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
