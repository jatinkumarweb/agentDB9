export default () => ({
  // Application
  app: {
    name: process.env.APP_NAME || 'AgentDB9',
    version: process.env.APP_VERSION || '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '8000' || "0", 10),
    globalPrefix: process.env.GLOBAL_PREFIX || 'api',
  },

  // Database
  database: {
    type: process.env.DATABASE_URL?.startsWith('sqlite:') ? 'sqlite' : 'postgres',
    // SQLite configuration
    database: process.env.DATABASE_URL?.startsWith('sqlite:') 
      ? process.env.DATABASE_URL.replace('sqlite:', '') 
      : process.env.DB_NAME || 'coding_agent',
    // PostgreSQL configuration
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432' || "0", 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    synchronize: process.env.DB_SYNCHRONIZE === 'true' || process.env.NODE_ENV !== 'production',
    logging: process.env.DB_LOGGING === 'true' || process.env.NODE_ENV === 'development',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || "0", 10) || 10,
    acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || "0", 10) || 60000,
    timeout: parseInt(process.env.DB_TIMEOUT || "0", 10) || 60000,
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || "0", 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || "0", 10) || 0,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'agentdb9:',
    ttl: parseInt(process.env.REDIS_TTL || "0", 10) || 3600, // 1 hour
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // External APIs
  apis: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      organization: process.env.OPENAI_ORGANIZATION,
      timeout: parseInt(process.env.OPENAI_TIMEOUT || "0", 10) || 60000,
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || "0", 10) || 3,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
      timeout: parseInt(process.env.ANTHROPIC_TIMEOUT || "0", 10) || 60000,
      maxRetries: parseInt(process.env.ANTHROPIC_MAX_RETRIES || "0", 10) || 3,
    },
    cohere: {
      apiKey: process.env.COHERE_API_KEY,
      baseURL: process.env.COHERE_BASE_URL || 'https://api.cohere.ai',
      timeout: parseInt(process.env.COHERE_TIMEOUT || "0", 10) || 60000,
    },
    huggingface: {
      apiKey: process.env.HUGGINGFACE_API_KEY,
      baseURL: process.env.HUGGINGFACE_BASE_URL || 'https://api-inference.huggingface.co',
      timeout: parseInt(process.env.HUGGINGFACE_TIMEOUT || "0", 10) || 60000,
    },
  },

  // Ollama
  ollama: {
    host: process.env.OLLAMA_HOST || 'http://localhost:11434',
    timeout: parseInt(process.env.OLLAMA_TIMEOUT || "0", 10) || 60000,
    healthCheckInterval: parseInt(process.env.OLLAMA_HEALTH_CHECK_INTERVAL || "0", 10) || 60000,
    maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES || "0", 10) || 3,
  },

  // Vector Database (Qdrant)
  vectorDb: {
    url: process.env.VECTOR_DB_URL || 'http://localhost:6333',
    apiKey: process.env.VECTOR_DB_API_KEY,
    timeout: parseInt(process.env.VECTOR_DB_TIMEOUT || "0", 10) || 30000,
    collectionName: process.env.VECTOR_DB_COLLECTION || 'code_embeddings',
  },

  // LLM Service
  llmService: {
    url: process.env.LLM_SERVICE_URL || 'http://localhost:9000',
    timeout: parseInt(process.env.LLM_SERVICE_TIMEOUT || "0", 10) || 120000,
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || "0", 10) || 4096,
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
    topP: parseFloat(process.env.LLM_TOP_P || '0.8'),
  },

  // Security
  security: {
    // Allow all localhost origins in development for dev servers on any port
    // In production, set CORS_ORIGINS env var to specific allowed origins
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',  // Frontend
      'http://localhost:8000',  // Backend (for proxy)
      'http://localhost:8080',  // VS Code
      'http://localhost:5173',  // Vite
      'http://localhost:4200',  // Angular
      'http://localhost:3001',  // Additional dev server
    ],
    // Pattern for dynamic localhost port matching (used in main.ts)
    allowLocalhostPattern: true,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || "0", 10) || 15 * 60 * 1000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "0", 10) || 100,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "0", 10) || 12,
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || "0", 10) || 5,
    maxSize: process.env.LOG_MAX_SIZE || '5m',
    datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
  },

  // File Storage
  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    local: {
      uploadPath: process.env.UPLOAD_PATH || './uploads',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "0", 10) || 10 * 1024 * 1024, // 10MB
    },
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  },

  // VS Code Integration
  vscode: {
    serverUrl: process.env.VSCODE_SERVER_URL || 'http://localhost:8080',
    password: process.env.VSCODE_PASSWORD || 'codeserver123',
    extensionsPath: process.env.VSCODE_EXTENSIONS_PATH || './vscode-config/extensions',
    settingsPath: process.env.VSCODE_SETTINGS_PATH || './vscode-config/settings',
  },

  // Features
  features: {
    enableGpu: process.env.ENABLE_GPU === 'true',
    enableStreaming: process.env.ENABLE_STREAMING !== 'false', // Default true
    enableModelSwitching: process.env.ENABLE_MODEL_SWITCHING !== 'false', // Default true
    enableVectorSearch: process.env.ENABLE_VECTOR_SEARCH === 'true',
    enableFileUpload: process.env.ENABLE_FILE_UPLOAD === 'true',
    enableWebsockets: process.env.ENABLE_WEBSOCKETS !== 'false', // Default true
  },

  // Monitoring
  monitoring: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT || "0", 10) || 9090,
    enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false', // Default true
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || "0", 10) || 30000,
  },

  // Development
  development: {
    enableSwagger: process.env.ENABLE_SWAGGER !== 'false', // Default true in dev
    enableCors: process.env.ENABLE_CORS !== 'false', // Default true
    enableHotReload: process.env.ENABLE_HOT_RELOAD !== 'false', // Default true
    seedDatabase: process.env.SEED_DATABASE === 'true',
  },
});