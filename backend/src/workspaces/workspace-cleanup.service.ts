import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { WorkspaceStatus } from '@agentdb9/shared';
import { WorkspaceContainerService } from './workspace-container.service';
import { DockerVolumeService } from './docker-volume.service';

@Injectable()
export class WorkspaceCleanupService {
  private readonly logger = new Logger(WorkspaceCleanupService.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly containerService: WorkspaceContainerService,
    private readonly volumeService: DockerVolumeService,
  ) {}

  /**
   * Clean up inactive workspace containers
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupInactiveContainers(): Promise<void> {
    this.logger.log('Starting cleanup of inactive workspace containers');

    try {
      // Find workspaces that have been inactive for more than 24 hours
      const inactiveThreshold = new Date();
      inactiveThreshold.setHours(inactiveThreshold.getHours() - 24);

      const inactiveWorkspaces = await this.workspaceRepository.find({
        where: {
          status: WorkspaceStatus.RUNNING,
          updatedAt: LessThan(inactiveThreshold),
        },
      });

      this.logger.log(`Found ${inactiveWorkspaces.length} inactive workspaces`);

      for (const workspace of inactiveWorkspaces) {
        try {
          // Check if container is actually running
          const status = await this.containerService.getWorkspaceStatus(workspace.id);
          
          if (status.containerRunning) {
            this.logger.log(`Stopping inactive workspace: ${workspace.id} (${workspace.name})`);
            await this.containerService.stopWorkspace(workspace.id);
          }
        } catch (error) {
          this.logger.error(`Failed to stop workspace ${workspace.id}:`, error);
        }
      }

      this.logger.log('Inactive container cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup inactive containers:', error);
    }
  }

  /**
   * Clean up orphaned containers
   * Runs every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupOrphanedContainers(): Promise<void> {
    this.logger.log('Starting cleanup of orphaned containers');

    try {
      const workspaces = await this.workspaceRepository.find();
      const validContainerNames = new Set(
        workspaces
          .filter(w => w.containerName)
          .map(w => w.containerName)
      );

      // Get all managed containers from Docker
      const Docker = require('dockerode');
      const docker = new Docker({ socketPath: '/var/run/docker.sock' });
      
      const containers = await docker.listContainers({
        all: true,
        filters: { label: ['agentdb9.managed=true'] },
      });

      let cleanedCount = 0;
      for (const containerInfo of containers) {
        const containerName = containerInfo.Names[0].replace('/', '');
        
        if (!validContainerNames.has(containerName)) {
          this.logger.log(`Removing orphaned container: ${containerName}`);
          try {
            const container = docker.getContainer(containerInfo.Id);
            if (containerInfo.State === 'running') {
              await container.stop({ t: 10 });
            }
            await container.remove();
            cleanedCount++;
          } catch (error) {
            this.logger.error(`Failed to remove container ${containerName}:`, error);
          }
        }
      }

      this.logger.log(`Orphaned container cleanup completed: ${cleanedCount} containers removed`);
    } catch (error) {
      this.logger.error('Failed to cleanup orphaned containers:', error);
    }
  }

  /**
   * Clean up orphaned volumes
   * Runs daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOrphanedVolumes(): Promise<void> {
    this.logger.log('Starting cleanup of orphaned volumes');

    try {
      const cleanedCount = await this.volumeService.cleanupOrphanedVolumes();
      this.logger.log(`Orphaned volume cleanup completed: ${cleanedCount} volumes removed`);
    } catch (error) {
      this.logger.error('Failed to cleanup orphaned volumes:', error);
    }
  }

  /**
   * Clean up error state workspaces
   * Runs every 30 minutes
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async cleanupErrorWorkspaces(): Promise<void> {
    this.logger.log('Starting cleanup of error state workspaces');

    try {
      const errorWorkspaces = await this.workspaceRepository.find({
        where: { status: WorkspaceStatus.ERROR },
      });

      this.logger.log(`Found ${errorWorkspaces.length} workspaces in error state`);

      for (const workspace of errorWorkspaces) {
        try {
          // Try to get actual container status
          const status = await this.containerService.getWorkspaceStatus(workspace.id);
          
          if (status.containerRunning) {
            // Container is actually running, update status
            workspace.status = WorkspaceStatus.RUNNING;
            await this.workspaceRepository.save(workspace);
            this.logger.log(`Recovered workspace ${workspace.id} from error state`);
          } else if (workspace.containerName) {
            // Container exists but not running, try to clean it up
            try {
              await this.containerService.deleteWorkspaceContainer(workspace.id);
              workspace.status = WorkspaceStatus.STOPPED;
              await this.workspaceRepository.save(workspace);
              this.logger.log(`Cleaned up error workspace ${workspace.id}`);
            } catch (error) {
              this.logger.warn(`Failed to cleanup error workspace ${workspace.id}:`, error);
            }
          }
        } catch (error) {
          this.logger.error(`Failed to process error workspace ${workspace.id}:`, error);
        }
      }

      this.logger.log('Error workspace cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup error workspaces:', error);
    }
  }

  /**
   * Manual cleanup trigger
   */
  async triggerManualCleanup(): Promise<{
    inactiveContainers: number;
    orphanedContainers: number;
    orphanedVolumes: number;
    errorWorkspaces: number;
  }> {
    this.logger.log('Manual cleanup triggered');

    const results = {
      inactiveContainers: 0,
      orphanedContainers: 0,
      orphanedVolumes: 0,
      errorWorkspaces: 0,
    };

    try {
      await this.cleanupInactiveContainers();
      await this.cleanupOrphanedContainers();
      const volumeCount = await this.volumeService.cleanupOrphanedVolumes();
      results.orphanedVolumes = volumeCount;
      await this.cleanupErrorWorkspaces();
    } catch (error) {
      this.logger.error('Manual cleanup failed:', error);
      throw error;
    }

    return results;
  }
}
