import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ContextService } from './context.service';
import {
  ContextExtractionRequest,
  ContextExtractionResult,
  ContextQuery,
  ContextQueryResult,
  ProjectSummary,
  ProjectContext,
} from '@agentdb9/shared';

@Controller('context')
export class ContextController {
  constructor(private readonly contextService: ContextService) {}

  /**
   * Extract project context
   */
  @Post('extract')
  async extractContext(
    @Body() request: ContextExtractionRequest,
  ): Promise<ContextExtractionResult> {
    return this.contextService.extractContext(request);
  }

  /**
   * Get project context
   */
  @Get(':workspaceId')
  async getContext(@Param('workspaceId') workspaceId: string): Promise<ProjectContext | null> {
    return this.contextService.getContext(workspaceId);
  }

  /**
   * Get project summary
   */
  @Get(':workspaceId/summary')
  async getProjectSummary(
    @Param('workspaceId') workspaceId: string,
  ): Promise<ProjectSummary | null> {
    return this.contextService.getProjectSummary(workspaceId);
  }

  /**
   * Query context for component/file resolution
   */
  @Post(':workspaceId/query')
  async queryContext(
    @Param('workspaceId') workspaceId: string,
    @Body() query: ContextQuery,
  ): Promise<ContextQueryResult> {
    return this.contextService.queryContext(workspaceId, query);
  }
}
