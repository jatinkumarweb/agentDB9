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

  @Column({ 
    type: 'text',
    transformer: {
      to: (value: any) => JSON.stringify(value),
      from: (value: string) => {
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      }
    }
  })
  metadata: any;

  @Column({ type: 'real', default: 0.5 })
  importance: number;

  @Column({ type: 'integer', default: 0 })
  accessCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt?: Date;

  @Column({ 
    type: 'text', 
    nullable: true,
    transformer: {
      to: (value: number[] | undefined) => value ? JSON.stringify(value) : null,
      from: (value: string | null) => {
        if (!value) return undefined;
        try {
          return JSON.parse(value);
        } catch {
          return undefined;
        }
      }
    }
  })
  embedding?: number[];

  @Column({ 
    type: 'text', 
    nullable: true,
    transformer: {
      to: (value: string[] | undefined) => value ? JSON.stringify(value) : null,
      from: (value: string | null) => {
        if (!value) return undefined;
        try {
          return JSON.parse(value);
        } catch {
          return undefined;
        }
      }
    }
  })
  consolidatedFrom?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
