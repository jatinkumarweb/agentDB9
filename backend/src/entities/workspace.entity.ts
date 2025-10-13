import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Workspace as WorkspaceInterface, WorkspaceType, WorkspaceStatus, WorkspaceTypeConfig } from '@agentdb9/shared';

@Entity('workspaces')
export class WorkspaceEntity implements WorkspaceInterface {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column()
  @Index()
  userId: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: WorkspaceType.VSCODE
  })
  @Index()
  type: WorkspaceType;

  @Column({ nullable: true })
  currentProjectId?: string;

  @Column({
    type: 'text',
    transformer: {
      to: (value: WorkspaceTypeConfig) => JSON.stringify(value),
      from: (value: string) => {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }
    }
  })
  config: WorkspaceTypeConfig;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active'
  })
  status: WorkspaceStatus;

  @Column({ nullable: true })
  containerName?: string;

  @Column({ nullable: true })
  volumeName?: string;

  @Column({ default: false })
  @Index()
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
