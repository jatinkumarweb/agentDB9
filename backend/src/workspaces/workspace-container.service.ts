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
    health?: {
      status: string;
      failingStreak: number;
      log?: Array<{ exitCode: number; output: string; start: string; end: string }>;
    };
    resources?: {
      cpuUsage?: number;
      memoryUsage?: number;
      memoryLimit?: number;
    };
  }> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    let containerRunning = false;
    let containerInfo: Docker.ContainerInspectInfo | undefined;
    let health: any;
    let resources: any;

    if (workspace.containerName) {
      const container = await this.getContainer(workspace.containerName);
      if (container) {
        try {
          containerInfo = await container.inspect();
          containerRunning = containerInfo.State.Running;

          // Extract health check info
          if (containerInfo.State.Health) {
            health = {
              status: containerInfo.State.Health.Status,
              failingStreak: containerInfo.State.Health.FailingStreak,
              log: containerInfo.State.Health.Log?.slice(-3), // Last 3 health checks
            };
          }

          // Get resource usage stats
          try {
            const stats = await container.stats({ stream: false });
            const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
            const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
            const cpuUsage = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;

            resources = {
              cpuUsage: Math.round(cpuUsage * 100) / 100,
              memoryUsage: Math.round(stats.memory_stats.usage / 1024 / 1024), // MB
              memoryLimit: Math.round(stats.memory_stats.limit / 1024 / 1024), // MB
            };
          } catch (error) {
            this.logger.warn(`Failed to get container stats for ${workspace.containerName}:`, error);
          }
        } catch (error) {
          this.logger.warn(`Failed to inspect container ${workspace.containerName}:`, error);
        }
      }
    }

    return {
      status: workspace.status,
      containerRunning,
      containerInfo,
      health,
      resources,
    };
  }

  async getContainerHealth(workspaceId: string): Promise<{
    healthy: boolean;
    status: string;
    failingStreak: number;
    lastCheck?: { exitCode: number; output: string; timestamp: string };
  }> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    if (!workspace.containerName) {
      return {
        healthy: false,
        status: 'no_container',
        failingStreak: 0,
      };
    }

    const container = await this.getContainer(workspace.containerName);
    if (!container) {
      return {
        healthy: false,
        status: 'container_not_found',
        failingStreak: 0,
      };
    }

    try {
      const info = await container.inspect();
      
      if (!info.State.Health) {
        return {
          healthy: info.State.Running,
          status: info.State.Running ? 'running_no_healthcheck' : 'stopped',
          failingStreak: 0,
        };
      }

      const lastLog = info.State.Health.Log?.[info.State.Health.Log.length - 1];
      
      return {
        healthy: info.State.Health.Status === 'healthy',
        status: info.State.Health.Status,
        failingStreak: info.State.Health.FailingStreak,
        lastCheck: lastLog ? {
          exitCode: lastLog.ExitCode,
          output: lastLog.Output,
          timestamp: lastLog.End,
        } : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get health for workspace ${workspaceId}:`, error);
      return {
        healthy: false,
        status: 'error',
        failingStreak: 0,
      };
    }
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

    // Apply resource limits if configured
    const resourceLimits = config.resourceLimits || {};
    const hostConfig: any = {
      Binds: volumeBinds,
      NetworkMode: 'agentdb9_default',
      RestartPolicy: {
        Name: 'unless-stopped',
      },
    };

    // CPU limits
    if (resourceLimits.cpus) {
      hostConfig.NanoCpus = Math.floor(resourceLimits.cpus * 1e9);
    }

    // Memory limits
    if (resourceLimits.memory) {
      hostConfig.Memory = resourceLimits.memory * 1024 * 1024; // Convert MB to bytes
    }
    if (resourceLimits.memorySwap) {
      hostConfig.MemorySwap = resourceLimits.memorySwap * 1024 * 1024;
    }
    if (resourceLimits.memoryReservation) {
      hostConfig.MemoryReservation = resourceLimits.memoryReservation * 1024 * 1024;
    }

    // Health check configuration
    const healthCheck = config.healthCheck;
    const healthCheckConfig: any = {};
    if (healthCheck?.enabled) {
      healthCheckConfig.Test = ['CMD-SHELL', 'curl -f http://localhost:' + (config.defaultPort || 8080) + '/healthz || exit 1'];
      healthCheckConfig.Interval = (healthCheck.interval || 30) * 1e9; // Convert to nanoseconds
      healthCheckConfig.Timeout = (healthCheck.timeout || 10) * 1e9;
      healthCheckConfig.Retries = healthCheck.retries || 3;
      healthCheckConfig.StartPeriod = 60 * 1e9; // 60 seconds startup grace period
    }

    const containerConfig: Docker.ContainerCreateOptions = {
      name: containerName,
      Image: config.containerImage || 'codercom/code-server:latest',
      Env: [
        `WORKSPACE_TYPE=${workspace.type}`,
        `WORKSPACE_ID=${workspace.id}`,
        `PROJECT_ID=${workspace.currentProjectId || ''}`,
      ],
      HostConfig: hostConfig,
      Healthcheck: healthCheck?.enabled ? healthCheckConfig : undefined,
      Labels: {
        'agentdb9.workspace.id': workspace.id,
        'agentdb9.workspace.type': workspace.type,
        'agentdb9.managed': 'true',
      },
    };

    this.logger.log(`Creating container: ${containerName} with resource limits: CPU=${resourceLimits.cpus || 'unlimited'}, Memory=${resourceLimits.memory || 'unlimited'}MB`);
    const container = await this.docker.createContainer(containerConfig);

    this.logger.log(`Starting container: ${containerName}`);
    await container.start();

    workspace.containerName = containerName;
    await this.workspaceRepository.save(workspace);
  }

  async getContainerLogs(
    workspaceId: string,
    options?: {
      tail?: number;
      since?: number;
      timestamps?: boolean;
      follow?: boolean;
    },
  ): Promise<NodeJS.ReadableStream> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    if (!workspace.containerName) {
      throw new NotFoundException(`Workspace ${workspaceId} has no container`);
    }

    const container = await this.getContainer(workspace.containerName);
    if (!container) {
      throw new NotFoundException(`Container ${workspace.containerName} not found`);
    }

    try {
      const logOptions: any = {
        stdout: true,
        stderr: true,
        follow: options?.follow || false,
        tail: options?.tail || 100,
        timestamps: options?.timestamps || false,
      };

      if (options?.since) {
        logOptions.since = options.since;
      }

      const stream = await container.logs(logOptions);
      return stream as any as NodeJS.ReadableStream;
    } catch (error) {
      this.logger.error(`Failed to get logs for workspace ${workspaceId}:`, error);
      throw new InternalServerErrorException(
        `Failed to get container logs: ${error.message}`,
      );
    }
  }

  async getContainerStats(workspaceId: string): Promise<any> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    if (!workspace.containerName) {
      throw new NotFoundException(`Workspace ${workspaceId} has no container`);
    }

    const container = await this.getContainer(workspace.containerName);
    if (!container) {
      throw new NotFoundException(`Container ${workspace.containerName} not found`);
    }

    try {
      const stats = await container.stats({ stream: false });
      
      // Calculate CPU percentage
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuPercent = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;

      // Calculate memory percentage
      const memoryUsage = stats.memory_stats.usage;
      const memoryLimit = stats.memory_stats.limit;
      const memoryPercent = (memoryUsage / memoryLimit) * 100;

      return {
        cpu: {
          percent: Math.round(cpuPercent * 100) / 100,
          usage: stats.cpu_stats.cpu_usage.total_usage,
          systemUsage: stats.cpu_stats.system_cpu_usage,
        },
        memory: {
          percent: Math.round(memoryPercent * 100) / 100,
          usage: Math.round(memoryUsage / 1024 / 1024), // MB
          limit: Math.round(memoryLimit / 1024 / 1024), // MB
          cache: Math.round((stats.memory_stats.stats?.cache || 0) / 1024 / 1024), // MB
        },
        network: stats.networks,
        blockIO: stats.blkio_stats,
      };
    } catch (error) {
      this.logger.error(`Failed to get stats for workspace ${workspaceId}:`, error);
      throw new InternalServerErrorException(
        `Failed to get container stats: ${error.message}`,
      );
    }
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
