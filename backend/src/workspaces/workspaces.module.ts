import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { Project } from '../entities/project.entity';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspaceContainerService } from './workspace-container.service';
import { DockerVolumeService } from './docker-volume.service';
import { ProjectWorkspaceService } from './project-workspace.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceEntity, Project])],
  controllers: [WorkspacesController],
  providers: [
    WorkspacesService,
    WorkspaceContainerService,
    DockerVolumeService,
    ProjectWorkspaceService,
  ],
  exports: [
    WorkspacesService,
    WorkspaceContainerService,
    DockerVolumeService,
    ProjectWorkspaceService,
  ],
})
export class WorkspacesModule {}
