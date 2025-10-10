import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { EvaluationResult } from './evaluation-result.entity';

export type BatchStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type BatchType = 'comparison' | 'memory' | 'knowledge' | 'suite';

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  currentTask?: string;
}

@Entity('evaluation_batches')
export class EvaluationBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'varchar',
    length: 20
  })
  type: BatchType;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending'
  })
  status: BatchStatus;

  @Column('text', {
    transformer: {
      to: (value: BatchProgress) => JSON.stringify(value),
      from: (value: string) => JSON.parse(value)
    }
  })
  progress: BatchProgress;

  @Column('text', {
    transformer: {
      to: (value: any) => JSON.stringify(value),
      from: (value: string) => JSON.parse(value)
    }
  })
  configuration: any;

  @Column('simple-array', { nullable: true })
  resultIds: string[];

  @Column('text', { nullable: true })
  errorMessage: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
