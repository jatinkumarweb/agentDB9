import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Agent } from './agent.entity';
import { Conversation } from './conversation.entity';
import { jsonrepair } from 'jsonrepair';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  username: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 'user' })
  role: 'user' | 'admin';

  @Column('text', { 
    nullable: true,
    transformer: {
      to: (value: any) => value ? JSON.stringify(value) : null,
      from: (value: any) => {
        if (!value) return null;
        if (typeof value === 'string') {
          try {
            const repaired = jsonrepair(value);
            return JSON.parse(repaired);
          } catch (error) {
            console.error('Failed to parse preferences JSON:', error);
            return null;
          }
        }
        return value;
      }
    }
  })
  preferences?: {
    theme?: 'light' | 'dark';
    defaultModel?: string;
    codeStyle?: {
      indentSize?: number;
      useSpaces?: boolean;
      semicolons?: boolean;
    };
    notifications?: {
      email?: boolean;
      browser?: boolean;
    };
  };

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Agent, agent => agent.user)
  agents: Agent[];

  @OneToMany(() => Conversation, conversation => conversation.user)
  conversations: Conversation[];
}