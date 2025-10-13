import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, Res, All } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceContainerService } from './workspace-container.service';
import { ProjectWorkspaceService } from './project-workspace.service';
import {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceType,
  getAvailableWorkspaceTypes,
  WORKSPACE_TYPE_CONFIGS,
} from '@agentdb9/shared';
import axios from 'axios';

@Controller('api/workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly containerService: WorkspaceContainerService,
    private readonly projectWorkspaceService: ProjectWorkspaceService,
  ) {}

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

  /**
   * Start workspace container
   */
  @Post(':id/start')
  async start(@Param('id') id: string) {
    const workspace = await this.containerService.startWorkspace(id);

    return {
      success: true,
      data: workspace,
      message: 'Workspace started',
    };
  }

  /**
   * Stop workspace container
   */
  @Post(':id/stop')
  async stop(@Param('id') id: string) {
    const workspace = await this.containerService.stopWorkspace(id);

    return {
      success: true,
      data: workspace,
      message: 'Workspace stopped',
    };
  }

  /**
   * Restart workspace container
   */
  @Post(':id/restart')
  async restart(@Param('id') id: string) {
    const workspace = await this.containerService.restartWorkspace(id);

    return {
      success: true,
      data: workspace,
      message: 'Workspace restarted',
    };
  }

  /**
   * Get workspace status
   */
  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    const status = await this.containerService.getWorkspaceStatus(id);

    return {
      success: true,
      data: status,
    };
  }

  /**
   * Switch workspace project
   */
  @Post(':id/switch-project')
  async switchProject(
    @Param('id') id: string,
    @Body() body: { projectId: string },
  ) {
    const workspace = await this.containerService.switchProjectVolume(
      id,
      body.projectId,
    );

    return {
      success: true,
      data: workspace,
      message: 'Project switched successfully',
    };
  }

  /**
   * Get workspace projects
   */
  @Get(':id/projects')
  async getProjects(@Param('id') id: string) {
    const projects = await this.projectWorkspaceService.getProjectsByWorkspace(id);

    return {
      success: true,
      data: projects,
    };
  }

  /**
   * Get compatible projects for workspace
   */
  @Get(':id/compatible-projects')
  async getCompatibleProjects(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const workspace = await this.workspacesService.findOne(id);
    const projects = await this.projectWorkspaceService.getCompatibleProjects(
      user.id,
      workspace.type,
    );

    return {
      success: true,
      data: projects,
    };
  }

  /**
   * Assign project to workspace
   */
  @Post(':id/assign-project')
  async assignProject(
    @Param('id') id: string,
    @Body() body: { projectId: string },
  ) {
    const project = await this.projectWorkspaceService.assignProjectToWorkspace(
      body.projectId,
      id,
    );

    return {
      success: true,
      data: project,
      message: 'Project assigned to workspace',
    };
  }

  /**
   * Proxy requests to workspace container
   */
  @All(':id/proxy/*')
  async proxyToWorkspace(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const workspace = await this.workspacesService.findOne(id);
      const status = await this.containerService.getWorkspaceStatus(id);

      if (!status.containerRunning) {
        return res.status(503).json({
          success: false,
          error: 'Workspace container is not running',
        });
      }

      const config = workspace.config as any;
      const port = config.defaultPort || 8080;
      const containerName = workspace.containerName;
      
      const path = req.url.replace(`/api/workspaces/${id}/proxy`, '');
      const targetUrl = `http://${containerName}:${port}${path}`;

      const proxyResponse = await axios({
        method: req.method,
        url: targetUrl,
        data: req.body,
        headers: {
          ...req.headers,
          host: `${containerName}:${port}`,
        },
        responseType: 'stream',
        validateStatus: () => true,
      });

      res.status(proxyResponse.status);
      Object.entries(proxyResponse.headers).forEach(([key, value]) => {
        res.setHeader(key, value as string);
      });
      proxyResponse.data.pipe(res);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: `Proxy error: ${error.message}`,
      });
    }
  }
}
