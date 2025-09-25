import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

export async function seedDemoData(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository('User');
  const agentRepository = dataSource.getRepository('Agent');
  
  // Create demo user
  let demoUser = await userRepository.findOne({
    where: { email: 'demo@agentdb9.com' }
  });

  if (!demoUser) {
    const hashedPassword = await bcrypt.hash('demo123', 12);
    
    demoUser = await userRepository.save({
      email: 'demo@agentdb9.com',
      username: 'demo',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      role: 'user',
      isActive: true,
      preferences: {
        theme: 'dark',
        defaultModel: 'codellama:7b',
        codeStyle: {
          indentSize: 2,
          useSpaces: true,
          semicolons: true
        },
        notifications: {
          email: false,
          browser: true
        }
      }
    });

    console.log('✅ Demo user created: demo@agentdb9.com / demo123');
  }

  // Create demo agents
  const existingAgent = await agentRepository.findOne({
    where: { name: 'TypeScript Assistant' }
  });

  if (!existingAgent) {
    await agentRepository.save([
      {
        name: 'TypeScript Assistant',
        description: 'Specialized in TypeScript development, React, and Node.js',
        userId: demoUser.id,
        configuration: {
          model: 'codellama:7b',
          provider: 'ollama',
          temperature: 0.1,
          maxTokens: 2048,
          systemPrompt: 'You are a TypeScript expert. Help with code generation, debugging, and best practices.',
          codeStyle: {
            indentSize: 2,
            useSpaces: true,
            semicolons: true,
            quotes: 'single'
          }
        },
        status: 'idle',
        capabilities: [
          { type: 'code-generation', enabled: true, confidence: 0.9 },
          { type: 'code-modification', enabled: true, confidence: 0.8 },
          { type: 'code-refactoring', enabled: true, confidence: 0.8 },
          { type: 'debugging', enabled: true, confidence: 0.7 },
          { type: 'testing', enabled: true, confidence: 0.6 },
          { type: 'documentation', enabled: true, confidence: 0.8 }
        ]
      },
      {
        name: 'Python Developer',
        description: 'Expert in Python, Django, FastAPI, and data science',
        userId: demoUser.id,
        configuration: {
          model: 'deepseek-coder:6.7b',
          provider: 'ollama',
          temperature: 0.2,
          maxTokens: 2048,
          systemPrompt: 'You are a Python expert. Help with web development, data science, and automation.',
          codeStyle: {
            indentSize: 4,
            useSpaces: true,
            maxLineLength: 88
          }
        },
        status: 'idle',
        capabilities: [
          { type: 'code-generation', enabled: true, confidence: 0.9 },
          { type: 'code-modification', enabled: true, confidence: 0.8 },
          { type: 'debugging', enabled: true, confidence: 0.8 },
          { type: 'testing', enabled: true, confidence: 0.7 },
          { type: 'documentation', enabled: true, confidence: 0.7 }
        ]
      },
      {
        name: 'Full-Stack Assistant',
        description: 'General purpose coding assistant for multiple languages',
        userId: demoUser.id,
        configuration: {
          model: 'qwen2.5-coder:7b',
          provider: 'ollama',
          temperature: 0.3,
          maxTokens: 2048,
          systemPrompt: 'You are a full-stack developer. Help with frontend, backend, and DevOps tasks.',
          codeStyle: {
            indentSize: 2,
            useSpaces: true,
            semicolons: true
          }
        },
        status: 'idle',
        capabilities: [
          { type: 'code-generation', enabled: true, confidence: 0.8 },
          { type: 'code-modification', enabled: true, confidence: 0.8 },
          { type: 'code-refactoring', enabled: true, confidence: 0.7 },
          { type: 'debugging', enabled: true, confidence: 0.7 },
          { type: 'testing', enabled: true, confidence: 0.6 },
          { type: 'documentation', enabled: true, confidence: 0.8 },
          { type: 'architecture', enabled: true, confidence: 0.6 }
        ]
      }
    ]);

    console.log('✅ Demo agents created');
  } else {
    console.log('ℹ️  Demo agents already exist');
  }
}