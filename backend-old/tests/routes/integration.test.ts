import request from 'supertest';
import express from 'express';
import agentsRouter from '../../src/routes/agents';
import projectsRouter from '../../src/routes/projects';
import conversationsRouter from '../../src/routes/conversations';

const app = express();
app.use(express.json());
app.use('/api/agents', agentsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/conversations', conversationsRouter);

describe('API Integration Tests', () => {
  let agentId: string;
  let projectId: string;
  let conversationId: string;

  describe('End-to-End Workflow', () => {
    it('should create agent, project, and conversation in sequence', async () => {
      // 1. Create an agent
      const agentResponse = await request(app)
        .post('/api/agents')
        .send({
          name: 'Integration Test Agent',
          description: 'Agent for integration testing',
          configuration: {
            llmProvider: 'ollama',
            model: 'codellama:7b',
            temperature: 0.7,
            maxTokens: 2048,
          },
        })
        .expect(201);

      expect(agentResponse.body.success).toBe(true);
      agentId = agentResponse.body.data.id;

      // 2. Create a project
      const projectResponse = await request(app)
        .post('/api/projects')
        .send({
          name: 'Integration Test Project',
          description: 'Project for integration testing',
          language: 'typescript',
          framework: 'next',
        })
        .expect(201);

      expect(projectResponse.body.success).toBe(true);
      projectId = projectResponse.body.data.id;

      // 3. Create a conversation
      const conversationResponse = await request(app)
        .post('/api/conversations')
        .send({
          agentId: agentId,
          title: 'Integration Test Conversation',
        })
        .expect(201);

      expect(conversationResponse.body.success).toBe(true);
      conversationId = conversationResponse.body.data.id;
    });

    it('should handle agent task execution with project context', async () => {
      const taskResponse = await request(app)
        .post(`/api/agents/${agentId}/tasks`)
        .send({
          type: 'code-generation',
          language: 'typescript',
          description: 'Create a React component for the project',
          context: {
            projectId: projectId,
          },
        })
        .expect(202);

      expect(taskResponse.body.success).toBe(true);
      expect(taskResponse.body.data.agentId).toBe(agentId);
      expect(taskResponse.body.data.context.projectId).toBe(projectId);

      const taskId = taskResponse.body.data.id;

      // Wait for task completion
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Check task result
      const resultResponse = await request(app)
        .get(`/api/agents/${agentId}/tasks/${taskId}`)
        .expect(200);

      expect(resultResponse.body.success).toBe(true);
      expect(['completed', 'failed']).toContain(resultResponse.body.data.status);
    });

    it('should handle conversation with code generation', async () => {
      // Send a message requesting code generation
      const messageResponse = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .send({
          content: 'Can you create a TypeScript interface for a User model?',
        })
        .expect(201);

      expect(messageResponse.body.success).toBe(true);
      expect(messageResponse.body.data.role).toBe('user');

      // Wait for agent response
      await new Promise(resolve => setTimeout(resolve, 3500));

      // Check conversation for agent response
      const conversationResponse = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .expect(200);

      expect(conversationResponse.body.data.messages.length).toBeGreaterThanOrEqual(2);
      
      const agentMessage = conversationResponse.body.data.messages.find(
        (m: any) => m.role === 'agent'
      );
      expect(agentMessage).toBeDefined();
      expect(agentMessage.metadata).toBeDefined();
    });

    it('should create and manage project files', async () => {
      // Create a TypeScript file
      const fileResponse = await request(app)
        .put(`/api/projects/${projectId}/files/src/types/User.ts`)
        .send({
          content: `export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}`,
        })
        .expect(200);

      expect(fileResponse.body.success).toBe(true);
      expect(fileResponse.body.data.language).toBe('typescript');

      // List project files
      const filesResponse = await request(app)
        .get(`/api/projects/${projectId}/files`)
        .expect(200);

      expect(filesResponse.body.data.length).toBeGreaterThan(0);
      expect(filesResponse.body.data.some((f: any) => f.path === 'src/types/User.ts')).toBe(true);

      // Read the file back
      const readResponse = await request(app)
        .get(`/api/projects/${projectId}/files/src/types/User.ts`)
        .expect(200);

      expect(readResponse.body.data.content).toContain('export interface User');
    });

    it('should handle agent conversations for multiple agents', async () => {
      // Create another agent
      const agent2Response = await request(app)
        .post('/api/agents')
        .send({
          name: 'Second Test Agent',
          description: 'Another agent for testing',
          configuration: {
            llmProvider: 'ollama',
            model: 'codellama:7b',
            temperature: 0.5,
            maxTokens: 1024,
          },
        })
        .expect(201);

      const agent2Id = agent2Response.body.data.id;

      // Create conversation with second agent
      const conv2Response = await request(app)
        .post('/api/conversations')
        .send({
          agentId: agent2Id,
          title: 'Second Agent Conversation',
        })
        .expect(201);

      const conv2Id = conv2Response.body.data.id;

      // Get conversations for first agent
      const agent1ConvsResponse = await request(app)
        .get(`/api/conversations/agent/${agentId}`)
        .expect(200);

      expect(agent1ConvsResponse.body.data.length).toBe(1);
      expect(agent1ConvsResponse.body.data[0].id).toBe(conversationId);

      // Get conversations for second agent
      const agent2ConvsResponse = await request(app)
        .get(`/api/conversations/agent/${agent2Id}`)
        .expect(200);

      expect(agent2ConvsResponse.body.data.length).toBe(1);
      expect(agent2ConvsResponse.body.data[0].id).toBe(conv2Id);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/agents')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      // Express should handle malformed JSON
    });

    it('should handle very large payloads', async () => {
      const largeContent = 'x'.repeat(100000); // 100KB string
      
      const response = await request(app)
        .put(`/api/projects/${projectId}/files/large-file.txt`)
        .send({
          content: largeContent,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.size).toBe(largeContent.length);
    });

    it('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/agents')
          .send({
            name: `Concurrent Agent ${i}`,
            description: `Agent created concurrently ${i}`,
            configuration: {
              llmProvider: 'ollama',
              model: 'codellama:7b',
              temperature: 0.7,
              maxTokens: 2048,
            },
          })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify all agents were created with unique IDs
      const agentIds = responses.map(r => r.body.data.id);
      const uniqueIds = new Set(agentIds);
      expect(uniqueIds.size).toBe(agentIds.length);
    });

    it('should handle special characters in file paths', async () => {
      const specialPaths = [
        'files/test with spaces.js',
        'files/test-with-dashes.js',
        'files/test_with_underscores.js',
        'files/test.with.dots.js',
      ];

      for (const path of specialPaths) {
        const response = await request(app)
          .put(`/api/projects/${projectId}/files/${path}`)
          .send({
            content: `// File: ${path}\nconsole.log('Hello World');`,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.path).toBe(path);
      }
    });

    it('should handle Unicode content in files', async () => {
      const unicodeContent = `// Unicode test file
const greeting = "Hello 世界! 🌍";
const emoji = "🚀 🎉 💻";
const math = "π ≈ 3.14159";
const arrows = "← → ↑ ↓";
`;

      const response = await request(app)
        .put(`/api/projects/${projectId}/files/unicode-test.js`)
        .send({
          content: unicodeContent,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(unicodeContent);
    });

    it('should handle rapid message sending in conversations', async () => {
      const messages = [
        'First message',
        'Second message',
        'Third message',
        'Fourth message',
        'Fifth message',
      ];

      const promises = messages.map(content =>
        request(app)
          .post(`/api/conversations/${conversationId}/messages`)
          .send({ content })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Wait for agent responses
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check that all messages were processed
      const conversationResponse = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .expect(200);

      expect(conversationResponse.body.data.messages.length).toBeGreaterThanOrEqual(messages.length);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple simultaneous task executions', async () => {
      const taskPromises = Array.from({ length: 3 }, (_, i) =>
        request(app)
          .post(`/api/agents/${agentId}/tasks`)
          .send({
            type: 'code-generation',
            language: 'typescript',
            description: `Generate code for task ${i}`,
            context: { projectId },
          })
      );

      const responses = await Promise.all(taskPromises);
      
      responses.forEach(response => {
        expect(response.status).toBe(202);
        expect(response.body.success).toBe(true);
      });

      const taskIds = responses.map(r => r.body.data.id);

      // Wait for all tasks to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check all task results
      const resultPromises = taskIds.map(taskId =>
        request(app).get(`/api/agents/${agentId}/tasks/${taskId}`)
      );

      const results = await Promise.all(resultPromises);
      
      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
      });
    });

    it('should handle pagination with large datasets', async () => {
      // Create many messages
      const messagePromises = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .post(`/api/conversations/${conversationId}/messages`)
          .send({ content: `Test message ${i + 1}` })
      );

      await Promise.all(messagePromises);

      // Test pagination
      const page1Response = await request(app)
        .get(`/api/conversations/${conversationId}/messages?page=1&limit=5`)
        .expect(200);

      expect(page1Response.body.success).toBe(true);
      expect(page1Response.body.data.length).toBeLessThanOrEqual(5);
      expect(page1Response.body.pagination).toBeDefined();
      expect(page1Response.body.pagination.page).toBe(1);
      expect(page1Response.body.pagination.limit).toBe(5);

      const page2Response = await request(app)
        .get(`/api/conversations/${conversationId}/messages?page=2&limit=5`)
        .expect(200);

      expect(page2Response.body.success).toBe(true);
      expect(page2Response.body.pagination.page).toBe(2);
    });
  });

  afterAll(async () => {
    // Cleanup: Delete created resources
    if (conversationId) {
      await request(app).delete(`/api/conversations/${conversationId}`);
    }
    if (projectId) {
      await request(app).delete(`/api/projects/${projectId}`);
    }
    if (agentId) {
      await request(app).delete(`/api/agents/${agentId}`);
    }
  });
});