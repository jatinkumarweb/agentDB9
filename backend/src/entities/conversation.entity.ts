import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { AgentConversation } from '@agentdb9/shared';
import { Agent } from './agent.entity';
import { Message } from './message.entity';
import { User } from './user.entity';

@Entity('conversations')
export class Conversation implements Omit<AgentConversation, 'messages'> {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agentId: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, user => user.conversations)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  projectId?: string;

  @Column()
  title: string;

  @Column({
    type: 'enum',
    enum: ['active', 'archived'],
    default: 'active'
  })
  status: 'active' | 'archived';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Agent, agent => agent.conversations)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @OneToMany(() => Message, message => message.conversation)
  messages: Message[];
}