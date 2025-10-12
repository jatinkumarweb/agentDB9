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
   * Upload and ingest a file (base64 encoded)
   * TODO: Add proper file upload with Multer when @types/multer is installed
   */
  @Post('upload')
  async uploadFile(
    @Body('agentId') agentId: string,
    @Body('fileName') fileName: string,
    @Body('fileContent') fileContent: string,
    @Body('title') title: string,
    @Body('description') description?: string,
  ) {
    if (!fileContent || !fileName) {
      return { success: false, error: 'File name and content are required' };
    }

    try {
      // Determine type based on file extension
      const ext = fileName.split('.').pop()?.toLowerCase();
      let sourceType: 'pdf' | 'markdown' | 'website' | 'api' | 'github' | 'documentation' = 'markdown';
      
      if (ext === 'pdf') {
        sourceType = 'pdf';
      } else if (['md', 'markdown', 'txt', 'doc', 'docx'].includes(ext || '')) {
        sourceType = 'markdown';
      }

      const source = {
        type: sourceType,
        url: fileName,
        content: fileContent,
        metadata: {
          title: title || fileName,
          description: description || '',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const request: KnowledgeIngestionRequest = {
        agentId,
        source: source as any,
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
