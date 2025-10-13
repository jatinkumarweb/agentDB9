import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import Docker from 'dockerode';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';

@Injectable()
export class DockerVolumeService {
  private readonly logger = new Logger(DockerVolumeService.name);
  private readonly docker: Docker;

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async createProjectVolume(projectId: string): Promise<string> {
    const volumeName = this.getVolumeName(projectId);

    try {
      const existingVolume = await this.getVolume(volumeName);
      if (existingVolume) {
        this.logger.log(`Volume ${volumeName} already exists`);
        return volumeName;
      }

      this.logger.log(`Creating volume: ${volumeName}`);
      await this.docker.createVolume({
        Name: volumeName,
        Labels: {
          'agentdb9.project.id': projectId,
          'agentdb9.managed': 'true',
        },
      });

      const project = await this.projectRepository.findOne({
        where: { id: projectId },
      });

      if (project) {
        project.volumeName = volumeName;
        project.volumePath = `/var/lib/docker/volumes/${volumeName}/_data`;
        await this.projectRepository.save(project);
      }

      this.logger.log(`Volume ${volumeName} created successfully`);
      return volumeName;
    } catch (error) {
      this.logger.error(`Failed to create volume ${volumeName}:`, error);
      throw new InternalServerErrorException(
        `Failed to create volume: ${error.message}`,
      );
    }
  }

  async deleteProjectVolume(projectId: string): Promise<void> {
    const volumeName = this.getVolumeName(projectId);

    try {
      const volume = await this.getVolume(volumeName);
      if (!volume) {
        this.logger.warn(`Volume ${volumeName} does not exist`);
        return;
      }

      this.logger.log(`Deleting volume: ${volumeName}`);
      await volume.remove();

      const project = await this.projectRepository.findOne({
        where: { id: projectId },
      });

      if (project) {
        project.volumeName = undefined;
        project.volumePath = undefined;
        await this.projectRepository.save(project);
      }

      this.logger.log(`Volume ${volumeName} deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete volume ${volumeName}:`, error);
      throw new InternalServerErrorException(
        `Failed to delete volume: ${error.message}`,
      );
    }
  }

  async listProjectVolumes(): Promise<
    Array<{ name: string; projectId: string; createdAt: string }>
  > {
    try {
      const volumes = await this.docker.listVolumes({
        filters: { label: ['agentdb9.managed=true'] },
      });

      if (!volumes.Volumes) {
        return [];
      }

      return volumes.Volumes.map((volume) => ({
        name: volume.Name,
        projectId: volume.Labels?.['agentdb9.project.id'] || 'unknown',
        createdAt: (volume as any).CreatedAt || new Date().toISOString(),
      }));
    } catch (error) {
      this.logger.error('Failed to list volumes:', error);
      throw new InternalServerErrorException(
        `Failed to list volumes: ${error.message}`,
      );
    }
  }

  async getVolumeInfo(volumeName: string): Promise<Docker.VolumeInspectInfo | null> {
    try {
      const volume = await this.getVolume(volumeName);
      if (!volume) {
        return null;
      }
      return await volume.inspect();
    } catch (error) {
      this.logger.error(`Failed to get volume info for ${volumeName}:`, error);
      return null;
    }
  }

  async ensureProjectVolume(projectId: string): Promise<string> {
    const volumeName = this.getVolumeName(projectId);
    const volume = await this.getVolume(volumeName);

    if (volume) {
      return volumeName;
    }

    return await this.createProjectVolume(projectId);
  }

  async cleanupOrphanedVolumes(): Promise<number> {
    try {
      const volumes = await this.listProjectVolumes();
      let cleanedCount = 0;

      for (const volume of volumes) {
        const project = await this.projectRepository.findOne({
          where: { id: volume.projectId },
        });

        if (!project) {
          this.logger.log(
            `Cleaning up orphaned volume: ${volume.name} (project ${volume.projectId} not found)`,
          );
          try {
            const dockerVolume = await this.getVolume(volume.name);
            if (dockerVolume) {
              await dockerVolume.remove();
              cleanedCount++;
            }
          } catch (error) {
            this.logger.error(
              `Failed to remove orphaned volume ${volume.name}:`,
              error,
            );
          }
        }
      }

      this.logger.log(`Cleaned up ${cleanedCount} orphaned volumes`);
      return cleanedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup orphaned volumes:', error);
      throw new InternalServerErrorException(
        `Failed to cleanup orphaned volumes: ${error.message}`,
      );
    }
  }

  private getVolumeName(projectId: string): string {
    return `agentdb9-project-${projectId}`;
  }

  private async getVolume(volumeName: string): Promise<Docker.Volume | null> {
    try {
      const volume = this.docker.getVolume(volumeName);
      await volume.inspect();
      return volume;
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
}
