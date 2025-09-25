import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(8000),
  APP_NAME: Joi.string().default('AgentDB9'),
  APP_VERSION: Joi.string().default('2.0.0'),

  // Database
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().default('password'),
  DB_NAME: Joi.string().default('coding_agent'),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),
  DB_SSL: Joi.boolean().default(false),
  DB_MAX_CONNECTIONS: Joi.number().default(10),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().default(0),
  REDIS_TTL: Joi.number().default(3600),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_SECRET: Joi.string().min(32).optional(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // External APIs
  OPENAI_API_KEY: Joi.string().pattern(/^sk-/).allow('').optional(),
  OPENAI_ORGANIZATION: Joi.string().allow('').optional(),
  OPENAI_TIMEOUT: Joi.number().default(60000),
  OPENAI_MAX_RETRIES: Joi.number().default(3),

  ANTHROPIC_API_KEY: Joi.string().pattern(/^sk-ant-/).allow('').optional(),
  ANTHROPIC_TIMEOUT: Joi.number().default(60000),
  ANTHROPIC_MAX_RETRIES: Joi.number().default(3),

  COHERE_API_KEY: Joi.string().allow('').optional(),
  COHERE_TIMEOUT: Joi.number().default(60000),

  HUGGINGFACE_API_KEY: Joi.string().pattern(/^hf_/).allow('').optional(),
  HUGGINGFACE_TIMEOUT: Joi.number().default(60000),

  // Ollama
  OLLAMA_HOST: Joi.string().uri().default('http://localhost:11434'),
  OLLAMA_TIMEOUT: Joi.number().default(60000),
  OLLAMA_HEALTH_CHECK_INTERVAL: Joi.number().default(60000),
  OLLAMA_MAX_RETRIES: Joi.number().default(3),

  // Vector Database
  VECTOR_DB_URL: Joi.string().uri().default('http://localhost:6333'),
  VECTOR_DB_API_KEY: Joi.string().optional(),
  VECTOR_DB_TIMEOUT: Joi.number().default(30000),
  VECTOR_DB_COLLECTION: Joi.string().default('code_embeddings'),

  // LLM Service
  LLM_SERVICE_URL: Joi.string().uri().default('http://localhost:9000'),
  LLM_SERVICE_TIMEOUT: Joi.number().default(120000),
  LLM_MAX_TOKENS: Joi.number().default(4096),
  LLM_TEMPERATURE: Joi.number().min(0).max(2).default(0.3),
  LLM_TOP_P: Joi.number().min(0).max(1).default(0.8),

  // Security
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX: Joi.number().default(100),
  BCRYPT_ROUNDS: Joi.number().min(10).max(15).default(12),
  SESSION_SECRET: Joi.string().min(32).required(),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug', 'verbose').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),
  LOG_MAX_FILES: Joi.number().default(5),
  LOG_MAX_SIZE: Joi.string().default('5m'),

  // Storage
  STORAGE_TYPE: Joi.string().valid('local', 's3').default('local'),
  UPLOAD_PATH: Joi.string().default('./uploads'),
  MAX_FILE_SIZE: Joi.number().default(10485760), // 10MB
  S3_BUCKET: Joi.string().when('STORAGE_TYPE', { is: 's3', then: Joi.required() }),
  S3_REGION: Joi.string().default('us-east-1'),
  S3_ACCESS_KEY_ID: Joi.string().when('STORAGE_TYPE', { is: 's3', then: Joi.required() }),
  S3_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_TYPE', { is: 's3', then: Joi.required() }),

  // VS Code
  VSCODE_SERVER_URL: Joi.string().uri().default('http://localhost:8080'),
  VSCODE_PASSWORD: Joi.string().default('codeserver123'),
  VSCODE_EXTENSIONS_PATH: Joi.string().default('./vscode-config/extensions'),
  VSCODE_SETTINGS_PATH: Joi.string().default('./vscode-config/settings'),

  // Features
  ENABLE_GPU: Joi.boolean().default(false),
  ENABLE_STREAMING: Joi.boolean().default(true),
  ENABLE_MODEL_SWITCHING: Joi.boolean().default(true),
  ENABLE_VECTOR_SEARCH: Joi.boolean().default(false),
  ENABLE_FILE_UPLOAD: Joi.boolean().default(false),
  ENABLE_WEBSOCKETS: Joi.boolean().default(true),

  // Monitoring
  ENABLE_METRICS: Joi.boolean().default(false),
  METRICS_PORT: Joi.number().default(9090),
  ENABLE_HEALTH_CHECKS: Joi.boolean().default(true),
  HEALTH_CHECK_INTERVAL: Joi.number().default(30000),

  // Development
  ENABLE_SWAGGER: Joi.boolean().default(true),
  ENABLE_CORS: Joi.boolean().default(true),
  ENABLE_HOT_RELOAD: Joi.boolean().default(true),
  SEED_DATABASE: Joi.boolean().default(false),
});