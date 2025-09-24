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
    type: 'enum',
    enum: ['active', 'archived', 'template'],
    default: 'active'
  })
  status: ProjectStatus;

  @Column('jsonb', { default: [] })
  agents: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}