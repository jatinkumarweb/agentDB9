import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { LLMRequest, LLMResponse, APIResponse } from '@agentdb9/shared';

const app = express();
const PORT = process.env.PORT || 9000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'AgentDB9 LLM Service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    providers: {
      ollama: process.env.OLLAMA_HOST || 'http://ollama:11434',
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      huggingface: !!process.env.HUGGINGFACE_API_KEY
    }
  });
});

// Model availability endpoint
app.get('/api/models', async (req, res) => {
  try {
    const models = [
      { id: 'codellama:7b', provider: 'ollama', status: 'available' },
      { id: 'codellama:13b', provider: 'ollama', status: 'available' },
      { id: 'deepseek-coder:6.7b', provider: 'ollama', status: 'available' },
      { id: 'mistral:7b', provider: 'ollama', status: 'available' },
      { id: 'gpt-4', provider: 'openai', status: process.env.OPENAI_API_KEY ? 'available' : 'unavailable' },
      { id: 'claude-3-sonnet', provider: 'anthropic', status: process.env.ANTHROPIC_API_KEY ? 'available' : 'unavailable' }
    ];

    res.json({
      success: true,
      models,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get models'
    });
  }
});

// Test model endpoint
app.post('/api/test/model', async (req, res) => {
  try {
    const { modelId, provider } = req.body;
    const testPrompt = 'Hello, this is a test. Please respond with "Test successful".';
    
    // Mock model test - in real implementation, test actual model
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000)); // Simulate model response time
    const responseTime = Date.now() - startTime;
    
    const mockResponse = `Test successful. Model ${modelId} is working correctly.`;
    
    res.json({
      success: true,
      modelId,
      provider,
      available: true,
      responseTime,
      testPrompt,
      response: mockResponse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Model test failed'
    });
  }
});

// LLM inference endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const request: LLMRequest = req.body;
    
    // Mock LLM response for now
    const response: LLMResponse = {
      content: `Mock response to: ${request.prompt}`,
      usage: {
        promptTokens: request.prompt.length / 4,
        completionTokens: 50,
        totalTokens: (request.prompt.length / 4) + 50
      }
    };

    const apiResponse: APIResponse<LLMResponse> = {
      success: true,
      data: response,
      message: 'Generated successfully'
    };

    res.json(apiResponse);
  } catch (error) {
    console.error('LLM generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate response'
    });
  }
});

// Code analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { code, language } = req.body;
    
    // Mock analysis response
    const analysis = {
      complexity: 'medium',
      suggestions: [
        'Consider adding error handling',
        'Add type annotations',
        'Extract reusable functions'
      ],
      metrics: {
        lines: code.split('\n').length,
        functions: (code.match(/function|=>/g) || []).length
      }
    };

    res.json({
      success: true,
      data: analysis,
      message: 'Code analyzed successfully'
    });
  } catch (error) {
    console.error('Code analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze code'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 LLM Service running on port ${PORT}`);
  console.log(`🧠 AI processing ready`);
});