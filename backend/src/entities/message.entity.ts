import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ConversationMessage } from '@agentdb9/shared';
import { Conversation } from './conversation.entity';
import { jsonrepair } from 'jsonrepair';

@Entity('messages')
export class Message implements Omit<ConversationMessage, 'role'> {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @Column({ type: 'varchar', length: 50 })
  role: string;

  @Column('text')
  content: string;

  @Column('text', { nullable: true, transformer: {
    to: (value: Record<string, any>) => value ? JSON.stringify(value) : null,
    from: (value: any) => {
      if (!value) return null;
      if (typeof value === 'string') {
        try {
          const repaired = jsonrepair(value);
          return JSON.parse(repaired);
        } catch (error) {
          console.error('Failed to parse metadata JSON:', error);
          return null;
        }
      }
      return value;
    }
  }})
  metadata?: Record<string, any>;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => Conversation, conversation => conversation.messages)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;
}