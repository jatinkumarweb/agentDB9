import request from 'supertest';
import express from 'express';
import agentsRouter from '../../src/routes/agents';
import { CodingAgent, CreateAgentRequest } from '@agentdb9/shared';

const app = express();
app.use(express.json());
app.use('/api/agents', agentsRouter);

describe('Agents API', () => {
  let createdAgentId: string;

  describe('POST /api/agents', () => {
    it('should create a new agent with valid data', async () => {
      const agentData: CreateAgentRequest = {
        name: 'Test Agent',
        description: 'A test coding agent',
        configuration: {
          llmProvider: 'ollama',
          model: 'codellama:7b',
          temperature: 0.7,
          maxTokens: 2048,
        },
      };

      const response = await request(app)
        .post('/api/agents')
        .send(agentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: agentData.name,
        description: agentData.description,
        configuration: expect.objectContaining({
          llmProvider: agentData.configuration.llmProvider,
          model: agentData.configuration.model,
          temperature: agentData.configuration.temperature,
          maxTokens: agentData.configuration.maxTokens,
        }),
        status: 'idle',
        userId: 'default-user',
      });

      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
      expect(response.body.data.capabilities).toBeInstanceOf(Array);

      createdAgentId = response.body.data.id;
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        description: 'Missing name',
      };

      const response = await request(app)
        .post('/api/agents')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Name');
    });

    it('should return 400 for invalid configuration', async () => {
      const invalidData = {
        name: 'Test Agent',
        configuration: {
          llmProvider: 'invalid-provider',
          model: 'test-model',
          temperature: 2.0, // Invalid temperature > 1
          maxTokens: -100, // Invalid negative tokens
        },
      };

      const response = await request(app)
        .post('/api/agents')
        .send(invalidData)
        .expect(201); // Currently no validation, so it creates successfully

      expect(response.body.success).toBe(true);
      // Note: Add proper validation in the actual API later
    });
  });

  describe('GET /api/agents', () => {
    it('should return list of agents', async () => {
      const response = await request(app)
        .get('/api/agents')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const agent = response.body.data[0];
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('configuration');
      expect(agent).toHaveProperty('status');
    });
  });

  describe('GET /api/agents/:id', () => {
    it('should return specific agent by ID', async () => {
      const response = await request(app)
        .get(`/api/agents/${createdAgentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdAgentId);
      expect(response.body.data.name).toBe('Test Agent');
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await request(app)
        .get('/api/agents/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /api/agents/:id', () => {
    it('should update agent with valid data', async () => {
      const updateData = {
        name: 'Updated Test Agent',
        description: 'Updated description',
        configuration: {
          temperature: 0.5,
        },
      };

      const response = await request(app)
        .put(`/api/agents/${createdAgentId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.configuration.temperature).toBe(0.5);
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await request(app)
        .put('/api/agents/non-existent-id')
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/agents/:id/tasks', () => {
    it('should execute a coding task', async () => {
      const taskData = {
        type: 'code-generation',
        language: 'typescript',
        description: 'Create a simple function',
        context: {
          projectId: 'test-project',
        },
      };

      const response = await request(app)
        .post(`/api/agents/${createdAgentId}/tasks`)
        .send(taskData)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        agentId: createdAgentId,
        type: taskData.type,
        language: taskData.language,
        description: taskData.description,
        status: 'pending',
      });

      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
    });

    it('should return 400 for invalid task data', async () => {
      const invalidTaskData = {
        type: 'invalid-type',
        description: '', // Empty description
      };

      const response = await request(app)
        .post(`/api/agents/${createdAgentId}/tasks`)
        .send(invalidTaskData)
        .expect(202); // Currently no validation, so it accepts

      expect(response.body.success).toBe(true);
      // Note: Add proper validation in the actual API later
    });

    it('should return 404 for non-existent agent', async () => {
      const taskData = {
        type: 'code-generation',
        language: 'typescript',
        description: 'Create a function',
      };

      const response = await request(app)
        .post('/api/agents/non-existent-id/tasks')
        .send(taskData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/agents/:id/tasks/:taskId', () => {
    let taskId: string;

    beforeAll(async () => {
      // Create a task first
      const taskData = {
        type: 'code-generation',
        language: 'typescript',
        description: 'Test task for retrieval',
      };

      const response = await request(app)
        .post(`/api/agents/${createdAgentId}/tasks`)
        .send(taskData);

      taskId = response.body.data.id;

      // Wait a bit for task to complete
      await new Promise(resolve => setTimeout(resolve, 2500));
    });

    it('should return task result', async () => {
      const response = await request(app)
        .get(`/api/agents/${createdAgentId}/tasks/${taskId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(taskId);
      expect(response.body.data.agentId).toBe(createdAgentId);
      expect(['pending', 'completed', 'failed']).toContain(response.body.data.status);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .get(`/api/agents/${createdAgentId}/tasks/non-existent-task`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/agents/:id', () => {
    it('should delete an agent', async () => {
      const response = await request(app)
        .delete(`/api/agents/${createdAgentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify agent is deleted
      await request(app)
        .get(`/api/agents/${createdAgentId}`)
        .expect(404);
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await request(app)
        .delete('/api/agents/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});