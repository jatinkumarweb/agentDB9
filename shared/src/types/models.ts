// Model management and selection types
import { ModelConfig, FileInfo, Position, Range } from './index';

export interface ModelSelector {
  selectForTask(task: CodeTask): ModelConfig;
  selectForPerformance(requirements: PerformanceRequirements): ModelConfig;
  getFallbackChain(primaryModel: string): string[];
  selectCostOptimal(task: CodeTask, budget: 'low' | 'medium' | 'high'): ModelConfig;
}

export interface CodeTask {
  type: 'quick-completion' | 'complex-generation' | 'code-review' | 'debugging' | 'documentation' | 'architecture';
  complexity: 'low' | 'medium' | 'high';
  language: string;
  context: CodeContext;
  urgency: 'low' | 'medium' | 'high';
}

export interface PerformanceRequirements {
  maxResponseTime: number; // milliseconds
  minQuality: 'low' | 'medium' | 'high' | 'excellent';
  maxCost?: number; // per request
  requiresGPU?: boolean;
  requiresLocal?: boolean;
}

export interface CodeContext {
  projectStructure: ProjectStructure;
  activeFile: FileInfo;
  cursorPosition: Position;
  selectedText?: string;
  recentChanges: Change[];
  dependencies: Dependency[];
  testFiles: string[];
  gitBranch: string;
  codeStyle: CodeStylePreferences;
}

export interface ProjectStructure {
  root: string;
  files: string[];
  directories: string[];
  packageJson?: any;
  tsconfig?: any;
  gitignore?: string[];
}

export interface Change {
  type: 'insert' | 'delete' | 'replace';
  range: Range;
  text: string;
  timestamp: Date;
}

export interface Dependency {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency' | 'peerDependency';
}

export interface CodeStylePreferences {
  indentSize: number;
  indentType: 'spaces' | 'tabs';
  lineLength: number;
  semicolons: boolean;
  quotes: 'single' | 'double';
  trailingCommas: boolean;
}

export interface CodeStylePreferences {
  indentation: 'spaces' | 'tabs';
  indentSize: number;
  quotes: 'single' | 'double';
  semicolons: boolean;
  trailingCommas: boolean;
  bracketSpacing: boolean;
}

export interface ModelMetrics {
  responseTime: number;
  tokensPerSecond: number;
  successRate: number;
  userSatisfaction: number;
  costPerRequest: number;
  memoryUsage: number;
  gpuUtilization?: number;
}

export interface ModelComparison {
  models: ModelConfig[];
  task: CodeTask;
  metrics: Record<string, ModelMetrics>;
  recommendation: string;
  reasoning: string;
}

export interface ConsensusResult {
  task: CodeTask;
  responses: ModelResponse[];
  consensus: string;
  confidence: number;
  reasoning: string;
}

export interface ModelResponse {
  modelId: string;
  response: string;
  confidence: number;
  responseTime: number;
}