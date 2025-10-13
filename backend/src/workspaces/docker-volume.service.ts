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

  async backupProjectVolume(projectId: string, backupPath?: string): Promise<string> {
    const volumeName = this.getVolumeName(projectId);
    const volume = await this.getVolume(volumeName);

    if (!volume) {
      throw new InternalServerErrorException(`Volume ${volumeName} not found`);
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = backupPath || `/tmp/agentdb9-backup-${projectId}-${timestamp}.tar`;

      this.logger.log(`Creating backup of volume ${volumeName} to ${backupName}`);

      // Create a temporary container to access the volume
      const container = await this.docker.createContainer({
        Image: 'alpine:latest',
        Cmd: ['tar', 'czf', '/backup/backup.tar.gz', '-C', '/data', '.'],
        HostConfig: {
          Binds: [
            `${volumeName}:/data:ro`,
            `${backupName}:/backup/backup.tar.gz`,
          ],
          AutoRemove: true,
        },
      });

      await container.start();
      await container.wait();

      this.logger.log(`Backup created successfully: ${backupName}`);
      return backupName;
    } catch (error) {
      this.logger.error(`Failed to backup volume ${volumeName}:`, error);
      throw new InternalServerErrorException(
        `Failed to backup volume: ${error.message}`,
      );
    }
  }

  async restoreProjectVolume(projectId: string, backupPath: string): Promise<void> {
    const volumeName = this.getVolumeName(projectId);

    try {
      // Ensure volume exists
      await this.ensureProjectVolume(projectId);

      this.logger.log(`Restoring volume ${volumeName} from ${backupPath}`);

      // Create a temporary container to restore the volume
      const container = await this.docker.createContainer({
        Image: 'alpine:latest',
        Cmd: ['tar', 'xzf', '/backup/backup.tar.gz', '-C', '/data'],
        HostConfig: {
          Binds: [
            `${volumeName}:/data`,
            `${backupPath}:/backup/backup.tar.gz:ro`,
          ],
          AutoRemove: true,
        },
      });

      await container.start();
      await container.wait();

      this.logger.log(`Volume ${volumeName} restored successfully`);
    } catch (error) {
      this.logger.error(`Failed to restore volume ${volumeName}:`, error);
      throw new InternalServerErrorException(
        `Failed to restore volume: ${error.message}`,
      );
    }
  }

  async cloneProjectVolume(sourceProjectId: string, targetProjectId: string): Promise<string> {
    const sourceVolumeName = this.getVolumeName(sourceProjectId);
    const targetVolumeName = this.getVolumeName(targetProjectId);

    const sourceVolume = await this.getVolume(sourceVolumeName);
    if (!sourceVolume) {
      throw new InternalServerErrorException(`Source volume ${sourceVolumeName} not found`);
    }

    try {
      this.logger.log(`Cloning volume ${sourceVolumeName} to ${targetVolumeName}`);

      // Create target volume
      await this.createProjectVolume(targetProjectId);

      // Copy data from source to target using a temporary container
      const container = await this.docker.createContainer({
        Image: 'alpine:latest',
        Cmd: ['sh', '-c', 'cp -a /source/. /target/'],
        HostConfig: {
          Binds: [
            `${sourceVolumeName}:/source:ro`,
            `${targetVolumeName}:/target`,
          ],
          AutoRemove: true,
        },
      });

      await container.start();
      await container.wait();

      this.logger.log(`Volume cloned successfully: ${targetVolumeName}`);
      return targetVolumeName;
    } catch (error) {
      this.logger.error(`Failed to clone volume ${sourceVolumeName}:`, error);
      throw new InternalServerErrorException(
        `Failed to clone volume: ${error.message}`,
      );
    }
  }

  async getVolumeSize(projectId: string): Promise<number> {
    const volumeName = this.getVolumeName(projectId);
    const volume = await this.getVolume(volumeName);

    if (!volume) {
      throw new InternalServerErrorException(`Volume ${volumeName} not found`);
    }

    try {
      // Use a temporary container to calculate volume size
      const container = await this.docker.createContainer({
        Image: 'alpine:latest',
        Cmd: ['du', '-sb', '/data'],
        HostConfig: {
          Binds: [`${volumeName}:/data:ro`],
          AutoRemove: true,
        },
      });

      await container.start();
      const stream = await container.logs({
        stdout: true,
        stderr: true,
        follow: true,
      });

      let output = '';
      stream.on('data', (chunk) => {
        output += chunk.toString();
      });

      await container.wait();

      // Parse du output (format: "12345\t/data")
      const match = output.match(/(\d+)/);
      const sizeBytes = match ? parseInt(match[1], 10) : 0;

      return sizeBytes;
    } catch (error) {
      this.logger.error(`Failed to get volume size for ${volumeName}:`, error);
      return 0;
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
