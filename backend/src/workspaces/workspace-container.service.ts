import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import Docker from 'dockerode';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { WorkspaceStatus } from '@agentdb9/shared';
import { DockerVolumeService } from './docker-volume.service';

@Injectable()
export class WorkspaceContainerService {
  private readonly logger = new Logger(WorkspaceContainerService.name);
  private readonly docker: Docker;

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly dockerVolumeService: DockerVolumeService,
  ) {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async startWorkspace(workspaceId: string): Promise<WorkspaceEntity> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    try {
      if (workspace.containerName) {
        const container = await this.getContainer(workspace.containerName);
        if (container) {
          const info = await container.inspect();
          if (info.State.Running) {
            this.logger.log(`Container ${workspace.containerName} is already running`);
            return workspace;
          }
          this.logger.log(`Starting existing container: ${workspace.containerName}`);
          await container.start();
        } else {
          await this.createAndStartContainer(workspace);
        }
      } else {
        await this.createAndStartContainer(workspace);
      }

      workspace.status = WorkspaceStatus.RUNNING;
      return await this.workspaceRepository.save(workspace);
    } catch (error) {
      this.logger.error(`Failed to start workspace ${workspaceId}:`, error);
      workspace.status = WorkspaceStatus.ERROR;
      await this.workspaceRepository.save(workspace);
      throw new InternalServerErrorException(
        `Failed to start workspace: ${error.message}`,
      );
    }
  }

  async stopWorkspace(workspaceId: string): Promise<WorkspaceEntity> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    try {
      if (workspace.containerName) {
        const container = await this.getContainer(workspace.containerName);
        if (container) {
          const info = await container.inspect();
          if (info.State.Running) {
            this.logger.log(`Stopping container: ${workspace.containerName}`);
            await container.stop({ t: 10 });
          }
        }
      }

      workspace.status = WorkspaceStatus.STOPPED;
      return await this.workspaceRepository.save(workspace);
    } catch (error) {
      this.logger.error(`Failed to stop workspace ${workspaceId}:`, error);
      throw new InternalServerErrorException(
        `Failed to stop workspace: ${error.message}`,
      );
    }
  }

  async restartWorkspace(workspaceId: string): Promise<WorkspaceEntity> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    try {
      if (workspace.containerName) {
        const container = await this.getContainer(workspace.containerName);
        if (container) {
          this.logger.log(`Restarting container: ${workspace.containerName}`);
          await container.restart({ t: 10 });
        } else {
          await this.createAndStartContainer(workspace);
        }
      } else {
        await this.createAndStartContainer(workspace);
      }

      workspace.status = WorkspaceStatus.RUNNING;
      return await this.workspaceRepository.save(workspace);
    } catch (error) {
      this.logger.error(`Failed to restart workspace ${workspaceId}:`, error);
      workspace.status = WorkspaceStatus.ERROR;
      await this.workspaceRepository.save(workspace);
      throw new InternalServerErrorException(
        `Failed to restart workspace: ${error.message}`,
      );
    }
  }

  async deleteWorkspaceContainer(workspaceId: string): Promise<void> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    try {
      if (workspace.containerName) {
        const container = await this.getContainer(workspace.containerName);
        if (container) {
          const info = await container.inspect();
          if (info.State.Running) {
            this.logger.log(`Stopping container before deletion: ${workspace.containerName}`);
            await container.stop({ t: 10 });
          }
          this.logger.log(`Removing container: ${workspace.containerName}`);
          await container.remove();
        }
      }

      workspace.containerName = undefined;
      workspace.status = WorkspaceStatus.STOPPED;
      await this.workspaceRepository.save(workspace);
    } catch (error) {
      this.logger.error(`Failed to delete container for workspace ${workspaceId}:`, error);
      throw new InternalServerErrorException(
        `Failed to delete container: ${error.message}`,
      );
    }
  }

  async getWorkspaceStatus(workspaceId: string): Promise<{
    status: WorkspaceStatus;
    containerRunning: boolean;
    containerInfo?: Docker.ContainerInspectInfo;
  }> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    let containerRunning = false;
    let containerInfo: Docker.ContainerInspectInfo | undefined;

    if (workspace.containerName) {
      const container = await this.getContainer(workspace.containerName);
      if (container) {
        try {
          containerInfo = await container.inspect();
          containerRunning = containerInfo.State.Running;
        } catch (error) {
          this.logger.warn(`Failed to inspect container ${workspace.containerName}:`, error);
        }
      }
    }

    return {
      status: workspace.status,
      containerRunning,
      containerInfo,
    };
  }

  async switchProjectVolume(
    workspaceId: string,
    projectId: string,
  ): Promise<WorkspaceEntity> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    try {
      const wasRunning = workspace.status === WorkspaceStatus.RUNNING;

      if (wasRunning) {
        this.logger.log(`Stopping workspace to switch project volume`);
        await this.stopWorkspace(workspaceId);
      }

      await this.dockerVolumeService.ensureProjectVolume(projectId);

      workspace.currentProjectId = projectId;
      await this.workspaceRepository.save(workspace);

      if (wasRunning) {
        this.logger.log(`Restarting workspace with new project volume`);
        await this.startWorkspace(workspaceId);
      }

      return workspace;
    } catch (error) {
      this.logger.error(`Failed to switch project volume for workspace ${workspaceId}:`, error);
      throw new InternalServerErrorException(
        `Failed to switch project volume: ${error.message}`,
      );
    }
  }

  private async createAndStartContainer(workspace: WorkspaceEntity): Promise<void> {
    const containerName = this.getContainerName(workspace.id);
    const config = workspace.config as any;

    const volumeBinds: string[] = [];
    if (workspace.currentProjectId) {
      const volumeName = await this.dockerVolumeService.ensureProjectVolume(
        workspace.currentProjectId,
      );
      volumeBinds.push(`${volumeName}:/workspace`);
    }

    const containerConfig: Docker.ContainerCreateOptions = {
      name: containerName,
      Image: config.containerImage || 'codercom/code-server:latest',
      Env: [
        `WORKSPACE_TYPE=${workspace.type}`,
        `WORKSPACE_ID=${workspace.id}`,
        `PROJECT_ID=${workspace.currentProjectId || ''}`,
      ],
      HostConfig: {
        Binds: volumeBinds,
        NetworkMode: 'agentdb9_default',
        RestartPolicy: {
          Name: 'unless-stopped',
        },
      },
      Labels: {
        'agentdb9.workspace.id': workspace.id,
        'agentdb9.workspace.type': workspace.type,
        'agentdb9.managed': 'true',
      },
    };

    this.logger.log(`Creating container: ${containerName}`);
    const container = await this.docker.createContainer(containerConfig);

    this.logger.log(`Starting container: ${containerName}`);
    await container.start();

    workspace.containerName = containerName;
    await this.workspaceRepository.save(workspace);
  }

  private getContainerName(workspaceId: string): string {
    return `agentdb9-workspace-${workspaceId}`;
  }

  private async getContainer(containerName: string): Promise<Docker.Container | null> {
    try {
      const container = this.docker.getContainer(containerName);
      await container.inspect();
      return container;
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
}
