import { Controller, Get, Post, Put, Delete, Body, Param, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { APIResponse } from '@agentdb9/shared';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
  async findAll(@CurrentUser() user: any): Promise<APIResponse> {
    try {
      const projects = await this.projectsService.findAll(user.id);
      return {
        success: true,
        data: projects,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(@Param('id') id: string): Promise<APIResponse> {
    try {
      const project = await this.projectsService.findOne(id);
      return {
        success: true,
        data: project,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  async create(@Body() createProjectData: any, @CurrentUser() user: any): Promise<APIResponse> {
    try {
      const project = await this.projectsService.create(createProjectData, user.id);
      
      // Automatically initialize workspace folder for new project
      try {
        await this.projectsService.initWorkspaceFolder(project.id);
      } catch (initError) {
        console.error('Failed to initialize workspace folder:', initError);
        // Don't fail the project creation if workspace init fails
      }
      
      return {
        success: true,
        data: project,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  async update(@Param('id') id: string, @Body() updateData: any): Promise<APIResponse> {
    try {
      const project = await this.projectsService.update(id, updateData);
      return {
        success: true,
        data: project,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  async remove(@Param('id') id: string): Promise<APIResponse> {
    try {
      await this.projectsService.remove(id);
      return {
        success: true,
        message: 'Project deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Post(':id/init-workspace')
  @ApiOperation({ summary: 'Initialize project workspace folder' })
  @ApiResponse({ status: 200, description: 'Workspace folder initialized' })
  async initWorkspace(@Param('id') id: string): Promise<APIResponse> {
    try {
      await this.projectsService.initWorkspaceFolder(id);
      return {
        success: true,
        message: 'Workspace folder initialized',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}