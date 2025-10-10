import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EvaluationService } from './evaluation.service';
import { GroundTruthService } from './ground-truth.service';
import { EvaluationCacheService } from './evaluation-cache.service';
import type {
  CreateGroundTruthDto,
  UpdateGroundTruthDto,
  CompareAgentsDto,
  EvaluateMemoryDto,
  EvaluateKnowledgeDto,
  RunSuiteDto,
  EvaluationCategory,
} from '@agentdb9/shared';

@ApiTags('evaluation')
@Controller('evaluation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EvaluationController {
  constructor(
    private readonly evaluationService: EvaluationService,
    private readonly groundTruthService: GroundTruthService,
    private readonly cacheService: EvaluationCacheService,
  ) {}

  // Ground Truth Management
  @Post('ground-truth')
  @ApiOperation({ summary: 'Create ground truth entry' })
  async createGroundTruth(@Body() dto: CreateGroundTruthDto) {
    return this.groundTruthService.create(dto);
  }

  @Get('ground-truth')
  @ApiOperation({ summary: 'List all ground truth entries' })
  async listGroundTruth(
    @Query('category') category?: EvaluationCategory,
    @Query('active') active?: boolean,
  ) {
    return this.groundTruthService.findAll(category, active);
  }

  @Get('ground-truth/:id')
  @ApiOperation({ summary: 'Get specific ground truth entry' })
  async getGroundTruth(@Param('id') id: string) {
    return this.groundTruthService.findOne(id);
  }

  @Put('ground-truth/:id')
  @ApiOperation({ summary: 'Update ground truth entry' })
  async updateGroundTruth(
    @Param('id') id: string,
    @Body() dto: UpdateGroundTruthDto,
  ) {
    return this.groundTruthService.update(id, dto);
  }

  @Delete('ground-truth/:id')
  @ApiOperation({ summary: 'Delete ground truth entry' })
  async deleteGroundTruth(@Param('id') id: string) {
    return this.groundTruthService.delete(id);
  }

  // Evaluation Execution
  @Post('compare')
  @ApiOperation({ summary: 'Compare two agents' })
  async compareAgents(@Body() dto: CompareAgentsDto) {
    return this.evaluationService.compareAgents(dto);
  }

  @Post('memory')
  @ApiOperation({ summary: 'Evaluate memory impact' })
  async evaluateMemory(@Body() dto: EvaluateMemoryDto) {
    return this.evaluationService.evaluateMemory(dto);
  }

  @Post('knowledge')
  @ApiOperation({ summary: 'Evaluate knowledge impact' })
  async evaluateKnowledge(@Body() dto: EvaluateKnowledgeDto) {
    return this.evaluationService.evaluateKnowledge(dto);
  }

  @Get('results')
  @ApiOperation({ summary: 'List all evaluation results' })
  async listResults(
    @Query('agentId') agentId?: string,
    @Query('batchId') batchId?: string,
  ) {
    return this.evaluationService.findResults(agentId, batchId);
  }

  @Get('results/:id')
  @ApiOperation({ summary: 'Get specific evaluation result' })
  async getResult(@Param('id') id: string) {
    return this.evaluationService.findResult(id);
  }

  @Delete('results/:id')
  @ApiOperation({ summary: 'Delete evaluation result' })
  async deleteResult(@Param('id') id: string) {
    return this.evaluationService.deleteResult(id);
  }

  // Evaluation Suites
  @Get('suites')
  @ApiOperation({ summary: 'List available evaluation suites' })
  async listSuites() {
    return this.evaluationService.listSuites();
  }

  @Get('suites/:type')
  @ApiOperation({ summary: 'Get suite by type' })
  async getSuite(@Param('type') type: EvaluationCategory) {
    return this.evaluationService.getSuite(type);
  }

  @Post('suites/:type/run')
  @ApiOperation({ summary: 'Run entire suite' })
  async runSuite(
    @Param('type') type: EvaluationCategory,
    @Body() dto: RunSuiteDto,
  ) {
    return this.evaluationService.runSuite({ ...dto, suiteType: type });
  }

  // Batch Management
  @Get('batches')
  @ApiOperation({ summary: 'List all batches' })
  async listBatches(@Query('status') status?: string) {
    return this.evaluationService.findBatches(status);
  }

  @Get('batches/:id')
  @ApiOperation({ summary: 'Get batch details' })
  async getBatch(@Param('id') id: string) {
    return this.evaluationService.findBatch(id);
  }

  @Post('batches/:id/cancel')
  @ApiOperation({ summary: 'Cancel running batch' })
  async cancelBatch(@Param('id') id: string) {
    return this.evaluationService.cancelBatch(id);
  }

  @Delete('batches/:id')
  @ApiOperation({ summary: 'Delete batch' })
  async deleteBatch(@Param('id') id: string) {
    return this.evaluationService.deleteBatch(id);
  }

  // Cache Management
  @Get('cache/status')
  @ApiOperation({ summary: 'Get cache status' })
  async getCacheStatus() {
    return this.cacheService.getStatus();
  }

  @Delete('cache')
  @ApiOperation({ summary: 'Clear all cache' })
  async clearCache() {
    return this.cacheService.clearAll();
  }

  @Delete('cache/:key')
  @ApiOperation({ summary: 'Clear specific cache entry' })
  async clearCacheEntry(@Param('key') key: string) {
    return this.cacheService.clearByKey(key);
  }

  // Analytics
  @Get('analytics/agent/:id')
  @ApiOperation({ summary: 'Get agent performance analytics' })
  async getAgentAnalytics(@Param('id') id: string) {
    return this.evaluationService.getAgentAnalytics(id);
  }

  @Get('analytics/comparison')
  @ApiOperation({ summary: 'Get historical comparisons' })
  async getComparisonAnalytics() {
    return this.evaluationService.getComparisonAnalytics();
  }
}
