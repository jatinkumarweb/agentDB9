import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { MemoryService } from './memory.service';
import {
  CreateMemoryRequest,
  MemoryContext,
  MemoryStats,
  MemoryConsolidationRequest,
  MemoryConsolidationResult,
  MemoryQuery,
} from '@agentdb9/shared';

@Controller('memory')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  /**
   * Create a memory entry
   */
  @Post()
  async createMemory(@Body() request: CreateMemoryRequest) {
    const result = await this.memoryService.createMemory(request);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Create a memory entry for specific agent (alternative endpoint)
   */
  @Post(':agentId')
  async createMemoryForAgent(
    @Param('agentId') agentId: string,
    @Body() body: Omit<CreateMemoryRequest, 'agentId'>,
  ) {
    const request: CreateMemoryRequest = {
      ...body,
      agentId,
    };
    const result = await this.memoryService.createMemory(request);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get memory context for agent session
   */
  @Get('context/:agentId/:sessionId')
  async getMemoryContext(
    @Param('agentId') agentId: string,
    @Param('sessionId') sessionId: string,
    @Query('query') query?: string,
  ): Promise<MemoryContext> {
    return this.memoryService.getMemoryContext(agentId, sessionId, query);
  }

  /**
   * Query memories
   */
  @Post('query')
  async queryMemories(@Body() query: MemoryQuery) {
    return this.memoryService.queryMemories(query);
  }

  /**
   * Get memories by agent ID
   */
  @Get(':agentId')
  async getMemoriesByAgent(
    @Param('agentId') agentId: string,
    @Query('type') type?: string,
  ) {
    const memories = await this.memoryService.getMemoriesByAgent(agentId, type);
    
    // Flatten the response for frontend compatibility
    let allMemories: any[] = [];
    if (memories.shortTerm) {
      allMemories = [...allMemories, ...memories.shortTerm];
    }
    if (memories.longTerm) {
      allMemories = [...allMemories, ...memories.longTerm];
    }
    
    // Transform memories to match frontend expectations
    const transformedMemories = allMemories.map(memory => ({
      id: memory.id,
      category: memory.category,
      content: memory.summary || memory.content, // Frontend expects 'content'
      summary: memory.summary,
      details: memory.details,
      importance: memory.importance,
      createdAt: memory.createdAt,
      metadata: memory.metadata,
    }));
    
    return {
      success: true,
      data: transformedMemories,
      count: transformedMemories.length,
      breakdown: {
        shortTerm: memories.shortTerm?.length || 0,
        longTerm: memories.longTerm?.length || 0,
      }
    };
  }

  /**
   * Get memory statistics
   */
  @Get(':agentId/stats')
  async getStats(@Param('agentId') agentId: string) {
    const stats = await this.memoryService.getStats(agentId);
    
    // Transform stats to match frontend expectations
    return {
      success: true,
      data: {
        shortTerm: {
          total: stats.shortTerm.total,
          byCategory: stats.shortTerm.byCategory,
        },
        longTerm: {
          total: stats.longTerm.total,
          byCategory: stats.longTerm.byCategory,
        },
        averageImportance: stats.longTerm.averageImportance || 0,
        lastConsolidation: stats.consolidation?.lastRun,
      }
    };
  }

  /**
   * Consolidate memories
   */
  @Post('consolidate')
  async consolidate(@Body() request: MemoryConsolidationRequest) {
    const result = await this.memoryService.consolidate(request);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Clear session memories
   */
  @Post('clear/:agentId/:sessionId')
  async clearSession(
    @Param('agentId') agentId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    return this.memoryService.clearSession(agentId, sessionId);
  }
}
