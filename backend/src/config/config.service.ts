import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: NestConfigService) {}

  // Application
  get appName(): string {
    return this.configService.get<string>('app.name') || 'AgentDB9';
  }

  get appVersion(): string {
    return this.configService.get<string>('app.version') || '2.0.0';
  }

  get environment(): string {
    return this.configService.get<string>('app.environment') || 'development';
  }

  get port(): number {
    return this.configService.get<number>('app.port') || 8000;
  }

  get isDevelopment(): boolean {
    return this.environment === 'development';
  }

  get isProduction(): boolean {
    return this.environment === 'production';
  }

  // Database
  get databaseConfig() {
    return this.configService.get('database');
  }

  // Redis
  get redisConfig() {
    return this.configService.get('redis');
  }

  // JWT
  get jwtSecret(): string {
    return this.configService.get<string>('jwt.secret') || 'default-secret';
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('jwt.expiresIn') || '24h';
  }

  get jwtRefreshSecret(): string {
    return this.configService.get<string>('jwt.refreshSecret') || 'default-refresh-secret';
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>('jwt.refreshExpiresIn') || '7d';
  }

  // External APIs
  get openaiConfig() {
    return this.configService.get('apis.openai');
  }

  get anthropicConfig() {
    return this.configService.get('apis.anthropic');
  }

  get cohereConfig() {
    return this.configService.get('apis.cohere');
  }

  get huggingfaceConfig() {
    return this.configService.get('apis.huggingface');
  }

  // Ollama
  get ollamaConfig() {
    return this.configService.get('ollama');
  }

  // Vector Database
  get vectorDbConfig() {
    return this.configService.get('vectorDb');
  }

  // LLM Service
  get llmServiceConfig() {
    return this.configService.get('llmService');
  }

  // Security
  get securityConfig() {
    return this.configService.get('security');
  }

  get corsOrigins(): (string | RegExp)[] {
    return this.configService.get<(string | RegExp)[]>('security.corsOrigins') || ['http://localhost:3000'];
  }

  // Logging
  get loggingConfig() {
    return this.configService.get('logging');
  }

  // Storage
  get storageConfig() {
    return this.configService.get('storage');
  }

  // VS Code
  get vscodeConfig() {
    return this.configService.get('vscode');
  }

  // Features
  get featuresConfig() {
    return this.configService.get('features');
  }

  get isGpuEnabled(): boolean {
    return this.configService.get<boolean>('features.enableGpu') || false;
  }

  get isStreamingEnabled(): boolean {
    return this.configService.get<boolean>('features.enableStreaming') || true;
  }

  get isModelSwitchingEnabled(): boolean {
    return this.configService.get<boolean>('features.enableModelSwitching') || true;
  }

  get isVectorSearchEnabled(): boolean {
    return this.configService.get<boolean>('features.enableVectorSearch') || false;
  }

  get isWebsocketsEnabled(): boolean {
    return this.configService.get<boolean>('features.enableWebsockets') || true;
  }

  // Monitoring
  get monitoringConfig() {
    return this.configService.get('monitoring');
  }

  get isMetricsEnabled(): boolean {
    return this.configService.get<boolean>('monitoring.enableMetrics') || false;
  }

  get isHealthChecksEnabled(): boolean {
    return this.configService.get<boolean>('monitoring.enableHealthChecks') || true;
  }

  // Development
  get developmentConfig() {
    return this.configService.get('development');
  }

  get isSwaggerEnabled(): boolean {
    return this.configService.get<boolean>('development.enableSwagger') || true;
  }

  get isCorsEnabled(): boolean {
    return this.configService.get<boolean>('development.enableCors') || true;
  }

  get shouldSeedDatabase(): boolean {
    return this.configService.get<boolean>('development.seedDatabase') || false;
  }

  // Helper methods
  getApiKeyStatus() {
    return {
      openai: !!this.openaiConfig.apiKey,
      anthropic: !!this.anthropicConfig.apiKey,
      cohere: !!this.cohereConfig.apiKey,
      huggingface: !!this.huggingfaceConfig.apiKey,
    };
  }

  getServiceUrls() {
    return {
      llmService: this.llmServiceConfig.url,
      vectorDb: this.vectorDbConfig.url,
      ollama: this.ollamaConfig.host,
      vscode: this.vscodeConfig.serverUrl,
    };
  }

  getTimeouts() {
    return {
      openai: this.openaiConfig.timeout,
      anthropic: this.anthropicConfig.timeout,
      cohere: this.cohereConfig.timeout,
      huggingface: this.huggingfaceConfig.timeout,
      ollama: this.ollamaConfig.timeout,
      vectorDb: this.vectorDbConfig.timeout,
      llmService: this.llmServiceConfig.timeout,
    };
  }

  // Validation helpers
  validateRequiredConfig(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!this.jwtSecret || this.jwtSecret.length < 32) {
      missing.push('JWT_SECRET (must be at least 32 characters)');
    }

    if (!this.securityConfig.sessionSecret || this.securityConfig.sessionSecret.length < 32) {
      missing.push('SESSION_SECRET (must be at least 32 characters)');
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}