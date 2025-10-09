import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { KnowledgeService } from './knowledge.service';
import {
  KnowledgeIngestionRequest,
  KnowledgeRetrievalRequest,
  KnowledgeSource,
} from '@agentdb9/shared';

@Controller('knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  /**
   * Ingest a knowledge source
   */
  @Post('ingest')
  async ingest(@Body() request: KnowledgeIngestionRequest) {
    return this.knowledgeService.ingestSource(request);
  }

  /**
   * Retrieve relevant knowledge
   */
  @Post('retrieve')
  async retrieve(@Body() request: KnowledgeRetrievalRequest) {
    return this.knowledgeService.retrieve(request);
  }

  /**
   * Get agent knowledge context
   */
  @Get('context/:agentId')
  async getContext(
    @Param('agentId') agentId: string,
    @Query('query') query: string,
    @Query('topK') topK?: number,
  ) {
    return this.knowledgeService.getAgentKnowledgeContext(
      agentId,
      query,
      topK ? (typeof topK === 'string' ? parseInt(topK) : topK) : 5
    );
  }

  /**
   * Add knowledge source
   */
  @Post('sources/:agentId')
  async addSource(
    @Param('agentId') agentId: string,
    @Body() source: KnowledgeSource,
  ) {
    return this.knowledgeService.addSource(agentId, source);
  }

  /**
   * Update knowledge source
   */
  @Put('sources/:sourceId')
  async updateSource(
    @Param('sourceId') sourceId: string,
    @Body() updates: Partial<KnowledgeSource>,
  ) {
    return this.knowledgeService.updateSource(sourceId, updates);
  }

  /**
   * Delete knowledge source
   */
  @Delete('sources/:sourceId')
  async deleteSource(@Param('sourceId') sourceId: string) {
    await this.knowledgeService.deleteSource(sourceId);
    return { success: true };
  }

  /**
   * List knowledge sources
   */
  @Get('sources/:agentId')
  async listSources(@Param('agentId') agentId: string) {
    return this.knowledgeService.listSources(agentId);
  }

  /**
   * Reindex source
   */
  @Post('sources/:sourceId/reindex')
  async reindexSource(@Param('sourceId') sourceId: string) {
    return this.knowledgeService.reindexSource(sourceId);
  }

  /**
   * Reindex all sources for agent
   */
  @Post('agents/:agentId/reindex')
  async reindexAgent(@Param('agentId') agentId: string) {
    return this.knowledgeService.reindexAgent(agentId);
  }

  /**
   * Get knowledge base statistics
   */
  @Get('stats/:agentId')
  async getStats(@Param('agentId') agentId: string) {
    return this.knowledgeService.getStats(agentId);
  }
}
