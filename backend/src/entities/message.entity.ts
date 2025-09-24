import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ConversationMessage } from '@agentdb9/shared';
import { Conversation } from './conversation.entity';

@Entity('messages')
export class Message implements ConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @Column({ type: 'varchar', length: 50 })
  role: string;

  @Column('text')
  content: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => Conversation, conversation => conversation.messages)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;
}