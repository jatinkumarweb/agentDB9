import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationGroundTruth } from '../entities/evaluation-ground-truth.entity';
import type {
  CreateGroundTruthDto,
  UpdateGroundTruthDto,
  EvaluationCategory,
} from '@agentdb9/shared';

@Injectable()
export class GroundTruthService {
  constructor(
    @InjectRepository(EvaluationGroundTruth)
    private readonly groundTruthRepo: Repository<EvaluationGroundTruth>,
  ) {}

  async create(dto: CreateGroundTruthDto): Promise<EvaluationGroundTruth> {
    const groundTruth = this.groundTruthRepo.create(dto);
    return this.groundTruthRepo.save(groundTruth);
  }

  async findAll(
    category?: EvaluationCategory,
    active?: boolean,
  ): Promise<EvaluationGroundTruth[]> {
    const query = this.groundTruthRepo.createQueryBuilder('gt');

    if (category) {
      query.andWhere('gt.category = :category', { category });
    }

    if (active !== undefined) {
      query.andWhere('gt.isActive = :active', { active });
    }

    return query.orderBy('gt.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<EvaluationGroundTruth> {
    const groundTruth = await this.groundTruthRepo.findOne({ where: { id } });
    if (!groundTruth) {
      throw new NotFoundException(`Ground truth with ID ${id} not found`);
    }
    return groundTruth;
  }

  async findByCategory(category: EvaluationCategory): Promise<EvaluationGroundTruth[]> {
    return this.groundTruthRepo.find({
      where: { category, isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findByIds(ids: string[]): Promise<EvaluationGroundTruth[]> {
    return this.groundTruthRepo.findByIds(ids);
  }

  async update(
    id: string,
    dto: UpdateGroundTruthDto,
  ): Promise<EvaluationGroundTruth> {
    const groundTruth = await this.findOne(id);
    Object.assign(groundTruth, dto);
    return this.groundTruthRepo.save(groundTruth);
  }

  async delete(id: string): Promise<void> {
    const result = await this.groundTruthRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Ground truth with ID ${id} not found`);
    }
  }

  async count(category?: EvaluationCategory): Promise<number> {
    const query = this.groundTruthRepo.createQueryBuilder('gt');
    
    if (category) {
      query.where('gt.category = :category', { category });
    }
    
    query.andWhere('gt.isActive = :active', { active: true });
    
    return query.getCount();
  }
}
