import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { WorkspaceType } from '@agentdb9/shared';

@Injectable()
export class ProjectWorkspaceService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
  ) {}

  async assignProjectToWorkspace(
    projectId: string,
    workspaceId: string,
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    if (project.userId !== workspace.userId) {
      throw new BadRequestException(
        'Project and workspace must belong to the same user',
      );
    }

    project.workspaceId = workspaceId;
    project.workspaceType = workspace.type;

    return await this.projectRepository.save(project);
  }

  async unassignProjectFromWorkspace(projectId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    project.workspaceId = undefined;
    project.workspaceType = undefined;

    return await this.projectRepository.save(project);
  }

  async getProjectsByWorkspace(workspaceId: string): Promise<Project[]> {
    return await this.projectRepository.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
    });
  }

  async getCompatibleProjects(
    userId: string,
    workspaceType: WorkspaceType,
  ): Promise<Project[]> {
    const allProjects = await this.projectRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return allProjects.filter((project) => {
      if (!project.workspaceType) {
        return true;
      }
      return project.workspaceType === workspaceType;
    });
  }

  async getUnassignedProjects(userId: string): Promise<Project[]> {
    const allProjects = await this.projectRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return allProjects.filter(p => !p.workspaceId);
  }

  async switchWorkspaceProject(
    workspaceId: string,
    projectId: string,
  ): Promise<WorkspaceEntity> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (project.userId !== workspace.userId) {
      throw new BadRequestException(
        'Project and workspace must belong to the same user',
      );
    }

    if (project.workspaceType && project.workspaceType !== workspace.type) {
      throw new BadRequestException(
        `Project is configured for ${project.workspaceType} workspace, but workspace is ${workspace.type}`,
      );
    }

    workspace.currentProjectId = projectId;
    return await this.workspaceRepository.save(workspace);
  }

  async getWorkspaceStats(workspaceId: string): Promise<{
    totalProjects: number;
    assignedProjects: number;
    currentProject: Project | null;
  }> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    const assignedProjects = await this.getProjectsByWorkspace(workspaceId);
    const totalProjects = await this.projectRepository.count({
      where: { userId: workspace.userId },
    });

    let currentProject: Project | null = null;
    if (workspace.currentProjectId) {
      currentProject = await this.projectRepository.findOne({
        where: { id: workspace.currentProjectId },
      });
    }

    return {
      totalProjects,
      assignedProjects: assignedProjects.length,
      currentProject,
    };
  }
}
