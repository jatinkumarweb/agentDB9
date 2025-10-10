import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type EvaluationCategory = 'backend' | 'frontend' | 'devops';

export interface EvaluationCriteria {
  accuracy: number; // weight 0-1
  codeQuality: number;
  completeness: number;
  efficiency: number;
  maintainability: number;
  security?: number;
}

export interface GroundTruthMetadata {
  language?: string;
  framework?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime?: number; // seconds
  tags?: string[];
}

@Entity('evaluation_ground_truth')
export class EvaluationGroundTruth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 20
  })
  category: EvaluationCategory;

  @Column()
  taskType: string;

  @Column('text')
  taskDescription: string;

  @Column('text', {
    transformer: {
      to: (value: any) => JSON.stringify(value),
      from: (value: string) => JSON.parse(value)
    }
  })
  expectedOutput: any;

  @Column('text', {
    transformer: {
      to: (value: EvaluationCriteria) => JSON.stringify(value),
      from: (value: string) => JSON.parse(value)
    }
  })
  evaluationCriteria: EvaluationCriteria;

  @Column('text', {
    nullable: true,
    transformer: {
      to: (value: GroundTruthMetadata) => JSON.stringify(value),
      from: (value: string) => value ? JSON.parse(value) : null
    }
  })
  metadata: GroundTruthMetadata;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
