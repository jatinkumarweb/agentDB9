import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { Project } from '../entities/project.entity';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspaceContainerService } from './workspace-container.service';
import { DockerVolumeService } from './docker-volume.service';
import { ProjectWorkspaceService } from './project-workspace.service';
import { WorkspaceCleanupService } from './workspace-cleanup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkspaceEntity, Project]),
    ScheduleModule.forRoot(),
  ],
  controllers: [WorkspacesController],
  providers: [
    WorkspacesService,
    WorkspaceContainerService,
    DockerVolumeService,
    ProjectWorkspaceService,
    WorkspaceCleanupService,
  ],
  exports: [
    WorkspacesService,
    WorkspaceContainerService,
    DockerVolumeService,
    ProjectWorkspaceService,
    WorkspaceCleanupService,
  ],
})
export class WorkspacesModule {}
