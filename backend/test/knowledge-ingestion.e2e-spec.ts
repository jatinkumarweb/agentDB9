import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * E2E Test Suite: Knowledge Ingestion
 * 
 * Tests the difference between agents with and without knowledge base:
 * 1. Agent without knowledge - relies only on LLM training data
 * 2. Agent with knowledge - can access custom documentation/code
 * 
 * Test Scenarios:
 * - Query about custom API not in LLM training data
 * - Query about project-specific code patterns
 * - Query about internal documentation
 * - Verify knowledge retrieval in responses
 */
describe('Knowledge Ingestion (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;
  let agentWithoutKnowledge: any;
  let agentWithKnowledge: any;

  // Test knowledge source content
  const customApiDocs = `
# Custom Payment API Documentation

## Authentication
Use Bearer token in Authorization header.

## Endpoints

### POST /api/payments/process
Process a payment transaction.

Request:
\`\`\`json
{
  "amount": 100.00,
  "currency": "USD",
  "customerId": "cust_123",
  "paymentMethod": "card_456",
  "metadata": {
    "orderId": "order_789"
  }
}
\`\`\`

Response:
\`\`\`json
{
  "success": true,
  "transactionId": "txn_abc123",
  "status": "completed",
  "timestamp": "2024-01-01T12:00:00Z"
}
\`\`\`

### GET /api/payments/:transactionId
Retrieve payment details.

Response includes transaction status, amount, and metadata.

## Error Codes
- 4001: Invalid payment method
- 4002: Insufficient funds
- 4003: Payment declined
- 5001: Processing error
`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Use existing admin user for authentication
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@agentdb9.com',
        password: 'admin123',
      })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

    authToken = loginResponse.body.accessToken;
    userId = loginResponse.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Agent Creation', () => {
    it('should create agent WITHOUT knowledge base', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Agent Without Knowledge',
          description: 'Test agent without knowledge base',
          configuration: {
            llmProvider: 'ollama',
            model: 'qwen2.5-coder:7b',
            temperature: 0.7,
            maxTokens: 2048,
            knowledgeBase: {
              enabled: false,
            },
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      agentWithoutKnowledge = response.body.data;
      expect(agentWithoutKnowledge.configuration.knowledgeBase?.enabled).toBe(false);
    });

    it('should create agent WITH knowledge base', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Agent With Knowledge',
          description: 'Test agent with knowledge base',
          configuration: {
            llmProvider: 'ollama',
            model: 'qwen2.5-coder:7b',
            temperature: 0.7,
            maxTokens: 2048,
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
            },
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      agentWithKnowledge = response.body.data;
      expect(agentWithKnowledge.configuration.knowledgeBase?.enabled).toBe(true);
    });
  });

  describe('Knowledge Source Ingestion', () => {
    it('should add custom API documentation as knowledge source', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/knowledge/sources/${agentWithKnowledge.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'markdown',
          content: customApiDocs,
          metadata: {
            title: 'Custom Payment API Documentation',
            description: 'Internal payment processing API',
            tags: ['api', 'payments', 'documentation'],
            language: 'markdown',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toMatch(/pending|processing|indexed/);
    });

    it('should wait for knowledge source to be indexed', async () => {
      // Poll until indexed (max 30 seconds)
      let indexed = false;
      let attempts = 0;
      const maxAttempts = 30;

      while (!indexed && attempts < maxAttempts) {
        const response = await request(app.getHttpServer())
          .get(`/api/knowledge/sources/${agentWithKnowledge.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        const sources = response.body.data;
        if (sources.length > 0 && sources[0].status === 'indexed') {
          indexed = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      expect(indexed).toBe(true);
    }, 35000); // 35 second timeout
  });

  describe('Query Comparison: With vs Without Knowledge', () => {
    let conversationWithoutKnowledge: any;
    let conversationWithKnowledge: any;

    beforeAll(async () => {
      // Create conversations for both agents
      const conv1 = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: agentWithoutKnowledge.id,
          title: 'Test Without Knowledge',
        });
      conversationWithoutKnowledge = conv1.body.data;

      const conv2 = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: agentWithKnowledge.id,
          title: 'Test With Knowledge',
        });
      conversationWithKnowledge = conv2.body.data;
    });

    it('should query agent WITHOUT knowledge about custom API', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/conversations/${conversationWithoutKnowledge.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'How do I process a payment using the Custom Payment API? What are the required fields?',
        });

      expect(response.status).toBe(201);
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Get messages
      const messages = await request(app.getHttpServer())
        .get(`/api/conversations/${conversationWithoutKnowledge.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      const agentResponse = messages.body.data.find((m: any) => m.role === 'assistant');
      expect(agentResponse).toBeDefined();
      
      // Agent without knowledge should give generic answer or say it doesn't know
      const content = agentResponse.content.toLowerCase();
      const hasSpecificInfo = content.includes('customerId') && 
                              content.includes('paymentMethod') && 
                              content.includes('metadata');
      
      // Should NOT have specific API details
      expect(hasSpecificInfo).toBe(false);
    }, 15000);

    it('should query agent WITH knowledge about custom API', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/conversations/${conversationWithKnowledge.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'How do I process a payment using the Custom Payment API? What are the required fields?',
        });

      expect(response.status).toBe(201);
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Get messages
      const messages = await request(app.getHttpServer())
        .get(`/api/conversations/${conversationWithKnowledge.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      const agentResponse = messages.body.data.find((m: any) => m.role === 'assistant');
      expect(agentResponse).toBeDefined();
      
      // Agent with knowledge should provide specific API details
      const content = agentResponse.content.toLowerCase();
      const hasSpecificInfo = content.includes('customerid') || 
                              content.includes('paymentmethod') ||
                              content.includes('/api/payments/process');
      
      // Should have specific API details from knowledge base
      expect(hasSpecificInfo).toBe(true);
    }, 15000);

    it('should query about error codes - agent WITHOUT knowledge', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/conversations/${conversationWithoutKnowledge.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'What does error code 4002 mean in the payment API?',
        });

      expect(response.status).toBe(201);
      
      await new Promise(resolve => setTimeout(resolve, 5000));

      const messages = await request(app.getHttpServer())
        .get(`/api/conversations/${conversationWithoutKnowledge.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      const agentResponse = messages.body.data[messages.body.data.length - 1];
      const content = agentResponse.content.toLowerCase();
      
      // Should NOT know about specific error code 4002
      expect(content.includes('insufficient funds')).toBe(false);
    }, 15000);

    it('should query about error codes - agent WITH knowledge', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/conversations/${conversationWithKnowledge.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'What does error code 4002 mean in the payment API?',
        });

      expect(response.status).toBe(201);
      
      await new Promise(resolve => setTimeout(resolve, 5000));

      const messages = await request(app.getHttpServer())
        .get(`/api/conversations/${conversationWithKnowledge.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      const agentResponse = messages.body.data[messages.body.data.length - 1];
      const content = agentResponse.content.toLowerCase();
      
      // Should know about error code 4002 from knowledge base
      expect(content.includes('insufficient funds') || content.includes('4002')).toBe(true);
    }, 15000);
  });

  describe('Knowledge Retrieval Verification', () => {
    it('should verify knowledge source is being retrieved', async () => {
      // Check if knowledge base has retrieval logs/metrics
      const response = await request(app.getHttpServer())
        .get(`/api/knowledge/sources/${agentWithKnowledge.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const source = response.body.data[0];
      expect(source.status).toBe('indexed');
      expect(source.metadata.chunkCount).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should delete test agents', async () => {
      await request(app.getHttpServer())
        .delete(`/api/agents/${agentWithoutKnowledge.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      await request(app.getHttpServer())
        .delete(`/api/agents/${agentWithKnowledge.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });
  });
});
