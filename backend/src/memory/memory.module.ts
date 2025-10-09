import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemoryService } from './memory.service';
import { MemoryController } from './memory.controller';
import { ShortTermMemoryService } from './short-term-memory.service';
import { LongTermMemoryService } from './long-term-memory.service';
import { MemoryConsolidationService } from './memory-consolidation.service';
import { LongTermMemoryEntity } from '../entities/long-term-memory.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LongTermMemoryEntity])],
  controllers: [MemoryController],
  providers: [
    MemoryService,
    ShortTermMemoryService,
    LongTermMemoryService,
    MemoryConsolidationService,
  ],
  exports: [MemoryService],
})
export class MemoryModule {}
