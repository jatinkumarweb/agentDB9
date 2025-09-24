import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import type { CodingAgent, AgentStatus, AgentCapability, AgentConfiguration } from '@agentdb9/shared';
import { Conversation } from './conversation.entity';

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

  @Column('jsonb')
  configuration: AgentConfiguration;

  @Column({
    type: 'enum',
    enum: ['idle', 'working', 'error', 'disabled'],
    default: 'idle'
  })
  status: AgentStatus;

  @Column('jsonb')
  capabilities: AgentCapability[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Conversation, conversation => conversation.agent)
  conversations: Conversation[];
}