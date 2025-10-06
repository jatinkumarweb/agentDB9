import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import type { Project as ProjectInterface, ProjectStatus } from '@agentdb9/shared';

@Entity('projects')
export class Project implements ProjectInterface {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  repositoryUrl?: string;

  @Column({ nullable: true })
  localPath?: string;

  @Column({ nullable: true })
  framework?: string;

  @Column()
  language: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active'
  })
  status: ProjectStatus;

  @Column('text', { 
    default: '[]',
    transformer: {
      to: (value: string[]) => JSON.stringify(value || []),
      from: (value: any) => {
        if (!value) return [];
        if (typeof value === 'string') return JSON.parse(value);
        return value;
      }
    }
  })
  agents: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}