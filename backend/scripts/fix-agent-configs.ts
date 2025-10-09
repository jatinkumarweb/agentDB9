import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'agentdb9',
});

async function fixAgentConfigs() {
  try {
    console.log('Connecting to database...');
    await dataSource.initialize();
    
    console.log('Fixing agents with null configuration...');
    
    const defaultConfig = {
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
      }
    };
    
    const configResult = await dataSource.query(
      `UPDATE agents 
       SET configuration = $1::jsonb
       WHERE configuration IS NULL`,
      [JSON.stringify(defaultConfig)]
    );
    
    console.log(`✅ Updated ${configResult[1]} agents with default configuration`);
    
    const capabilitiesResult = await dataSource.query(
      `UPDATE agents 
       SET capabilities = '[]'::jsonb
       WHERE capabilities IS NULL`
    );
    
    console.log(`✅ Updated ${capabilitiesResult[1]} agents with default capabilities`);
    
    const count = await dataSource.query(
      `SELECT COUNT(*) as total FROM agents WHERE configuration IS NOT NULL AND capabilities IS NOT NULL`
    );
    
    console.log(`Total agents with valid data: ${count[0].total}`);
    
    await dataSource.destroy();
    console.log('Done!');
  } catch (error) {
    console.error('Error fixing agent configurations:', error);
    process.exit(1);
  }
}

fixAgentConfigs();
