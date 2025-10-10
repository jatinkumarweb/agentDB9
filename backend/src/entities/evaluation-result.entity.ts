import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { EvaluationGroundTruth } from './evaluation-ground-truth.entity';
import { Agent } from './agent.entity';
import type {
  EvaluationStatus,
  EvaluationMemoryType,
  EvaluationScores,
  EvaluationDetails,
  EvaluationKnowledgeSource,
} from '@agentdb9/shared';

@Entity('evaluation_results')
export class EvaluationResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  groundTruthId: string;

  @ManyToOne(() => EvaluationGroundTruth)
  @JoinColumn({ name: 'groundTruthId' })
  groundTruth: EvaluationGroundTruth;

  @Column('uuid')
  agentId: string;

  @ManyToOne(() => Agent)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column('text', {
    transformer: {
      to: (value: any) => JSON.stringify(value),
      from: (value: string) => JSON.parse(value)
    }
  })
  agentConfiguration: any;

  @Column('text', {
    transformer: {
      to: (value: any) => JSON.stringify(value),
      from: (value: string) => JSON.parse(value)
    }
  })
  agentOutput: any;

  @Column('text', {
    nullable: true,
    transformer: {
      to: (value: EvaluationScores) => JSON.stringify(value),
      from: (value: string) => value ? JSON.parse(value) : null
    }
  })
  scores: EvaluationScores;

  @Column('text', {
    nullable: true,
    transformer: {
      to: (value: EvaluationDetails) => JSON.stringify(value),
      from: (value: string) => value ? JSON.parse(value) : null
    }
  })
  evaluationDetails: EvaluationDetails;

  @Column({ type: 'int', nullable: true })
  executionTime: number; // milliseconds

  @Column({ default: false })
  memoryUsed: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  memoryType: EvaluationMemoryType;

  @Column('text', {
    nullable: true,
    transformer: {
      to: (value: EvaluationKnowledgeSource[]) => JSON.stringify(value),
      from: (value: string) => value ? JSON.parse(value) : []
    }
  })
  knowledgeSources: EvaluationKnowledgeSource[];

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending'
  })
  status: EvaluationStatus;

  @Column('text', { nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;
}
