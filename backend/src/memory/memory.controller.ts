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
    return this.memoryService.createMemory(request);
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
    return this.memoryService.getMemoriesByAgent(agentId, type);
  }

  /**
   * Get memory statistics
   */
  @Get(':agentId/stats')
  async getStats(@Param('agentId') agentId: string): Promise<MemoryStats> {
    return this.memoryService.getStats(agentId);
  }

  /**
   * Consolidate memories
   */
  @Post('consolidate')
  async consolidate(@Body() request: MemoryConsolidationRequest): Promise<MemoryConsolidationResult> {
    return this.memoryService.consolidate(request);
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
