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
    const { getAvailableModels, getDisabledModels } = await import('@agentdb9/shared');
    
    const availableModels = getAvailableModels();
    const disabledModels = getDisabledModels();
    
    const models = [
      ...availableModels.map(model => ({
        id: model.id,
        provider: model.provider,
        status: model.availability.status,
        reason: model.availability.reason,
        requiresApiKey: model.availability.requiresApiKey,
        apiKeyConfigured: model.availability.apiKeyConfigured
      })),
      ...disabledModels.map(model => ({
        id: model.id,
        provider: model.provider,
        status: model.availability.status,
        reason: model.availability.reason,
        requiresApiKey: model.availability.requiresApiKey,
        apiKeyConfigured: model.availability.apiKeyConfigured
      }))
    ];

    res.json({
      success: true,
      models,
      available: availableModels.length,
      disabled: disabledModels.length,
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
    const { getModelById } = await import('@agentdb9/shared');
    
    // Check if model is available
    const model = getModelById(request.modelId || 'codellama:7b');
    
    if (!model) {
      return res.status(400).json({
        success: false,
        error: 'Model not found'
      });
    }
    
    if (model.availability.status === 'disabled') {
      return res.status(400).json({
        success: false,
        error: 'Model is disabled',
        reason: model.availability.reason,
        requiresApiKey: model.availability.requiresApiKey,
        apiKeyConfigured: model.availability.apiKeyConfigured
      });
    }
    
    // Mock LLM response for now
    const response: LLMResponse = {
      content: `Mock response from ${model.name} to: ${request.prompt}`,
      modelId: model.id,
      provider: model.provider,
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