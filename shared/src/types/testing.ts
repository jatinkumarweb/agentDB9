// Environment testing and monitoring types

export interface ServiceStatus {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown' | 'starting';
  responseTime?: number;
  error?: string;
  lastChecked: Date;
  version?: string;
  details?: Record<string, any>;
}

export interface EnvironmentTest {
  id: string;
  name: string;
  description: string;
  category: 'connectivity' | 'functionality' | 'performance' | 'integration';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  result?: any;
  timestamp: Date;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: EnvironmentTest[];
  status: 'pending' | 'running' | 'completed';
  startTime?: Date;
  endTime?: Date;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

export interface ModelTest {
  modelId: string;
  provider: string;
  available: boolean;
  responseTime?: number;
  error?: string;
  testPrompt: string;
  response?: string;
  timestamp: Date;
}

export interface DatabaseTest {
  type: 'postgresql' | 'redis' | 'qdrant';
  connected: boolean;
  responseTime?: number;
  error?: string;
  details?: {
    version?: string;
    database?: string;
    collections?: string[];
    keys?: number;
  };
}

export interface EnvironmentHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceStatus[];
  models: ModelTest[];
  databases: DatabaseTest[];
  lastUpdated: Date;
  uptime: number;
  issues: string[];
  recommendations: string[];
}

export interface TestConfig {
  timeout: number;
  retries: number;
  parallel: boolean;
  skipOnFailure: boolean;
  environment: 'development' | 'production' | 'test';
}

export interface PerformanceMetrics {
  service: string;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  memoryUsage?: number;
  cpuUsage?: number;
}