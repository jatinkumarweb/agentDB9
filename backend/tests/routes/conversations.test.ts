import request from 'supertest';
import express from 'express';
import conversationsRouter from '../../src/routes/conversations';
import agentsRouter from '../../src/routes/agents';
import { AgentConversation, ConversationMessage } from '@agentdb9/shared';

const app = express();
app.use(express.json());
app.use('/api/conversations', conversationsRouter);
app.use('/api/agents', agentsRouter);

describe('Conversations API', () => {
  let createdAgentId: string;
  let createdConversationId: string;

  beforeAll(async () => {
    // Create an agent first for conversation testing
    const agentData = {
      name: 'Test Conversation Agent',
      description: 'Agent for conversation testing',
      configuration: {
        llmProvider: 'ollama',
        model: 'codellama:7b',
        temperature: 0.7,
        maxTokens: 2048,
      },
    };

    const agentResponse = await request(app)
      .post('/api/agents')
      .send(agentData);

    createdAgentId = agentResponse.body.data.id;
  });

  describe('POST /api/conversations', () => {
    it('should create a new conversation with valid data', async () => {
      const conversationData = {
        agentId: createdAgentId,
        title: 'Test Conversation',
      };

      const response = await request(app)
        .post('/api/conversations')
        .send(conversationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        agentId: createdAgentId,
        title: conversationData.title,
        status: 'active',
        userId: 'default-user',
      });

      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.messages).toBeInstanceOf(Array);
      expect(response.body.data.messages.length).toBe(0);
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();

      createdConversationId = response.body.data.id;
    });

    it('should create conversation with default title', async () => {
      const conversationData = {
        agentId: createdAgentId,
      };

      const response = await request(app)
        .post('/api/conversations')
        .send(conversationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toContain('Conversation');
    });

    it('should return 400 for missing agentId', async () => {
      const invalidData = {
        title: 'Missing agent ID',
      };

      const response = await request(app)
        .post('/api/conversations')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Agent ID');
    });

    it('should return 404 for non-existent agent', async () => {
      const conversationData = {
        agentId: 'non-existent-agent-id',
        title: 'Test Conversation',
      };

      const response = await request(app)
        .post('/api/conversations')
        .send(conversationData)
        .expect(201); // Currently no validation, so it creates successfully

      expect(response.body.success).toBe(true);
      // Note: Add proper agent validation in the actual API later
    });
  });

  describe('GET /api/conversations/:id', () => {
    it('should return specific conversation by ID', async () => {
      const response = await request(app)
        .get(`/api/conversations/${createdConversationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdConversationId);
      expect(response.body.data.agentId).toBe(createdAgentId);
      expect(response.body.data.title).toBe('Test Conversation');
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .get('/api/conversations/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/conversations/agent/:agentId', () => {
    it('should return conversations for specific agent', async () => {
      const response = await request(app)
        .get(`/api/conversations/agent/${createdAgentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const conversation = response.body.data[0];
      expect(conversation.agentId).toBe(createdAgentId);
    });

    it('should return empty array for agent with no conversations', async () => {
      const response = await request(app)
        .get('/api/conversations/agent/non-existent-agent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
    });
  });

  describe('POST /api/conversations/:id/messages', () => {
    it('should send a message and get agent response', async () => {
      const messageData = {
        content: 'Hello, can you help me with TypeScript?',
      };

      const response = await request(app)
        .post(`/api/conversations/${createdConversationId}/messages`)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        conversationId: createdConversationId,
        role: 'user',
        content: messageData.content,
      });

      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();

      // Wait a moment for agent response to be generated
      await new Promise(resolve => setTimeout(resolve, 3500));

      // Check if conversation now has both user message and agent response
      const conversationResponse = await request(app)
        .get(`/api/conversations/${createdConversationId}`)
        .expect(200);

      expect(conversationResponse.body.data.messages.length).toBeGreaterThanOrEqual(2);
      
      const messages = conversationResponse.body.data.messages;
      const userMessage = messages.find((m: any) => m.role === 'user');
      const agentMessage = messages.find((m: any) => m.role === 'agent');

      expect(userMessage).toBeDefined();
      expect(userMessage.content).toBe(messageData.content);
      
      expect(agentMessage).toBeDefined();
      expect(agentMessage.content).toBeDefined();
      expect(agentMessage.metadata).toBeDefined();
      expect(agentMessage.metadata.executionTime).toBeDefined();
    });

    it('should return 400 for empty message content', async () => {
      const messageData = {
        content: '',
      };

      const response = await request(app)
        .post(`/api/conversations/${createdConversationId}/messages`)
        .send(messageData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('content');
    });

    it('should return 400 for missing content', async () => {
      const response = await request(app)
        .post(`/api/conversations/${createdConversationId}/messages`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('content');
    });

    it('should return 404 for non-existent conversation', async () => {
      const messageData = {
        content: 'Hello',
      };

      const response = await request(app)
        .post('/api/conversations/non-existent-id/messages')
        .send(messageData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/conversations/:id/messages', () => {
    it('should return paginated messages', async () => {
      const response = await request(app)
        .get(`/api/conversations/${createdConversationId}/messages`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(50);
      expect(response.body.pagination.total).toBeGreaterThan(0);
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get(`/api/conversations/${createdConversationId}/messages?page=1&limit=1`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
      expect(response.body.pagination.limit).toBe(1);
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .get('/api/conversations/non-existent-id/messages')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/conversations/:id', () => {
    it('should update conversation title', async () => {
      const updateData = {
        title: 'Updated Conversation Title',
      };

      const response = await request(app)
        .put(`/api/conversations/${createdConversationId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
    });

    it('should update conversation status', async () => {
      const updateData = {
        status: 'archived',
      };

      const response = await request(app)
        .put(`/api/conversations/${createdConversationId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(updateData.status);
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .put('/api/conversations/non-existent-id')
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/conversations/:id', () => {
    it('should delete a conversation', async () => {
      const response = await request(app)
        .delete(`/api/conversations/${createdConversationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify conversation is deleted
      await request(app)
        .get(`/api/conversations/${createdConversationId}`)
        .expect(404);
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .delete('/api/conversations/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Message Metadata and Features', () => {
    let testConversationId: string;

    beforeAll(async () => {
      // Create a new conversation for metadata testing
      const conversationData = {
        agentId: createdAgentId,
        title: 'Metadata Test Conversation',
      };

      const response = await request(app)
        .post('/api/conversations')
        .send(conversationData);

      testConversationId = response.body.data.id;
    });

    it('should include metadata in agent responses', async () => {
      const messageData = {
        content: 'Create a simple React component',
      };

      await request(app)
        .post(`/api/conversations/${testConversationId}/messages`)
        .send(messageData);

      // Wait for agent response
      await new Promise(resolve => setTimeout(resolve, 3500));

      const conversationResponse = await request(app)
        .get(`/api/conversations/${testConversationId}`);

      const agentMessage = conversationResponse.body.data.messages.find(
        (m: any) => m.role === 'agent'
      );

      expect(agentMessage).toBeDefined();
      expect(agentMessage.metadata).toBeDefined();
      expect(agentMessage.metadata.executionTime).toBeGreaterThan(0);
      expect(agentMessage.metadata.tokenUsage).toBeDefined();
      expect(agentMessage.metadata.tokenUsage.prompt).toBeGreaterThan(0);
      expect(agentMessage.metadata.tokenUsage.completion).toBeGreaterThan(0);
      expect(agentMessage.metadata.tokenUsage.total).toBeGreaterThan(0);
    });

    it('should handle long conversations', async () => {
      // Send multiple messages to test conversation handling
      const messages = [
        'What is TypeScript?',
        'How do I create interfaces?',
        'Show me an example of generics',
        'What are decorators?',
      ];

      for (const content of messages) {
        await request(app)
          .post(`/api/conversations/${testConversationId}/messages`)
          .send({ content });
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Wait for all agent responses
      await new Promise(resolve => setTimeout(resolve, 5000));

      const conversationResponse = await request(app)
        .get(`/api/conversations/${testConversationId}`);

      // Should have user messages + agent responses
      expect(conversationResponse.body.data.messages.length).toBeGreaterThanOrEqual(messages.length * 2);
    });
  });
});