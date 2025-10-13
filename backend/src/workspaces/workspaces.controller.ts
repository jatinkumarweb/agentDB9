import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkspacesService } from './workspaces.service';
import {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceType,
  getAvailableWorkspaceTypes,
  WORKSPACE_TYPE_CONFIGS,
} from '@agentdb9/shared';

@Controller('api/workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  /**
   * Get available workspace types
   */
  @Get('types')
  async getTypes() {
    const types = getAvailableWorkspaceTypes();
    const configs = types.map(type => WORKSPACE_TYPE_CONFIGS[type]);

    return {
      success: true,
      data: configs,
    };
  }

  /**
   * List user's workspaces
   */
  @Get()
  async list(@CurrentUser() user: any) {
    const workspaces = await this.workspacesService.findByUser(user.id);

    return {
      success: true,
      data: workspaces,
    };
  }

  /**
   * Get workspace statistics
   */
  @Get('stats')
  async getStats(@CurrentUser() user: any) {
    const stats = await this.workspacesService.getStats(user.id);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get workspaces by type
   */
  @Get('type/:type')
  async listByType(
    @CurrentUser() user: any,
    @Param('type') type: WorkspaceType,
  ) {
    const workspaces = await this.workspacesService.findByType(user.id, type);

    return {
      success: true,
      data: workspaces,
    };
  }

  /**
   * Get workspace details
   */
  @Get(':id')
  async get(@Param('id') id: string) {
    const workspace = await this.workspacesService.findOne(id);

    return {
      success: true,
      data: workspace,
    };
  }

  /**
   * Create workspace
   */
  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() request: CreateWorkspaceRequest,
  ) {
    const workspace = await this.workspacesService.create(user.id, request);

    return {
      success: true,
      data: workspace,
    };
  }

  /**
   * Update workspace
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() request: UpdateWorkspaceRequest,
  ) {
    const workspace = await this.workspacesService.update(id, request);

    return {
      success: true,
      data: workspace,
    };
  }

  /**
   * Set workspace as default
   */
  @Post(':id/set-default')
  async setDefault(@Param('id') id: string) {
    await this.workspacesService.setDefault(id);

    return {
      success: true,
      message: 'Workspace set as default',
    };
  }

  /**
   * Delete workspace
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.workspacesService.delete(id);

    return {
      success: true,
      message: 'Workspace deleted',
    };
  }
}
