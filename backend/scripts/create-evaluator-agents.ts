import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dataSource = new DataSource({
  type: process.env.DATABASE_URL?.startsWith('sqlite:') ? 'sqlite' : 'postgres',
  database: process.env.DATABASE_URL?.startsWith('sqlite:') 
    ? process.env.DATABASE_URL.replace('sqlite:', '') 
    : process.env.DB_NAME || 'coding_agent',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  entities: [path.resolve(__dirname, '../src/entities/*.entity.ts')],
  synchronize: false,
});

interface EvaluatorConfig {
  name: string;
  description: string;
  model: string;
  provider: 'ollama' | 'anthropic';
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

const EVALUATOR_CONFIGS: EvaluatorConfig[] = [
  {
    name: 'Primary Evaluator - Llama 3.1',
    description: 'Primary evaluator agent using Llama 3.1 8B for comprehensive code evaluation',
    model: 'llama3.1:8b',
    provider: 'ollama',
    systemPrompt: `You are an expert code evaluator. Your role is to assess agent-generated code and responses against ground truth standards.

Evaluation Criteria:
1. **Accuracy** (0-1): Does the code produce correct results?
2. **Code Quality** (0-1): Is the code well-structured, readable, and maintainable?
3. **Style Adherence** (0-1): Does it follow the specified coding style?
4. **Completeness** (0-1): Are all requirements addressed?
5. **Performance** (0-1): Is the solution efficient?

Provide:
- Numerical scores for each criterion
- Brief justification for each score
- Overall assessment
- Specific improvement suggestions

Be objective, consistent, and thorough in your evaluations.`,
    temperature: 0.1,
    maxTokens: 4096,
  },
  {
    name: 'Secondary Evaluator - Qwen 2.5 Coder',
    description: 'Secondary evaluator using Qwen 2.5 Coder for code-specific analysis',
    model: 'qwen2.5-coder:7b',
    provider: 'ollama',
    systemPrompt: `You are a specialized code quality evaluator with expertise in software engineering best practices.

Focus Areas:
1. **Correctness**: Functional accuracy and bug-free implementation
2. **Design Patterns**: Appropriate use of design patterns
3. **Best Practices**: Adherence to language-specific conventions
4. **Security**: Identification of security vulnerabilities
5. **Testability**: Code structure that facilitates testing

For each evaluation:
- Provide scores (0-1) for each focus area
- Identify specific issues with line references
- Suggest concrete improvements
- Rate overall quality

Maintain consistency across evaluations and be detail-oriented.`,
    temperature: 0.1,
    maxTokens: 4096,
  },
  {
    name: 'Backend Specialist Evaluator',
    description: 'Evaluator specialized in backend code (APIs, databases, services)',
    model: 'llama3.1:8b',
    provider: 'ollama',
    systemPrompt: `You are a backend development expert evaluating server-side code.

Evaluation Focus:
1. **API Design**: RESTful principles, endpoint structure, HTTP methods
2. **Database Operations**: Query efficiency, data modeling, transactions
3. **Error Handling**: Proper exception handling and error responses
4. **Security**: Authentication, authorization, input validation
5. **Performance**: Scalability, caching, optimization

Scoring (0-1 scale):
- Provide detailed scores for each category
- Identify architectural issues
- Suggest performance optimizations
- Highlight security concerns

Be thorough and backend-focused in your analysis.`,
    temperature: 0.1,
    maxTokens: 4096,
  },
  {
    name: 'Frontend Specialist Evaluator',
    description: 'Evaluator specialized in frontend code (React, UI/UX, accessibility)',
    model: 'qwen2.5-coder:7b',
    provider: 'ollama',
    systemPrompt: `You are a frontend development expert evaluating client-side code.

Evaluation Criteria:
1. **Component Design**: React best practices, component structure, hooks usage
2. **UI/UX**: User experience, responsiveness, accessibility
3. **State Management**: Proper state handling, data flow
4. **Performance**: Rendering optimization, bundle size, lazy loading
5. **Accessibility**: ARIA labels, keyboard navigation, screen reader support

Scoring Guidelines:
- Rate each criterion (0-1)
- Identify UI/UX issues
- Suggest accessibility improvements
- Recommend performance optimizations

Focus on modern frontend best practices and user experience.`,
    temperature: 0.1,
    maxTokens: 4096,
  },
  {
    name: 'DevOps Specialist Evaluator',
    description: 'Evaluator specialized in DevOps code (CI/CD, infrastructure, deployment)',
    model: 'llama3.1:8b',
    provider: 'ollama',
    systemPrompt: `You are a DevOps expert evaluating infrastructure and deployment code.

Evaluation Areas:
1. **Infrastructure as Code**: Terraform, Docker, Kubernetes configurations
2. **CI/CD Pipelines**: Build, test, deployment automation
3. **Security**: Secrets management, vulnerability scanning
4. **Monitoring**: Logging, metrics, alerting
5. **Reliability**: High availability, disaster recovery, scaling

Assessment (0-1 scores):
- Evaluate each area thoroughly
- Identify infrastructure risks
- Suggest reliability improvements
- Recommend security enhancements

Focus on production-readiness and operational excellence.`,
    temperature: 0.1,
    maxTokens: 4096,
  },
];

async function createEvaluatorAgents() {
  try {
    console.log('🔧 Connecting to database...\n');
    await dataSource.initialize();
    
    // Get first user (or create a test user)
    const users = await dataSource.query('SELECT id FROM users LIMIT 1');
    
    if (users.length === 0) {
      console.error('❌ No users found. Please create a user first.');
      console.log('\nTo create a user, start the backend and register via the API:');
      console.log('  POST http://localhost:8000/api/auth/register');
      console.log('  Body: { "email": "test@example.com", "password": "password123", "name": "Test User" }');
      process.exit(1);
    }
    
    const userId = users[0].id;
    console.log(`✅ Using user ID: ${userId}\n`);
    
    console.log('🤖 Creating evaluator agents...\n');
    
    const createdAgents: Array<{ id: string; name: string }> = [];
    
    for (const config of EVALUATOR_CONFIGS) {
      const agentData = {
        name: config.name,
        description: config.description,
        userId: userId,
        configuration: JSON.stringify({
          llmProvider: config.provider,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          systemPrompt: config.systemPrompt,
          codeStyle: {
            indentSize: 2,
            indentType: 'spaces',
            lineLength: 100,
            semicolons: true,
            quotes: 'single',
            trailingCommas: true,
            bracketSpacing: true,
            arrowParens: 'always'
          },
          autoSave: false,
          autoFormat: false,
          autoTest: false,
          workspace: {
            enableActions: true,
            enableContext: true
          },
          knowledgeBase: {
            enabled: false
          },
          memory: {
            enabled: true,
            shortTerm: {
              enabled: true,
              maxMessages: 100,
              retentionHours: 168, // 7 days
            },
            longTerm: {
              enabled: true,
              consolidationThreshold: 20,
              importanceThreshold: 0.8,
            },
          },
        }),
        capabilities: JSON.stringify([
          { type: 'code-analysis', enabled: true, confidence: 0.9 },
          { type: 'code-review', enabled: true, confidence: 0.9 },
          { type: 'evaluation', enabled: true, confidence: 0.95 },
        ]),
        status: 'idle'
      };
      
      // Check if database is SQLite or PostgreSQL
      const isSQLite = process.env.DATABASE_URL?.startsWith('sqlite:');
      
      let result;
      if (isSQLite) {
        // Generate UUID for SQLite
        const { randomUUID } = await import('crypto');
        const agentId = randomUUID();
        
        result = await dataSource.query(
          `INSERT INTO agents (id, name, description, userId, configuration, capabilities, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            agentId,
            agentData.name,
            agentData.description,
            agentData.userId,
            agentData.configuration,
            agentData.capabilities,
            agentData.status
          ]
        );
        
        createdAgents.push({ id: agentId, name: agentData.name });
      } else {
        result = await dataSource.query(
          `INSERT INTO agents (name, description, "userId", configuration, capabilities, status)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
           RETURNING id, name`,
          [
            agentData.name,
            agentData.description,
            agentData.userId,
            agentData.configuration,
            agentData.capabilities,
            agentData.status
          ]
        );
        
        createdAgents.push(result[0]);
      }
      
      console.log(`  ✅ Created: ${config.name}`);
      console.log(`     Model: ${config.model} (${config.provider})`);
      console.log(`     ID: ${createdAgents[createdAgents.length - 1].id}\n`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Successfully created all evaluator agents!\n');
    
    console.log('📋 Summary:');
    console.log(`   Total agents created: ${createdAgents.length}`);
    console.log(`   User ID: ${userId}\n`);
    
    console.log('🎯 Evaluator Agents:');
    createdAgents.forEach((agent, index) => {
      const config = EVALUATOR_CONFIGS[index];
      console.log(`   ${index + 1}. ${agent.name}`);
      console.log(`      ID: ${agent.id}`);
      console.log(`      Model: ${config.model}`);
    });
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Verify agents in the UI: http://localhost:3000/agents');
    console.log('   2. Test agent responses via API or UI');
    console.log('   3. Proceed with evaluation system implementation\n');
    
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error creating evaluator agents:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

createEvaluatorAgents();
