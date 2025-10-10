// Evaluation System Types
import type { KnowledgeSource } from './agent';
import type { MemoryType } from './memory';

export type EvaluationCategory = 'backend' | 'frontend' | 'devops';
export type EvaluationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type EvaluationMemoryType = MemoryType | 'both' | null;
export type BatchStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type BatchType = 'comparison' | 'memory' | 'knowledge' | 'suite';

export interface EvaluationCriteria {
  accuracy: number; // weight 0-1
  codeQuality: number;
  completeness: number;
  efficiency: number;
  maintainability: number;
  security?: number;
}

export interface GroundTruthMetadata {
  language?: string;
  framework?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime?: number; // seconds
  tags?: string[];
}

export interface EvaluationGroundTruth {
  id: string;
  category: EvaluationCategory;
  taskType: string;
  taskDescription: string;
  expectedOutput: any;
  evaluationCriteria: EvaluationCriteria;
  metadata: GroundTruthMetadata;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvaluationScores {
  accuracy: number; // 0-100
  codeQuality: number;
  completeness: number;
  efficiency: number;
  maintainability: number;
  security?: number;
  overall: number; // weighted average
}

export interface EvaluationDetails {
  evaluatorModel: string;
  evaluatorReasoning: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  comparisonToExpected: string;
}

export interface EvaluationKnowledgeSource {
  type: 'file' | 'workspace' | 'web' | 'documentation';
  identifier: string;
  content?: string;
}

export interface EvaluationResult {
  id: string;
  groundTruthId: string;
  agentId: string;
  agentConfiguration: any;
  agentOutput: any;
  scores: EvaluationScores | null;
  evaluationDetails: EvaluationDetails | null;
  executionTime: number | null;
  memoryUsed: boolean;
  memoryType: EvaluationMemoryType;
  knowledgeSources: EvaluationKnowledgeSource[];
  status: EvaluationStatus;
  errorMessage: string | null;
  createdAt: Date;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  currentTask?: string;
}

export interface EvaluationBatch {
  id: string;
  name: string;
  type: BatchType;
  status: BatchStatus;
  progress: BatchProgress;
  configuration: any;
  resultIds: string[];
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvaluationCache {
  id: string;
  cacheKey: string;
  evaluationResultId: string;
  expiresAt: Date;
  createdAt: Date;
}

// Request/Response DTOs

export interface CreateGroundTruthDto {
  category: EvaluationCategory;
  taskType: string;
  taskDescription: string;
  expectedOutput: any;
  evaluationCriteria: EvaluationCriteria;
  metadata?: GroundTruthMetadata;
}

export interface UpdateGroundTruthDto {
  taskType?: string;
  taskDescription?: string;
  expectedOutput?: any;
  evaluationCriteria?: EvaluationCriteria;
  metadata?: GroundTruthMetadata;
  isActive?: boolean;
}

export interface CompareAgentsDto {
  agent1Id: string;
  agent2Id: string;
  evaluationSuite: EvaluationCategory;
  groundTruthIds?: string[]; // optional: specific tasks
}

export interface EvaluateMemoryDto {
  agentId: string;
  evaluationSuite: EvaluationCategory;
  memoryConfigs: EvaluationMemoryType[]; // e.g., [null, 'short-term', 'long-term', 'both']
  groundTruthIds?: string[];
}

export interface EvaluateKnowledgeDto {
  agentId: string;
  evaluationSuite: EvaluationCategory;
  knowledgeSources: EvaluationKnowledgeSource[];
  compareWithout: boolean; // if true, also run without knowledge
  groundTruthIds?: string[];
}

export interface RunSuiteDto {
  agentId: string;
  suiteType: EvaluationCategory;
  memoryType?: EvaluationMemoryType;
  knowledgeSources?: EvaluationKnowledgeSource[];
}

export interface EvaluationSummary {
  batchId: string;
  agentId: string;
  agentName: string;
  suiteType: EvaluationCategory;
  totalTasks: number;
  completedTasks: number;
  averageScores: EvaluationScores;
  status: BatchStatus;
  createdAt: Date;
}

export interface ComparisonResult {
  batchId: string;
  agent1: {
    id: string;
    name: string;
    averageScores: EvaluationScores;
  };
  agent2: {
    id: string;
    name: string;
    averageScores: EvaluationScores;
  };
  winner: string | null; // agent id or null for tie
  taskResults: {
    groundTruthId: string;
    taskType: string;
    agent1Score: number;
    agent2Score: number;
  }[];
  createdAt: Date;
}

export interface MemoryImpactResult {
  batchId: string;
  agentId: string;
  agentName: string;
  results: {
    memoryType: EvaluationMemoryType;
    averageScores: EvaluationScores;
    executionTime: number;
  }[];
  bestConfiguration: EvaluationMemoryType;
  improvement: number; // percentage improvement
  createdAt: Date;
}

export interface KnowledgeImpactResult {
  batchId: string;
  agentId: string;
  agentName: string;
  withKnowledge: {
    averageScores: EvaluationScores;
    executionTime: number;
  };
  withoutKnowledge: {
    averageScores: EvaluationScores;
    executionTime: number;
  };
  improvement: number; // percentage improvement
  mostImpactfulSources: {
    type: string;
    identifier: string;
    impact: number;
  }[];
  createdAt: Date;
}

export interface CacheStatus {
  totalCached: number;
  cacheHitRate: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  totalSize: number; // approximate size in bytes
}
