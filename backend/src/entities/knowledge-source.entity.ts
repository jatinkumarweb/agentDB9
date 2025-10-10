import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Agent } from './agent.entity';
import { parseJSON } from '../common/utils/json-parser.util';

@Entity('knowledge_sources')
export class KnowledgeSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agentId: string;

  @ManyToOne(() => Agent)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type: 'pdf' | 'markdown' | 'website' | 'api' | 'github' | 'documentation';

  @Column({ nullable: true, type: 'text' })
  url?: string;

  @Column({ nullable: true, type: 'text' })
  content?: string;

  @Column('text', {
    transformer: {
      to: (value: any) => JSON.stringify(value),
      from: (value: any) => {
        if (typeof value === 'string') {
          return parseJSON(value) || {};
        }
        return value || {};
      }
    }
  })
  metadata: {
    title: string;
    description?: string;
    tags: string[];
    version?: string;
    language?: string;
    framework?: string;
    author?: string;
    chunkCount?: number;
    tokenCount?: number;
  };

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: 'pending' | 'processing' | 'indexed' | 'failed';

  @Column({ nullable: true, type: 'datetime' })
  lastIndexed?: Date;

  @Column({ nullable: true, type: 'text' })
  error?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
