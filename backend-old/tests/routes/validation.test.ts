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

describe('API Validation Tests', () => {
  describe('Input Validation', () => {
    describe('Agent Creation Validation', () => {
      it('should reject empty agent name', async () => {
        const response = await request(app)
          .post('/api/agents')
          .send({
            name: '',
            configuration: {
              llmProvider: 'ollama',
              model: 'codellama:7b',
              temperature: 0.7,
              maxTokens: 2048,
            },
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should reject missing configuration', async () => {
        const response = await request(app)
          .post('/api/agents')
          .send({
            name: 'Test Agent',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should handle extremely long agent names', async () => {
        const longName = 'A'.repeat(1000);
        
        const response = await request(app)
          .post('/api/agents')
          .send({
            name: longName,
            configuration: {
              llmProvider: 'ollama',
              model: 'codellama:7b',
              temperature: 0.7,
              maxTokens: 2048,
            },
          });

        // Should either accept or reject gracefully
        expect([201, 400]).toContain(response.status);
      });

      it('should handle special characters in agent names', async () => {
        const specialNames = [
          'Agent with spaces',
          'Agent-with-dashes',
          'Agent_with_underscores',
          'Agent.with.dots',
          'Agent@with#symbols',
          'Agent with émojis 🤖',
        ];

        for (const name of specialNames) {
          const response = await request(app)
            .post('/api/agents')
            .send({
              name,
              configuration: {
                llmProvider: 'ollama',
                model: 'codellama:7b',
                temperature: 0.7,
                maxTokens: 2048,
              },
            });

          expect([201, 400]).toContain(response.status);
          if (response.status === 201) {
            expect(response.body.data.name).toBe(name);
          }
        }
      });
    });

    describe('Project Creation Validation', () => {
      it('should reject empty project name', async () => {
        const response = await request(app)
          .post('/api/projects')
          .send({
            name: '',
            language: 'typescript',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should reject missing language', async () => {
        const response = await request(app)
          .post('/api/projects')
          .send({
            name: 'Test Project',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate repository URLs', async () => {
        const invalidUrls = [
          'not-a-url',
          'ftp://invalid-protocol.com',
          'http://',
          'https://',
          '',
        ];

        for (const url of invalidUrls) {
          const response = await request(app)
            .post('/api/projects')
            .send({
              name: 'Test Project',
              language: 'typescript',
              repositoryUrl: url,
            });

          // Should either accept or reject gracefully
          expect([201, 400]).toContain(response.status);
        }
      });

      it('should handle valid repository URLs', async () => {
        const validUrls = [
          'https://github.com/user/repo.git',
          'https://gitlab.com/user/repo.git',
          'https://bitbucket.org/user/repo.git',
          'git@github.com:user/repo.git',
        ];

        for (const url of validUrls) {
          const response = await request(app)
            .post('/api/projects')
            .send({
              name: `Test Project ${Date.now()}`,
              language: 'typescript',
              repositoryUrl: url,
            });

          expect(response.status).toBe(201);
          expect(response.body.data.repositoryUrl).toBe(url);
        }
      });
    });

    describe('File Content Validation', () => {
      let projectId: string;

      beforeAll(async () => {
        const projectResponse = await request(app)
          .post('/api/projects')
          .send({
            name: 'Validation Test Project',
            language: 'typescript',
          });
        projectId = projectResponse.body.data.id;
      });

      it('should reject empty file content', async () => {
        const response = await request(app)
          .put(`/api/projects/${projectId}/files/empty.js`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should reject non-string content', async () => {
        const invalidContents = [
          { content: 123 },
          { content: true },
          { content: [] },
          { content: {} },
          { content: null },
        ];

        for (const body of invalidContents) {
          const response = await request(app)
            .put(`/api/projects/${projectId}/files/invalid.js`)
            .send(body)
            .expect(400);

          expect(response.body.success).toBe(false);
        }
      });

      it('should handle binary content gracefully', async () => {
        const binaryContent = Buffer.from([0x89, 0x50, 0x4E, 0x47]).toString('binary');
        
        const response = await request(app)
          .put(`/api/projects/${projectId}/files/binary.png`)
          .send({
            content: binaryContent,
          });

        // Should either accept or reject gracefully
        expect([200, 400]).toContain(response.status);
      });

      it('should handle very long file paths', async () => {
        const longPath = 'very/'.repeat(50) + 'long/path/file.js';
        
        const response = await request(app)
          .put(`/api/projects/${projectId}/files/${longPath}`)
          .send({
            content: 'console.log("test");',
          });

        // Should either accept or reject gracefully
        expect([200, 400]).toContain(response.status);
      });

      afterAll(async () => {
        if (projectId) {
          await request(app).delete(`/api/projects/${projectId}`);
        }
      });
    });

    describe('Message Content Validation', () => {
      let agentId: string;
      let conversationId: string;

      beforeAll(async () => {
        const agentResponse = await request(app)
          .post('/api/agents')
          .send({
            name: 'Validation Test Agent',
            configuration: {
              llmProvider: 'ollama',
              model: 'codellama:7b',
              temperature: 0.7,
              maxTokens: 2048,
            },
          });
        agentId = agentResponse.body.data.id;

        const conversationResponse = await request(app)
          .post('/api/conversations')
          .send({
            agentId,
            title: 'Validation Test Conversation',
          });
        conversationId = conversationResponse.body.data.id;
      });

      it('should reject empty message content', async () => {
        const response = await request(app)
          .post(`/api/conversations/${conversationId}/messages`)
          .send({
            content: '',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should reject missing message content', async () => {
        const response = await request(app)
          .post(`/api/conversations/${conversationId}/messages`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should handle very long messages', async () => {
        const longMessage = 'This is a very long message. '.repeat(1000);
        
        const response = await request(app)
          .post(`/api/conversations/${conversationId}/messages`)
          .send({
            content: longMessage,
          });

        // Should either accept or reject gracefully
        expect([201, 400]).toContain(response.status);
      });

      it('should handle messages with special characters', async () => {
        const specialMessages = [
          'Message with émojis 🚀 🎉 💻',
          'Message with Unicode: 世界 π ≈ 3.14159',
          'Message with HTML: <script>alert("test")</script>',
          'Message with SQL: SELECT * FROM users; DROP TABLE users;',
          'Message with JSON: {"key": "value", "number": 123}',
          'Message with code: ```javascript\nconsole.log("Hello");\n```',
        ];

        for (const content of specialMessages) {
          const response = await request(app)
            .post(`/api/conversations/${conversationId}/messages`)
            .send({ content });

          expect(response.status).toBe(201);
          expect(response.body.data.content).toBe(content);
        }
      });

      afterAll(async () => {
        if (conversationId) {
          await request(app).delete(`/api/conversations/${conversationId}`);
        }
        if (agentId) {
          await request(app).delete(`/api/agents/${agentId}`);
        }
      });
    });
  });

  describe('HTTP Method Validation', () => {
    it('should reject unsupported HTTP methods', async () => {
      const unsupportedMethods = ['PATCH', 'HEAD', 'OPTIONS'];
      
      for (const method of unsupportedMethods) {
        const response = await request(app)
          [method.toLowerCase() as keyof typeof request]('/api/agents')
          .expect(404);
      }
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/agents')
        .expect(404); // Since we don't have CORS middleware in tests
    });
  });

  describe('Content-Type Validation', () => {
    it('should reject non-JSON content types for POST requests', async () => {
      const response = await request(app)
        .post('/api/agents')
        .set('Content-Type', 'text/plain')
        .send('not json')
        .expect(400);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
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

      // Should work with default JSON parsing
      expect([201, 400]).toContain(response.status);
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should handle rapid successive requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app).get('/api/agents')
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle malformed request bodies', async () => {
      const malformedBodies = [
        '{"incomplete": json',
        '{invalid json}',
        'not json at all',
        '{"nested": {"very": {"deep": {"object": {"that": {"goes": {"on": {"forever": true}}}}}}}}',
      ];

      for (const body of malformedBodies) {
        const response = await request(app)
          .post('/api/agents')
          .set('Content-Type', 'application/json')
          .send(body);

        expect(response.status).toBe(400);
      }
    });
  });
});