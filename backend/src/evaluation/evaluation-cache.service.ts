import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { EvaluationCache } from '../entities/evaluation-cache.entity';
import { EvaluationResult } from '../entities/evaluation-result.entity';
import * as crypto from 'crypto';
import type { CacheStatus } from '@agentdb9/shared';

@Injectable()
export class EvaluationCacheService {
  private readonly CACHE_TTL_DAYS = 7;

  constructor(
    @InjectRepository(EvaluationCache)
    private readonly cacheRepo: Repository<EvaluationCache>,
    @InjectRepository(EvaluationResult)
    private readonly resultRepo: Repository<EvaluationResult>,
  ) {}

  generateCacheKey(
    agentConfig: any,
    groundTruthId: string,
    memoryType: string | null,
    knowledgeSources: any[],
  ): string {
    const data = JSON.stringify({
      agentConfig,
      groundTruthId,
      memoryType,
      knowledgeSources: knowledgeSources.sort((a, b) => 
        a.identifier.localeCompare(b.identifier)
      ),
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async get(cacheKey: string): Promise<EvaluationResult | null> {
    const cache = await this.cacheRepo.findOne({
      where: { cacheKey },
      relations: ['evaluationResult'],
    });

    if (!cache) {
      return null;
    }

    // Check if expired
    if (new Date() > cache.expiresAt) {
      await this.cacheRepo.delete(cache.id);
      return null;
    }

    return cache.evaluationResult;
  }

  async set(
    cacheKey: string,
    evaluationResultId: string,
  ): Promise<EvaluationCache> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.CACHE_TTL_DAYS);

    const cache = this.cacheRepo.create({
      cacheKey,
      evaluationResultId,
      expiresAt,
    });

    return this.cacheRepo.save(cache);
  }

  async clearByKey(cacheKey: string): Promise<void> {
    await this.cacheRepo.delete({ cacheKey });
  }

  async clearAll(): Promise<void> {
    await this.cacheRepo.clear();
  }

  async clearExpired(): Promise<void> {
    await this.cacheRepo.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  async getStatus(): Promise<CacheStatus> {
    const caches = await this.cacheRepo.find({
      order: { createdAt: 'ASC' },
    });

    const totalCached = caches.length;
    const oldestEntry = caches.length > 0 ? caches[0].createdAt : null;
    const newestEntry = caches.length > 0 ? caches[caches.length - 1].createdAt : null;

    // Approximate size calculation
    const totalSize = caches.reduce((sum, cache) => {
      return sum + cache.cacheKey.length * 2; // rough estimate
    }, 0);

    // Calculate cache hit rate (would need to track misses in production)
    const cacheHitRate = 0; // TODO: Implement hit rate tracking

    return {
      totalCached,
      cacheHitRate,
      oldestEntry,
      newestEntry,
      totalSize,
    };
  }
}
