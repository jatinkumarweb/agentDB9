import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';
import { GroundTruthService } from './ground-truth.service';
import { EvaluationExecutor } from './evaluation-executor.service';
import { EvaluationCacheService } from './evaluation-cache.service';
import { EvaluationGroundTruth } from '../entities/evaluation-ground-truth.entity';
import { EvaluationResult } from '../entities/evaluation-result.entity';
import { EvaluationCache } from '../entities/evaluation-cache.entity';
import { EvaluationBatch } from '../entities/evaluation-batch.entity';
import { Agent } from '../entities/agent.entity';
import { AgentsModule } from '../agents/agents.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EvaluationGroundTruth,
      EvaluationResult,
      EvaluationCache,
      EvaluationBatch,
      Agent,
    ]),
    AgentsModule,
    ConversationsModule,
  ],
  controllers: [EvaluationController],
  providers: [
    EvaluationService,
    GroundTruthService,
    EvaluationExecutor,
    EvaluationCacheService,
  ],
  exports: [EvaluationService],
})
export class EvaluationModule {}
