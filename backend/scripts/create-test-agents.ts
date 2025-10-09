import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'agentdb9',
});

async function createTestAgents() {
  try {
    console.log('Connecting to database...');
    await dataSource.initialize();
    
    // Get first user (or create a test user)
    const users = await dataSource.query('SELECT id FROM users LIMIT 1');
    
    if (users.length === 0) {
      console.error('No users found. Please create a user first.');
      process.exit(1);
    }
    
    const userId = users[0].id;
    console.log(`Using user ID: ${userId}`);
    
    // Agent WITHOUT knowledge base
    const agentWithoutKnowledge = {
      name: 'Test Agent - No Knowledge',
      description: 'Agent without knowledge base for comparison testing',
      userId: userId,
      configuration: JSON.stringify({
        llmProvider: 'ollama',
        model: 'qwen2.5-coder:7b',
        temperature: 0.7,
        maxTokens: 2048,
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
        autoSave: true,
        autoFormat: true,
        autoTest: false,
        workspace: {
          enableActions: true,
          enableContext: true
        },
        knowledgeBase: {
          enabled: false
        }
      }),
      capabilities: JSON.stringify([]),
      status: 'idle'
    };
    
    // Agent WITH knowledge base
    const agentWithKnowledge = {
      name: 'Test Agent - With Knowledge',
      description: 'Agent with knowledge base enabled for comparison testing',
      userId: userId,
      configuration: JSON.stringify({
        llmProvider: 'ollama',
        model: 'qwen2.5-coder:7b',
        temperature: 0.7,
        maxTokens: 2048,
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
        autoSave: true,
        autoFormat: true,
        autoTest: false,
        workspace: {
          enableActions: true,
          enableContext: true
        },
        knowledgeBase: {
          enabled: true,
          embeddingProvider: 'ollama',
          embeddingModel: 'nomic-embed-text',
          vectorStore: 'qdrant',
          chunkSize: 1000,
          chunkOverlap: 200,
          retrievalTopK: 5,
          sources: [],
          autoUpdate: false,
          updateFrequency: 'manual'
        }
      }),
      capabilities: JSON.stringify([]),
      status: 'idle'
    };
    
    console.log('\nCreating test agents...');
    
    const result1 = await dataSource.query(
      `INSERT INTO agents (name, description, "userId", configuration, capabilities, status)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
       RETURNING id, name`,
      [
        agentWithoutKnowledge.name,
        agentWithoutKnowledge.description,
        agentWithoutKnowledge.userId,
        agentWithoutKnowledge.configuration,
        agentWithoutKnowledge.capabilities,
        agentWithoutKnowledge.status
      ]
    );
    
    const result2 = await dataSource.query(
      `INSERT INTO agents (name, description, "userId", configuration, capabilities, status)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
       RETURNING id, name`,
      [
        agentWithKnowledge.name,
        agentWithKnowledge.description,
        agentWithKnowledge.userId,
        agentWithKnowledge.configuration,
        agentWithKnowledge.capabilities,
        agentWithKnowledge.status
      ]
    );
    
    console.log('\n✅ Test agents created successfully!\n');
    console.log('Agent WITHOUT Knowledge:');
    console.log(`  ID: ${result1[0].id}`);
    console.log(`  Name: ${result1[0].name}`);
    console.log(`  Knowledge Base: Disabled\n`);
    
    console.log('Agent WITH Knowledge:');
    console.log(`  ID: ${result2[0].id}`);
    console.log(`  Name: ${result2[0].name}`);
    console.log(`  Knowledge Base: Enabled`);
    console.log(`  Note: Add knowledge sources via API or UI\n`);
    
    console.log('Next Steps:');
    console.log('1. Add knowledge source to agent with knowledge');
    console.log('2. Ask the same question to both agents');
    console.log('3. Compare responses\n');
    
    await dataSource.destroy();
  } catch (error) {
    console.error('Error creating test agents:', error);
    process.exit(1);
  }
}

createTestAgents();
