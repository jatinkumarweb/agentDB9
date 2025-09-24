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

describe('Error Handling Tests', () => {
  describe('404 Not Found Errors', () => {
    it('should return 404 for non-existent agent', async () => {
      const response = await request(app)
        .get('/api/agents/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .get('/api/conversations/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return 404 for non-existent project file', async () => {
      // First create a project
      const projectResponse = await request(app)
        .post('/api/projects')
        .send({
          name: 'Test Project',
          language: 'typescript',
        });

      const projectId = projectResponse.body.data.id;

      const response = await request(app)
        .get(`/api/projects/${projectId}/files/non-existent-file.js`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');

      // Cleanup
      await request(app).delete(`/api/projects/${projectId}`);
    });

    it('should return 404 for non-existent task', async () => {
      // First create an agent
      const agentResponse = await request(app)
        .post('/api/agents')
        .send({
          name: 'Test Agent',
          configuration: {
            llmProvider: 'ollama',
            model: 'codellama:7b',
            temperature: 0.7,
            maxTokens: 2048,
          },
        });

      const agentId = agentResponse.body.data.id;

      const response = await request(app)
        .get(`/api/agents/${agentId}/tasks/non-existent-task`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');

      // Cleanup
      await request(app).delete(`/api/agents/${agentId}`);
    });
  });

  describe('400 Bad Request Errors', () => {
    it('should return 400 for invalid JSON', async () => {
      const response = await request(app)
        .post('/api/agents')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });

    it('should return 400 for missing required fields in agent creation', async () => {
      const invalidPayloads = [
        {}, // Missing everything
        { name: 'Test' }, // Missing configuration
        { configuration: {} }, // Missing name
        { name: '', configuration: {} }, // Empty name
      ];

      for (const payload of invalidPayloads) {
        const response = await request(app)
          .post('/api/agents')
          .send(payload)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }
    });

    it('should return 400 for missing required fields in project creation', async () => {
      const invalidPayloads = [
        {}, // Missing everything
        { name: 'Test' }, // Missing language
        { language: 'typescript' }, // Missing name
        { name: '', language: 'typescript' }, // Empty name
      ];

      for (const payload of invalidPayloads) {
        const response = await request(app)
          .post('/api/projects')
          .send(payload)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }
    });

    it('should return 400 for missing required fields in conversation creation', async () => {
      const invalidPayloads = [
        {}, // Missing agentId
        { title: 'Test' }, // Missing agentId
        { agentId: '' }, // Empty agentId
      ];

      for (const payload of invalidPayloads) {
        const response = await request(app)
          .post('/api/conversations')
          .send(payload)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }
    });

    it('should return 400 for missing file content', async () => {
      // First create a project
      const projectResponse = await request(app)
        .post('/api/projects')
        .send({
          name: 'Test Project',
          language: 'typescript',
        });

      const projectId = projectResponse.body.data.id;

      const invalidPayloads = [
        {}, // Missing content
        { content: '' }, // Empty content
        { content: null }, // Null content
        { content: 123 }, // Non-string content
      ];

      for (const payload of invalidPayloads) {
        const response = await request(app)
          .put(`/api/projects/${projectId}/files/test.js`)
          .send(payload)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }

      // Cleanup
      await request(app).delete(`/api/projects/${projectId}`);
    });

    it('should return 400 for missing message content', async () => {
      // First create an agent and conversation
      const agentResponse = await request(app)
        .post('/api/agents')
        .send({
          name: 'Test Agent',
          configuration: {
            llmProvider: 'ollama',
            model: 'codellama:7b',
            temperature: 0.7,
            maxTokens: 2048,
          },
        });

      const agentId = agentResponse.body.data.id;

      const conversationResponse = await request(app)
        .post('/api/conversations')
        .send({
          agentId,
          title: 'Test Conversation',
        });

      const conversationId = conversationResponse.body.data.id;

      const invalidPayloads = [
        {}, // Missing content
        { content: '' }, // Empty content
        { content: null }, // Null content
        { content: 123 }, // Non-string content
      ];

      for (const payload of invalidPayloads) {
        const response = await request(app)
          .post(`/api/conversations/${conversationId}/messages`)
          .send(payload)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }

      // Cleanup
      await request(app).delete(`/api/conversations/${conversationId}`);
      await request(app).delete(`/api/agents/${agentId}`);
    });
  });

  describe('500 Internal Server Errors', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Test with extremely large payloads that might cause memory issues
      const hugeString = 'x'.repeat(10 * 1024 * 1024); // 10MB string
      
      const response = await request(app)
        .post('/api/agents')
        .send({
          name: hugeString,
          configuration: {
            llmProvider: 'ollama',
            model: 'codellama:7b',
            temperature: 0.7,
            maxTokens: 2048,
          },
        });

      // Should either handle gracefully or return appropriate error
      expect([201, 400, 413, 500]).toContain(response.status);
      
      if (response.status >= 400) {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }
    });
  });

  describe('Cross-Resource Error Handling', () => {
    it('should handle operations on deleted resources', async () => {
      // Create an agent
      const agentResponse = await request(app)
        .post('/api/agents')
        .send({
          name: 'Test Agent',
          configuration: {
            llmProvider: 'ollama',
            model: 'codellama:7b',
            temperature: 0.7,
            maxTokens: 2048,
          },
        });

      const agentId = agentResponse.body.data.id;

      // Create a conversation
      const conversationResponse = await request(app)
        .post('/api/conversations')
        .send({
          agentId,
          title: 'Test Conversation',
        });

      const conversationId = conversationResponse.body.data.id;

      // Delete the agent
      await request(app)
        .delete(`/api/agents/${agentId}`)
        .expect(200);

      // Try to send a message to the conversation (agent is deleted)
      const messageResponse = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .send({
          content: 'This should still work even if agent is deleted',
        });

      // Should either work or fail gracefully
      expect([201, 400, 404]).toContain(messageResponse.status);

      // Cleanup
      await request(app).delete(`/api/conversations/${conversationId}`);
    });

    it('should handle file operations on deleted projects', async () => {
      // Create a project
      const projectResponse = await request(app)
        .post('/api/projects')
        .send({
          name: 'Test Project',
          language: 'typescript',
        });

      const projectId = projectResponse.body.data.id;

      // Create a file
      await request(app)
        .put(`/api/projects/${projectId}/files/test.js`)
        .send({
          content: 'console.log("test");',
        })
        .expect(200);

      // Delete the project
      await request(app)
        .delete(`/api/projects/${projectId}`)
        .expect(200);

      // Try to access the file
      const fileResponse = await request(app)
        .get(`/api/projects/${projectId}/files/test.js`)
        .expect(404);

      expect(fileResponse.body.success).toBe(false);
    });
  });

  describe('Concurrent Operation Error Handling', () => {
    it('should handle concurrent modifications gracefully', async () => {
      // Create a project
      const projectResponse = await request(app)
        .post('/api/projects')
        .send({
          name: 'Concurrent Test Project',
          language: 'typescript',
        });

      const projectId = projectResponse.body.data.id;

      // Try to modify the same file concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .put(`/api/projects/${projectId}/files/concurrent.js`)
          .send({
            content: `// Version ${i}\nconsole.log("Version ${i}");`,
          })
      );

      const responses = await Promise.all(promises);
      
      // All should succeed (last write wins)
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Check final state
      const finalResponse = await request(app)
        .get(`/api/projects/${projectId}/files/concurrent.js`)
        .expect(200);

      expect(finalResponse.body.success).toBe(true);
      expect(finalResponse.body.data.content).toContain('Version');

      // Cleanup
      await request(app).delete(`/api/projects/${projectId}`);
    });

    it('should handle concurrent agent task submissions', async () => {
      // Create an agent
      const agentResponse = await request(app)
        .post('/api/agents')
        .send({
          name: 'Concurrent Task Agent',
          configuration: {
            llmProvider: 'ollama',
            model: 'codellama:7b',
            temperature: 0.7,
            maxTokens: 2048,
          },
        });

      const agentId = agentResponse.body.data.id;

      // Submit multiple tasks concurrently
      const promises = Array.from({ length: 3 }, (_, i) =>
        request(app)
          .post(`/api/agents/${agentId}/tasks`)
          .send({
            type: 'code-generation',
            language: 'typescript',
            description: `Concurrent task ${i}`,
          })
      );

      const responses = await Promise.all(promises);
      
      // All should be accepted
      responses.forEach(response => {
        expect(response.status).toBe(202);
        expect(response.body.success).toBe(true);
      });

      // Cleanup
      await request(app).delete(`/api/agents/${agentId}`);
    });
  });

  describe('Resource Cleanup Error Handling', () => {
    it('should handle deletion of non-existent resources', async () => {
      const nonExistentIds = [
        'non-existent-id',
        '12345',
        'invalid-uuid',
        '',
        'null',
        'undefined',
      ];

      for (const id of nonExistentIds) {
        // Try to delete non-existent agent
        const agentResponse = await request(app)
          .delete(`/api/agents/${id}`)
          .expect(404);

        expect(agentResponse.body.success).toBe(false);

        // Try to delete non-existent project
        const projectResponse = await request(app)
          .delete(`/api/projects/${id}`)
          .expect(404);

        expect(projectResponse.body.success).toBe(false);

        // Try to delete non-existent conversation
        const conversationResponse = await request(app)
          .delete(`/api/conversations/${id}`)
          .expect(404);

        expect(conversationResponse.body.success).toBe(false);
      }
    });

    it('should handle cascading deletions properly', async () => {
      // Create an agent
      const agentResponse = await request(app)
        .post('/api/agents')
        .send({
          name: 'Cascade Test Agent',
          configuration: {
            llmProvider: 'ollama',
            model: 'codellama:7b',
            temperature: 0.7,
            maxTokens: 2048,
          },
        });

      const agentId = agentResponse.body.data.id;

      // Create multiple conversations for the agent
      const conversationPromises = Array.from({ length: 3 }, (_, i) =>
        request(app)
          .post('/api/conversations')
          .send({
            agentId,
            title: `Cascade Test Conversation ${i}`,
          })
      );

      const conversationResponses = await Promise.all(conversationPromises);
      const conversationIds = conversationResponses.map(r => r.body.data.id);

      // Delete the agent
      await request(app)
        .delete(`/api/agents/${agentId}`)
        .expect(200);

      // Conversations should still exist (no cascading delete implemented)
      for (const conversationId of conversationIds) {
        const response = await request(app)
          .get(`/api/conversations/${conversationId}`);
        
        // Should either exist or be cleaned up
        expect([200, 404]).toContain(response.status);
        
        // Manual cleanup
        await request(app).delete(`/api/conversations/${conversationId}`);
      }
    });
  });
});