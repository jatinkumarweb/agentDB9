import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationBatch } from '../entities/evaluation-batch.entity';
import { EvaluationResult } from '../entities/evaluation-result.entity';
import { Agent } from '../entities/agent.entity';
import { GroundTruthService } from './ground-truth.service';
import { EvaluationExecutor } from './evaluation-executor.service';
import { EvaluationCacheService } from './evaluation-cache.service';
import type {
  CompareAgentsDto,
  EvaluateMemoryDto,
  EvaluateKnowledgeDto,
  RunSuiteDto,
  EvaluationCategory,
  EvaluationSummary,
  ComparisonResult,
  MemoryImpactResult,
  KnowledgeImpactResult,
  BatchStatus,
} from '@agentdb9/shared';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    @InjectRepository(EvaluationBatch)
    private readonly batchRepo: Repository<EvaluationBatch>,
    @InjectRepository(EvaluationResult)
    private readonly resultRepo: Repository<EvaluationResult>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    private readonly groundTruthService: GroundTruthService,
    private readonly executor: EvaluationExecutor,
    private readonly cacheService: EvaluationCacheService,
  ) {}

  async compareAgents(dto: CompareAgentsDto): Promise<EvaluationBatch> {
    this.logger.log(`Starting agent comparison: ${dto.agent1Id} vs ${dto.agent2Id}`);

    const [agent1, agent2] = await Promise.all([
      this.agentRepo.findOne({ where: { id: dto.agent1Id } }),
      this.agentRepo.findOne({ where: { id: dto.agent2Id } }),
    ]);

    if (!agent1 || !agent2) {
      throw new NotFoundException('One or both agents not found');
    }

    // Get ground truth tasks
    const groundTruths = dto.groundTruthIds
      ? await this.groundTruthService.findByIds(dto.groundTruthIds)
      : await this.groundTruthService.findByCategory(dto.evaluationSuite);

    // Create batch
    const batch = this.batchRepo.create({
      name: `Compare: ${agent1.name} vs ${agent2.name}`,
      type: 'comparison',
      status: 'pending',
      progress: {
        total: groundTruths.length * 2,
        completed: 0,
        failed: 0,
      },
      configuration: {
        agent1Id: dto.agent1Id,
        agent2Id: dto.agent2Id,
        evaluationSuite: dto.evaluationSuite,
      },
      resultIds: [],
    });

    await this.batchRepo.save(batch);

    // Execute evaluations in background
    this.executeBatchAsync(batch.id, agent1, agent2, groundTruths);

    return batch;
  }

  async evaluateMemory(dto: EvaluateMemoryDto): Promise<EvaluationBatch> {
    this.logger.log(`Starting memory evaluation for agent: ${dto.agentId}`);

    const agent = await this.agentRepo.findOne({ where: { id: dto.agentId } });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const groundTruths = dto.groundTruthIds
      ? await this.groundTruthService.findByIds(dto.groundTruthIds)
      : await this.groundTruthService.findByCategory(dto.evaluationSuite);

    const batch = this.batchRepo.create({
      name: `Memory Impact: ${agent.name}`,
      type: 'memory',
      status: 'pending',
      progress: {
        total: groundTruths.length * dto.memoryConfigs.length,
        completed: 0,
        failed: 0,
      },
      configuration: {
        agentId: dto.agentId,
        memoryConfigs: dto.memoryConfigs,
        evaluationSuite: dto.evaluationSuite,
      },
      resultIds: [],
    });

    await this.batchRepo.save(batch);

    // Execute evaluations in background
    this.executeMemoryBatchAsync(batch.id, agent, groundTruths, dto.memoryConfigs);

    return batch;
  }

  async evaluateKnowledge(dto: EvaluateKnowledgeDto): Promise<EvaluationBatch> {
    this.logger.log(`Starting knowledge evaluation for agent: ${dto.agentId}`);

    const agent = await this.agentRepo.findOne({ where: { id: dto.agentId } });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const groundTruths = dto.groundTruthIds
      ? await this.groundTruthService.findByIds(dto.groundTruthIds)
      : await this.groundTruthService.findByCategory(dto.evaluationSuite);

    const totalRuns = dto.compareWithout ? groundTruths.length * 2 : groundTruths.length;

    const batch = this.batchRepo.create({
      name: `Knowledge Impact: ${agent.name}`,
      type: 'knowledge',
      status: 'pending',
      progress: {
        total: totalRuns,
        completed: 0,
        failed: 0,
      },
      configuration: {
        agentId: dto.agentId,
        knowledgeSources: dto.knowledgeSources,
        compareWithout: dto.compareWithout,
        evaluationSuite: dto.evaluationSuite,
      },
      resultIds: [],
    });

    await this.batchRepo.save(batch);

    // Execute evaluations in background
    this.executeKnowledgeBatchAsync(
      batch.id,
      agent,
      groundTruths,
      dto.knowledgeSources,
      dto.compareWithout,
    );

    return batch;
  }

  async runSuite(dto: RunSuiteDto): Promise<EvaluationBatch> {
    this.logger.log(`Running suite ${dto.suiteType} for agent: ${dto.agentId}`);

    const agent = await this.agentRepo.findOne({ where: { id: dto.agentId } });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const groundTruths = await this.groundTruthService.findByCategory(dto.suiteType);

    const batch = this.batchRepo.create({
      name: `Suite: ${dto.suiteType} - ${agent.name}`,
      type: 'suite',
      status: 'pending',
      progress: {
        total: groundTruths.length,
        completed: 0,
        failed: 0,
      },
      configuration: {
        agentId: dto.agentId,
        suiteType: dto.suiteType,
        memoryType: dto.memoryType,
        knowledgeSources: dto.knowledgeSources,
      },
      resultIds: [],
    });

    await this.batchRepo.save(batch);

    // Execute evaluations in background
    this.executeSuiteBatchAsync(
      batch.id,
      agent,
      groundTruths,
      dto.memoryType,
      dto.knowledgeSources || [],
    );

    return batch;
  }

  private async executeBatchAsync(
    batchId: string,
    agent1: Agent,
    agent2: Agent,
    groundTruths: any[],
  ): Promise<void> {
    const batch = await this.batchRepo.findOne({ where: { id: batchId } });
    if (!batch) return;

    batch.status = 'running';
    batch.startedAt = new Date();
    await this.batchRepo.save(batch);

    const resultIds: string[] = [];

    try {
      for (const gt of groundTruths) {
        // Evaluate agent1
        batch.progress.currentTask = `${agent1.name} - ${gt.taskType}`;
        await this.batchRepo.save(batch);

        const result1 = await this.executeWithCache(agent1, gt, null, []);
        resultIds.push(result1.id);
        batch.progress.completed++;

        // Evaluate agent2
        batch.progress.currentTask = `${agent2.name} - ${gt.taskType}`;
        await this.batchRepo.save(batch);

        const result2 = await this.executeWithCache(agent2, gt, null, []);
        resultIds.push(result2.id);
        batch.progress.completed++;

        await this.batchRepo.save(batch);
      }

      batch.status = 'completed';
      batch.completedAt = new Date();
    } catch (error) {
      this.logger.error(`Batch ${batchId} failed`, error.stack);
      batch.status = 'failed';
      batch.errorMessage = error.message;
    }

    batch.resultIds = resultIds;
    await this.batchRepo.save(batch);
  }

  private async executeMemoryBatchAsync(
    batchId: string,
    agent: Agent,
    groundTruths: any[],
    memoryConfigs: any[],
  ): Promise<void> {
    const batch = await this.batchRepo.findOne({ where: { id: batchId } });
    if (!batch) return;

    batch.status = 'running';
    batch.startedAt = new Date();
    await this.batchRepo.save(batch);

    const resultIds: string[] = [];

    try {
      for (const memoryType of memoryConfigs) {
        for (const gt of groundTruths) {
          batch.progress.currentTask = `${agent.name} - ${gt.taskType} (Memory: ${memoryType || 'none'})`;
          await this.batchRepo.save(batch);

          const result = await this.executeWithCache(agent, gt, memoryType, []);
          resultIds.push(result.id);
          batch.progress.completed++;
          await this.batchRepo.save(batch);
        }
      }

      batch.status = 'completed';
      batch.completedAt = new Date();
    } catch (error) {
      this.logger.error(`Batch ${batchId} failed`, error.stack);
      batch.status = 'failed';
      batch.errorMessage = error.message;
    }

    batch.resultIds = resultIds;
    await this.batchRepo.save(batch);
  }

  private async executeKnowledgeBatchAsync(
    batchId: string,
    agent: Agent,
    groundTruths: any[],
    knowledgeSources: any[],
    compareWithout: boolean,
  ): Promise<void> {
    const batch = await this.batchRepo.findOne({ where: { id: batchId } });
    if (!batch) return;

    batch.status = 'running';
    batch.startedAt = new Date();
    await this.batchRepo.save(batch);

    const resultIds: string[] = [];

    try {
      for (const gt of groundTruths) {
        // With knowledge
        batch.progress.currentTask = `${agent.name} - ${gt.taskType} (With Knowledge)`;
        await this.batchRepo.save(batch);

        const result1 = await this.executeWithCache(agent, gt, null, knowledgeSources);
        resultIds.push(result1.id);
        batch.progress.completed++;
        await this.batchRepo.save(batch);

        // Without knowledge (if requested)
        if (compareWithout) {
          batch.progress.currentTask = `${agent.name} - ${gt.taskType} (Without Knowledge)`;
          await this.batchRepo.save(batch);

          const result2 = await this.executeWithCache(agent, gt, null, []);
          resultIds.push(result2.id);
          batch.progress.completed++;
          await this.batchRepo.save(batch);
        }
      }

      batch.status = 'completed';
      batch.completedAt = new Date();
    } catch (error) {
      this.logger.error(`Batch ${batchId} failed`, error.stack);
      batch.status = 'failed';
      batch.errorMessage = error.message;
    }

    batch.resultIds = resultIds;
    await this.batchRepo.save(batch);
  }

  private async executeSuiteBatchAsync(
    batchId: string,
    agent: Agent,
    groundTruths: any[],
    memoryType: any,
    knowledgeSources: any[],
  ): Promise<void> {
    const batch = await this.batchRepo.findOne({ where: { id: batchId } });
    if (!batch) return;

    batch.status = 'running';
    batch.startedAt = new Date();
    await this.batchRepo.save(batch);

    const resultIds: string[] = [];

    try {
      for (const gt of groundTruths) {
        batch.progress.currentTask = `${agent.name} - ${gt.taskType}`;
        await this.batchRepo.save(batch);

        const result = await this.executeWithCache(
          agent,
          gt,
          memoryType,
          knowledgeSources || [],
        );
        resultIds.push(result.id);
        batch.progress.completed++;
        await this.batchRepo.save(batch);
      }

      batch.status = 'completed';
      batch.completedAt = new Date();
    } catch (error) {
      this.logger.error(`Batch ${batchId} failed`, error.stack);
      batch.status = 'failed';
      batch.errorMessage = error.message;
    }

    batch.resultIds = resultIds;
    await this.batchRepo.save(batch);
  }

  private async executeWithCache(
    agent: Agent,
    groundTruth: any,
    memoryType: any,
    knowledgeSources: any[],
  ): Promise<EvaluationResult> {
    // Generate cache key
    const cacheKey = this.cacheService.generateCacheKey(
      agent.configuration,
      groundTruth.id,
      memoryType,
      knowledgeSources,
    );

    // Check cache
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cached;
    }

    // Execute evaluation
    const result = await this.executor.executeEvaluation(
      agent,
      groundTruth,
      memoryType,
      knowledgeSources,
    );

    // Cache result if successful
    if (result.status === 'completed') {
      await this.cacheService.set(cacheKey, result.id);
    }

    return result;
  }

  // Query methods
  async findResults(agentId?: string, batchId?: string): Promise<EvaluationResult[]> {
    const query = this.resultRepo.createQueryBuilder('result');

    if (agentId) {
      query.andWhere('result.agentId = :agentId', { agentId });
    }

    if (batchId) {
      const batch = await this.batchRepo.findOne({ where: { id: batchId } });
      if (batch && batch.resultIds.length > 0) {
        query.andWhere('result.id IN (:...ids)', { ids: batch.resultIds });
      }
    }

    return query.orderBy('result.createdAt', 'DESC').getMany();
  }

  async findResult(id: string): Promise<EvaluationResult> {
    const result = await this.resultRepo.findOne({
      where: { id },
      relations: ['groundTruth', 'agent'],
    });

    if (!result) {
      throw new NotFoundException(`Evaluation result ${id} not found`);
    }

    return result;
  }

  async deleteResult(id: string): Promise<void> {
    await this.resultRepo.delete(id);
  }

  async findBatches(status?: string): Promise<EvaluationBatch[]> {
    const query = this.batchRepo.createQueryBuilder('batch');

    if (status) {
      query.where('batch.status = :status', { status });
    }

    return query.orderBy('batch.createdAt', 'DESC').getMany();
  }

  async findBatch(id: string): Promise<EvaluationBatch> {
    const batch = await this.batchRepo.findOne({ where: { id } });
    if (!batch) {
      throw new NotFoundException(`Batch ${id} not found`);
    }
    return batch;
  }

  async cancelBatch(id: string): Promise<EvaluationBatch> {
    const batch = await this.findBatch(id);
    batch.status = 'cancelled';
    return this.batchRepo.save(batch);
  }

  async deleteBatch(id: string): Promise<void> {
    await this.batchRepo.delete(id);
  }

  async listSuites(): Promise<any[]> {
    const categories: EvaluationCategory[] = ['backend', 'frontend', 'devops'];
    
    const suites = await Promise.all(
      categories.map(async (category) => {
        const count = await this.groundTruthService.count(category);
        return {
          type: category,
          name: category.charAt(0).toUpperCase() + category.slice(1),
          taskCount: count,
        };
      }),
    );

    return suites;
  }

  async getSuite(type: EvaluationCategory): Promise<any> {
    const groundTruths = await this.groundTruthService.findByCategory(type);
    return {
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      tasks: groundTruths,
    };
  }

  async getAgentAnalytics(agentId: string): Promise<any> {
    const results = await this.resultRepo.find({
      where: { agentId, status: 'completed' },
      order: { createdAt: 'DESC' },
    });

    if (results.length === 0) {
      return {
        agentId,
        totalEvaluations: 0,
        averageScore: 0,
        scoreHistory: [],
      };
    }

    const averageScore =
      results.reduce((sum, r) => sum + (r.scores?.overall || 0), 0) / results.length;

    return {
      agentId,
      totalEvaluations: results.length,
      averageScore,
      scoreHistory: results.map((r) => ({
        date: r.createdAt,
        score: r.scores?.overall || 0,
        taskType: r.groundTruth?.taskType,
      })),
    };
  }

  async getComparisonAnalytics(): Promise<any> {
    const batches = await this.batchRepo.find({
      where: { type: 'comparison', status: 'completed' },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return batches.map((batch) => ({
      id: batch.id,
      name: batch.name,
      createdAt: batch.createdAt,
      configuration: batch.configuration,
    }));
  }
}
