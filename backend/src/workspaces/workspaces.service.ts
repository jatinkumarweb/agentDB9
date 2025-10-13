import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceEntity } from '../entities/workspace.entity';
import {
  Workspace,
  WorkspaceType,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  getWorkspaceTypeConfig,
  isWorkspaceTypeAvailable,
} from '@agentdb9/shared';

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private workspaceRepository: Repository<WorkspaceEntity>,
  ) {}

  /**
   * Create a new workspace
   */
  async create(userId: string, request: CreateWorkspaceRequest): Promise<Workspace> {
    this.logger.log(`Creating workspace: ${request.name} (${request.type}) for user ${userId}`);

    // Validate workspace type
    if (!isWorkspaceTypeAvailable(request.type)) {
      throw new BadRequestException(`Workspace type ${request.type} is not available`);
    }

    // Get workspace type configuration
    const config = getWorkspaceTypeConfig(request.type);

    // If this is the first workspace or marked as default, set it as default
    const existingWorkspaces = await this.findByUser(userId);
    const isDefault = request.isDefault || existingWorkspaces.length === 0;

    // If setting as default, unset other defaults
    if (isDefault) {
      await this.unsetAllDefaults(userId);
    }

    // Create workspace entity
    const workspace = this.workspaceRepository.create({
      name: request.name,
      description: request.description,
      userId,
      type: request.type,
      config,
      status: 'active',
      isDefault,
      currentProjectId: request.projectId,
    });

    const saved = await this.workspaceRepository.save(workspace);
    this.logger.log(`Created workspace: ${saved.id}`);

    return saved;
  }

  /**
   * Find all workspaces for a user
   */
  async findByUser(userId: string): Promise<Workspace[]> {
    return this.workspaceRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Find workspaces by type
   */
  async findByType(userId: string, type: WorkspaceType): Promise<Workspace[]> {
    return this.workspaceRepository.find({
      where: { userId, type },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find workspace by ID
   */
  async findOne(id: string): Promise<Workspace> {
    const workspace = await this.workspaceRepository.findOne({ where: { id } });
    
    if (!workspace) {
      throw new NotFoundException(`Workspace ${id} not found`);
    }

    return workspace;
  }

  /**
   * Get default workspace for user
   */
  async getDefault(userId: string): Promise<Workspace | null> {
    return this.workspaceRepository.findOne({
      where: { userId, isDefault: true },
    });
  }

  /**
   * Set workspace as default
   */
  async setDefault(workspaceId: string): Promise<void> {
    const workspace = await this.findOne(workspaceId);

    // Unset all defaults for this user
    await this.unsetAllDefaults(workspace.userId);

    // Set this workspace as default
    workspace.isDefault = true;
    await this.workspaceRepository.save(workspace);

    this.logger.log(`Set workspace ${workspaceId} as default`);
  }

  /**
   * Update workspace
   */
  async update(id: string, request: UpdateWorkspaceRequest): Promise<Workspace> {
    const workspace = await this.findOne(id);

    if (request.name !== undefined) {
      workspace.name = request.name;
    }

    if (request.description !== undefined) {
      workspace.description = request.description;
    }

    if (request.status !== undefined) {
      workspace.status = request.status;
    }

    if (request.currentProjectId !== undefined) {
      workspace.currentProjectId = request.currentProjectId;
    }

    if (request.isDefault !== undefined && request.isDefault) {
      await this.unsetAllDefaults(workspace.userId);
      workspace.isDefault = true;
    }

    const updated = await this.workspaceRepository.save(workspace);
    this.logger.log(`Updated workspace: ${id}`);

    return updated;
  }

  /**
   * Delete workspace
   */
  async delete(id: string): Promise<void> {
    const workspace = await this.findOne(id);

    // If this was the default workspace, set another one as default
    if (workspace.isDefault) {
      const otherWorkspaces = await this.findByUser(workspace.userId);
      const nextDefault = otherWorkspaces.find(w => w.id !== id);
      
      if (nextDefault) {
        await this.setDefault(nextDefault.id);
      }
    }

    await this.workspaceRepository.delete(id);
    this.logger.log(`Deleted workspace: ${id}`);
  }

  /**
   * Update current project
   */
  async updateCurrentProject(workspaceId: string, projectId: string): Promise<void> {
    const workspace = await this.findOne(workspaceId);
    workspace.currentProjectId = projectId;
    await this.workspaceRepository.save(workspace);
    
    this.logger.log(`Updated workspace ${workspaceId} current project to ${projectId}`);
  }

  /**
   * Unset all default workspaces for a user
   */
  private async unsetAllDefaults(userId: string): Promise<void> {
    await this.workspaceRepository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );
  }

  /**
   * Get workspace statistics
   */
  async getStats(userId: string): Promise<any> {
    const workspaces = await this.findByUser(userId);

    const byType = workspaces.reduce((acc, workspace) => {
      acc[workspace.type] = (acc[workspace.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: workspaces.length,
      byType,
      byStatus: {
        active: workspaces.filter(w => w.status === 'active').length,
        inactive: workspaces.filter(w => w.status === 'inactive').length,
        archived: workspaces.filter(w => w.status === 'archived').length,
      },
      defaultWorkspace: workspaces.find(w => w.isDefault),
    };
  }
}
