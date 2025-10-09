import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { MemoryCategory } from '@agentdb9/shared';

@Entity('long_term_memories')
export class LongTermMemoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  agentId: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  category: MemoryCategory;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'text' })
  details: string;

  @Column({ type: 'jsonb' })
  metadata: any;

  @Column({ type: 'float', default: 0.5 })
  importance: number;

  @Column({ type: 'int', default: 0 })
  accessCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  embedding?: number[];

  @Column({ type: 'jsonb', nullable: true })
  consolidatedFrom?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
