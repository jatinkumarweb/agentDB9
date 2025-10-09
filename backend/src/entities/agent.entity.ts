import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import type { CodingAgent, AgentStatus, AgentCapability, AgentConfiguration } from '@agentdb9/shared';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';
import { parseJSON } from '../common/utils/json-parser.util';

@Entity('agents')
export class Agent implements CodingAgent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, user => user.agents)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('text', { 
    nullable: true,
    default: null,
    transformer: {
      to: (value: AgentConfiguration) => JSON.stringify(value),
      from: (value: any) => {
        if (typeof value === 'string') {
          return parseJSON(value) || value;
        }
        return value;
      }
    }
  })
  configuration: AgentConfiguration;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'idle'
  })
  status: AgentStatus;

  @Column('text', { 
    nullable: true,
    default: null,
    transformer: {
      to: (value: AgentCapability[]) => JSON.stringify(value),
      from: (value: any) => {
        if (typeof value === 'string') {
          return parseJSON(value) || [];
        }
        return value;
      }
    }
  })
  capabilities: AgentCapability[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Conversation, conversation => conversation.agent)
  conversations: Conversation[];
}