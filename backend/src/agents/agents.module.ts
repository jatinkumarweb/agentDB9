import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { Agent } from '../entities/agent.entity';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ContextModule } from '../context/context.module';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent]),
    KnowledgeModule,
    ContextModule,
    MemoryModule,
  ],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}