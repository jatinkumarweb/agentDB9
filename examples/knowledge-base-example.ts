/**
 * Knowledge Base Integration Example
 * 
 * This example demonstrates how to create an agent with knowledge base
 * capabilities and use it to answer questions based on ingested documentation.
 */

import { AgentConfiguration } from '@agentdb9/shared';

// Example 1: Create an agent with knowledge base
async function createAgentWithKnowledgeBase() {
  const agentConfig: AgentConfiguration = {
    llmProvider: 'ollama',
    model: 'codellama:7b',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: 'You are a helpful coding assistant with access to documentation.',
    codeStyle: {
      indentSize: 2,
      indentType: 'spaces',
      lineLength: 100,
      semicolons: true,
      quotes: 'single',
      trailingCommas: true,
      bracketSpacing: true,
      arrowParens: 'always',
    },
    autoSave: true,
    autoFormat: true,
    autoTest: false,
    knowledgeBase: {
      enabled: true,
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      vectorStore: 'chroma',
      chunkSize: 1000,
      chunkOverlap: 200,
      retrievalTopK: 5,
      autoUpdate: true,
      updateFrequency: 'daily',
      sources: [
        {
          id: 'nestjs-docs',
          type: 'markdown',
          content: `# NestJS Documentation

## Controllers

Controllers are responsible for handling incoming requests and returning responses to the client.

### Basic Controller

\`\`\`typescript
import { Controller, Get } from '@nestjs/common';

@Controller('cats')
export class CatsController {
  @Get()
  findAll(): string {
    return 'This action returns all cats';
  }
}
\`\`\`

## Services

Services are used to handle business logic and data access.

### Basic Service

\`\`\`typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  findAll(): Cat[] {
    return this.cats;
  }
}
\`\`\``,
          metadata: {
            title: 'NestJS Documentation',
            description: 'Core concepts of NestJS framework',
            tags: ['nestjs', 'typescript', 'backend'],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          status: 'pending',
        },
        {
          id: 'typescript-docs',
          type: 'markdown',
          content: `# TypeScript Best Practices

## Type Safety

Always use explicit types for function parameters and return values.

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Interfaces vs Types

Use interfaces for object shapes that may be extended:

\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
}
\`\`\`

Use types for unions, intersections, and complex types:

\`\`\`typescript
type Status = 'active' | 'inactive' | 'pending';
type UserWithStatus = User & { status: Status };
\`\`\``,
          metadata: {
            title: 'TypeScript Best Practices',
            description: 'TypeScript coding guidelines',
            tags: ['typescript', 'best-practices'],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          status: 'pending',
        },
      ],
    },
  };

  // In a real application, you would call the AgentsService
  // const agent = await agentsService.create({
  //   name: 'NestJS Assistant',
  //   description: 'Helps with NestJS and TypeScript development',
  //   configuration: agentConfig,
  // }, userId);

  console.log('Agent configuration created with knowledge base');
  return agentConfig;
}

// Example 2: Add a new knowledge source to an existing agent
async function addKnowledgeSource(agentId: string) {
  const newSource = {
    id: 'api-docs',
    type: 'website' as const,
    url: 'https://docs.nestjs.com/controllers',
    metadata: {
      title: 'NestJS Controllers Documentation',
      description: 'Official NestJS controllers documentation',
      tags: ['nestjs', 'controllers', 'official'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    status: 'pending' as const,
  };

  // In a real application:
  // await knowledgeService.addSource(agentId, newSource);
  // await knowledgeService.ingestSource({
  //   agentId,
  //   source: newSource,
  //   options: {
  //     chunkSize: 1000,
  //     chunkOverlap: 200,
  //     extractMetadata: true,
  //     generateEmbeddings: true,
  //   },
  // });

  console.log('New knowledge source added and ingested');
  return newSource;
}

// Example 3: Query the knowledge base
async function queryKnowledgeBase(agentId: string, query: string) {
  // In a real application:
  // const result = await knowledgeService.retrieve({
  //   agentId,
  //   query,
  //   topK: 5,
  //   minScore: 0.7,
  // });

  // Mock result for demonstration
  const result = {
    agentId,
    query,
    results: [
      {
        chunk: {
          id: 'chunk-1',
          content: 'Controllers are responsible for handling incoming requests...',
          metadata: {
            title: 'NestJS Documentation',
            chunkIndex: 0,
            totalChunks: 5,
          },
        },
        score: 0.95,
      },
      {
        chunk: {
          id: 'chunk-2',
          content: '@Controller decorator is used to define a controller...',
          metadata: {
            title: 'NestJS Documentation',
            chunkIndex: 1,
            totalChunks: 5,
          },
        },
        score: 0.87,
      },
    ],
    processingTime: 150,
  };

  console.log(`Query: ${query}`);
  console.log(`Found ${result.results.length} relevant chunks:`);
  result.results.forEach((r, i) => {
    console.log(`  ${i + 1}. Score: ${r.score.toFixed(2)} - ${r.chunk.content.substring(0, 50)}...`);
  });

  return result;
}

// Example 4: Get agent knowledge context for chat
async function getAgentContext(agentId: string, userMessage: string) {
  // In a real application:
  // const context = await knowledgeService.getAgentKnowledgeContext(
  //   agentId,
  //   userMessage,
  //   5
  // );

  // Mock context for demonstration
  const context = {
    agentId,
    relevantChunks: [
      {
        id: 'chunk-1',
        content: 'Controllers handle HTTP requests in NestJS...',
        metadata: {
          title: 'NestJS Documentation',
          source: 'nestjs-docs',
        },
      },
    ],
    sources: [
      {
        id: 'nestjs-docs',
        type: 'markdown' as const,
        metadata: {
          title: 'NestJS Documentation',
          tags: ['nestjs'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        status: 'indexed' as const,
      },
    ],
    totalRelevance: 0.95,
    retrievalTime: 120,
  };

  console.log(`User message: ${userMessage}`);
  console.log(`Retrieved ${context.relevantChunks.length} relevant chunks`);
  console.log(`Total relevance: ${context.totalRelevance}`);
  console.log(`Sources used: ${context.sources.map(s => s.metadata.title).join(', ')}`);

  return context;
}

// Example 5: Manage knowledge sources
async function manageKnowledgeSources(agentId: string) {
  // List all sources
  // const sources = await knowledgeService.listSources(agentId);
  console.log('Listing all knowledge sources...');

  // Get statistics
  // const stats = await knowledgeService.getStats(agentId);
  const stats = {
    agentId,
    totalSources: 2,
    totalChunks: 15,
    totalTokens: 5000,
    sourcesByType: {
      markdown: 2,
      website: 0,
    },
    lastIndexed: new Date(),
  };

  console.log('Knowledge Base Statistics:');
  console.log(`  Total sources: ${stats.totalSources}`);
  console.log(`  Total chunks: ${stats.totalChunks}`);
  console.log(`  Total tokens: ${stats.totalTokens}`);
  console.log(`  Last indexed: ${stats.lastIndexed.toISOString()}`);

  // Reindex all sources
  // await knowledgeService.reindexAgent(agentId);
  console.log('Reindexing all sources...');

  return stats;
}

// Example 6: Update agent configuration to change embedding provider
async function updateEmbeddingProvider(agentId: string) {
  const updatedConfig: Partial<AgentConfiguration> = {
    knowledgeBase: {
      enabled: true,
      embeddingProvider: 'ollama', // Changed from OpenAI to Ollama
      embeddingModel: 'nomic-embed-text',
      vectorStore: 'chroma',
      chunkSize: 1000,
      chunkOverlap: 200,
      retrievalTopK: 5,
      autoUpdate: true,
      sources: [], // Keep existing sources
    },
  };

  // In a real application:
  // await agentsService.update(agentId, { configuration: updatedConfig });
  // This will automatically trigger reindexing with the new embedding provider

  console.log('Updated embedding provider to Ollama');
  console.log('All sources will be reindexed with new embeddings');

  return updatedConfig;
}

// Run examples
async function main() {
  console.log('=== Knowledge Base Integration Examples ===\n');

  // Example 1
  console.log('--- Example 1: Create Agent with Knowledge Base ---');
  await createAgentWithKnowledgeBase();
  console.log();

  // Example 2
  console.log('--- Example 2: Add Knowledge Source ---');
  await addKnowledgeSource('agent-123');
  console.log();

  // Example 3
  console.log('--- Example 3: Query Knowledge Base ---');
  await queryKnowledgeBase('agent-123', 'How do I create a controller in NestJS?');
  console.log();

  // Example 4
  console.log('--- Example 4: Get Agent Context ---');
  await getAgentContext('agent-123', 'Explain NestJS controllers');
  console.log();

  // Example 5
  console.log('--- Example 5: Manage Knowledge Sources ---');
  await manageKnowledgeSources('agent-123');
  console.log();

  // Example 6
  console.log('--- Example 6: Update Embedding Provider ---');
  await updateEmbeddingProvider('agent-123');
  console.log();
}

// Uncomment to run examples
// main().catch(console.error);

export {
  createAgentWithKnowledgeBase,
  addKnowledgeSource,
  queryKnowledgeBase,
  getAgentContext,
  manageKnowledgeSources,
  updateEmbeddingProvider,
};
