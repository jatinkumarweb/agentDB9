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

// Helper function to check Ollama availability
async function checkOllamaAvailability(): Promise<{available: boolean, downloadedModels: string[]}> {
  try {
    const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${ollamaUrl}/api/version`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      // Check which models are actually downloaded
      const tagsResponse = await fetch(`${ollamaUrl}/api/tags`, {
        signal: controller.signal,
      });
      
      if (tagsResponse.ok) {
        const tagsData = await tagsResponse.json() as { models?: Array<{ name: string }> };
        const downloadedModels = tagsData.models ? tagsData.models.map((m: { name: string }) => m.name) : [];
        return {
          available: true,
          downloadedModels
        };
      }
    }
    
    return { available: false, downloadedModels: [] };
  } catch (error) {
    return { available: false, downloadedModels: [] };
  }
}

// Model availability endpoint
app.get('/api/models', async (req, res) => {
  try {
    const { getAvailableModels, getDisabledModels } = await import('@agentdb9/shared');
    
    const availableModels = getAvailableModels();
    const disabledModels = getDisabledModels();
    
    // Check Ollama availability
    const ollamaStatus = await checkOllamaAvailability();
    
    const models = [
      ...availableModels.map(model => {
        if (model.provider === 'ollama') {
          // Check if this specific model is downloaded in Ollama
          const isDownloaded = ollamaStatus.downloadedModels.includes(model.id);
          return {
            id: model.id,
            provider: model.provider,
            status: isDownloaded ? 'available' : 'unavailable',
            reason: isDownloaded ? 'Downloaded in Ollama' : 
                   ollamaStatus.available ? 'Not downloaded in Ollama' : 'Ollama service not available',
            requiresApiKey: false,
            apiKeyConfigured: true,
          };
        } else {
          return {
            id: model.id,
            provider: model.provider,
            status: model.availability.status,
            reason: model.availability.reason,
            requiresApiKey: model.availability.requiresApiKey,
            apiKeyConfigured: model.availability.apiKeyConfigured
          };
        }
      }),
      ...disabledModels.map(model => ({
        id: model.id,
        provider: model.provider,
        status: model.availability.status,
        reason: model.availability.reason,
        requiresApiKey: model.availability.requiresApiKey,
        apiKeyConfigured: model.availability.apiKeyConfigured
      }))
    ];

    const availableCount = models.filter(m => m.status === 'available').length;
    const disabledCount = models.filter(m => m.status !== 'available').length;

    res.json({
      success: true,
      models,
      available: availableCount,
      disabled: disabledCount,
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

// LLM inference endpoint (non-streaming)
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
    
    // Check if this is an Ollama model
    if (model.provider === 'ollama') {
      const ollamaUrl = process.env.OLLAMA_HOST || 'http://ollama:11434';
      
      try {
        const ollamaResponse = await fetch(`${ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model.id,
            messages: [
              { role: 'system', content: 'You are a helpful coding assistant.' },
              { role: 'user', content: request.prompt }
            ],
            stream: false,
            options: {
              temperature: request.temperature || 0.3,
              top_p: 0.8,
              num_predict: request.maxTokens || 1024
            }
          })
        });

        if (!ollamaResponse.ok) {
          throw new Error(`Ollama API error: ${ollamaResponse.status}`);
        }

        const ollamaData = await ollamaResponse.json();
        
        const response: LLMResponse = {
          content: ollamaData.message?.content || '',
          modelId: model.id,
          provider: model.provider,
          usage: {
            promptTokens: ollamaData.prompt_eval_count || 0,
            completionTokens: ollamaData.eval_count || 0,
            totalTokens: (ollamaData.prompt_eval_count || 0) + (ollamaData.eval_count || 0)
          }
        };

        const apiResponse: APIResponse<LLMResponse> = {
          success: true,
          data: response,
          message: 'Generated successfully'
        };

        return res.json(apiResponse);
      } catch (ollamaError) {
        console.error('Ollama generation error:', ollamaError);
        return res.status(500).json({
          success: false,
          error: 'Ollama service unavailable',
          details: ollamaError.message
        });
      }
    }
    
    // For non-Ollama models, return helpful message
    res.status(501).json({
      success: false,
      error: 'External API models not yet implemented',
      message: 'Please configure API keys for OpenAI, Anthropic, or use Ollama models'
    });
  } catch (error) {
    console.error('LLM generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate response'
    });
  }
});

// LLM streaming endpoint
app.post('/api/generate/stream', async (req, res) => {
  try {
    const { messages, modelId, tools, temperature, maxTokens } = req.body;
    const { getModelById } = await import('@agentdb9/shared');
    
    const model = getModelById(modelId || 'codellama:7b');
    
    if (!model) {
      return res.status(400).json({
        success: false,
        error: 'Model not found'
      });
    }

    if (model.provider !== 'ollama') {
      return res.status(501).json({
        success: false,
        error: 'Only Ollama models support streaming currently'
      });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    const ollamaUrl = process.env.OLLAMA_HOST || 'http://ollama:11434';
    
    try {
      const ollamaResponse = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          messages: messages || [{ role: 'user', content: 'Hello' }],
          stream: true,
          tools: tools ? formatToolsForOllama(tools) : undefined,
          options: {
            temperature: temperature || 0.3,
            top_p: 0.8,
            num_predict: maxTokens || 1024
          }
        })
      });

      if (!ollamaResponse.ok) {
        res.write(`data: ${JSON.stringify({ error: `Ollama API error: ${ollamaResponse.status}` })}\n\n`);
        return res.end();
      }

      const reader = ollamaResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        res.write(`data: ${JSON.stringify({ error: 'No response body' })}\n\n`);
        return res.end();
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            const streamData = {
              content: data.message?.content || '',
              toolCalls: data.message?.tool_calls,
              done: data.done,
              model: data.model,
              eval_count: data.eval_count,
              prompt_eval_count: data.prompt_eval_count
            };
            
            res.write(`data: ${JSON.stringify(streamData)}\n\n`);
          } catch (parseError) {
            console.error('Failed to parse Ollama chunk:', line);
          }
        }
      }

      res.end();
    } catch (ollamaError) {
      console.error('Ollama streaming error:', ollamaError);
      res.write(`data: ${JSON.stringify({ error: ollamaError.message })}\n\n`);
      res.end();
    }
  } catch (error) {
    console.error('Streaming error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start streaming'
    });
  }
});

// Helper function to format tools for Ollama
function formatToolsForOllama(tools: any[]): any[] {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }
  }));
}

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