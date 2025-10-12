import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
   * Upload and ingest a file
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('agentId') agentId: string,
    @Body('title') title: string,
    @Body('description') description?: string,
  ) {
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    try {
      const source: KnowledgeSource = {
        type: 'file',
        url: file.originalname,
        content: file.buffer.toString('utf-8'),
        metadata: {
          title: title || file.originalname,
          description: description || '',
          mimeType: file.mimetype,
          size: file.size,
        },
      };

      const request: KnowledgeIngestionRequest = {
        agentId,
        source,
        options: {
          generateEmbeddings: true,
          chunkSize: 1000,
          chunkOverlap: 200,
        },
      };

      const result = await this.knowledgeService.ingestSource(request);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Ingest a knowledge source
   */
  @Post('ingest')
  async ingest(@Body() request: KnowledgeIngestionRequest) {
    try {
      const result = await this.knowledgeService.ingestSource(request);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
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
    try {
      const sources = await this.knowledgeService.listSources(agentId);
      return { success: true, data: sources };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Reindex source
   */
  @Post('sources/:sourceId/reindex')
  async reindexSource(@Param('sourceId') sourceId: string) {
    try {
      const result = await this.knowledgeService.reindexSource(sourceId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
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
