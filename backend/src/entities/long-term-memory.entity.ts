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

  @Column({ type: 'text' })
  metadata: any;

  @Column({ type: 'real', default: 0.5 })
  importance: number;

  @Column({ type: 'integer', default: 0 })
  accessCount: number;

  @Column({ type: 'datetime', nullable: true })
  lastAccessedAt?: Date;

  @Column({ type: 'text', nullable: true })
  embedding?: number[];

  @Column({ type: 'text', nullable: true })
  consolidatedFrom?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
