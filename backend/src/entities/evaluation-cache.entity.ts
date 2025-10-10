import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { EvaluationResult } from './evaluation-result.entity';

@Entity('evaluation_cache')
export class EvaluationCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  cacheKey: string;

  @Column('uuid')
  evaluationResultId: string;

  @ManyToOne(() => EvaluationResult)
  @JoinColumn({ name: 'evaluationResultId' })
  evaluationResult: EvaluationResult;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
