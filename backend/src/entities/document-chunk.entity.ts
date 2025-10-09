import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { KnowledgeSource } from './knowledge-source.entity';
import { Agent } from './agent.entity';
import { parseJSON } from '../common/utils/json-parser.util';

@Entity('document_chunks')
@Index(['agentId', 'sourceId'])
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sourceId: string;

  @ManyToOne(() => KnowledgeSource)
  @JoinColumn({ name: 'sourceId' })
  source: KnowledgeSource;

  @Column()
  agentId: string;

  @ManyToOne(() => Agent)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column('text')
  content: string;

  @Column('text', {
    nullable: true,
    transformer: {
      to: (value: number[]) => value ? JSON.stringify(value) : null,
      from: (value: any) => {
        if (!value) return null;
        if (typeof value === 'string') {
          return parseJSON(value);
        }
        return value;
      }
    }
  })
  embedding?: number[];

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
    chunkIndex: number;
    startOffset: number;
    endOffset: number;
    tokenCount: number;
    characterCount: number;
    sourceType: string;
    sourceUrl?: string;
    sourceTitle: string;
    heading?: string;
    section?: string;
    codeLanguage?: string;
    tags: string[];
    category?: string;
    importance?: number;
    version?: string;
    lastUpdated: Date;
  };

  @CreateDateColumn()
  createdAt: Date;
}
