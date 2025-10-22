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

// Use minimal logging in development, only errors in production
const logFormat = process.env.NODE_ENV === 'production' ? 'tiny' : 'dev';
const shouldLog = process.env.LOG_LEVEL !== 'silent';
if (shouldLog) {
  app.use(morgan(logFormat));
}

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

// Helper function to get user's API key for a provider
async function getUserApiKey(userId: string, provider: string): Promise<string | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8000';
    const url = `${backendUrl}/api/providers/key/${provider}?userId=${userId}`;
    
    console.log('[LLM Service] Fetching API key for provider:', provider, 'userId:', userId);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json() as { data?: { apiKey: string } };
      return data.data?.apiKey || null;
    }
    
    return null;
  } catch (error) {
    console.error('[LLM Service] Failed to fetch API key:', error);
    return null;
  }
}

// Helper function to call external APIs
async function callExternalAPI(provider: string, model: string, messages: any[], apiKey: string, options: any): Promise<any> {
  switch (provider) {
    case 'openai':
      return await callOpenAI(model, messages, apiKey, options);
    case 'anthropic':
      return await callAnthropic(model, messages, apiKey, options);
    default:
      throw new Error(`Provider ${provider} not supported`);
  }
}

// Helper function to call external APIs with streaming
async function callExternalAPIStreaming(provider: string, model: string, messages: any[], apiKey: string, options: any): Promise<ReadableStream> {
  switch (provider) {
    case 'openai':
      return await callOpenAIStreaming(model, messages, apiKey, options);
    case 'anthropic':
      return await callAnthropicStreaming(model, messages, apiKey, options);
    default:
      throw new Error(`Provider ${provider} not supported for streaming`);
  }
}

// Call OpenAI API
async function callOpenAI(model: string, messages: any[], apiKey: string, options: any): Promise<any> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 500
    })
  });
  
  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(error.error?.message || 'OpenAI API error');
  }
  
  const data = await response.json() as any;
  
  return {
    response: data.choices[0]?.message?.content || '',
    message: data.choices[0]?.message?.content || '',
    model: data.model,
    done: true,
    usage: {
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0,
      total_tokens: data.usage?.total_tokens || 0
    }
  };
}

// Call OpenAI API with streaming
async function callOpenAIStreaming(model: string, messages: any[], apiKey: string, options: any): Promise<ReadableStream> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 500,
      stream: true
    })
  });
  
  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(error.error?.message || 'OpenAI API error');
  }
  
  return response.body!;
}

// Call Anthropic API
async function callAnthropic(model: string, messages: any[], apiKey: string, options: any): Promise<any> {
  // Convert messages format for Anthropic
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      messages: userMessages,
      system: systemMessage?.content,
      max_tokens: options.max_tokens || 500,
      temperature: options.temperature || 0.7
    })
  });
  
  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(error.error?.message || 'Anthropic API error');
  }
  
  const data = await response.json() as any;
  
  return {
    response: data.content[0]?.text || '',
    message: data.content[0]?.text || '',
    model: data.model,
    done: true,
    usage: {
      prompt_tokens: data.usage?.input_tokens || 0,
      completion_tokens: data.usage?.output_tokens || 0,
      total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
    }
  };
}

// Call Anthropic API with streaming
async function callAnthropicStreaming(model: string, messages: any[], apiKey: string, options: any): Promise<ReadableStream> {
  // Convert messages format for Anthropic
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      messages: userMessages,
      system: systemMessage?.content,
      max_tokens: options.max_tokens || 500,
      temperature: options.temperature || 0.7,
      stream: true
    })
  });
  
  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(error.error?.message || 'Anthropic API error');
  }
  
  return response.body!;
}

// Helper function to check API key status from backend
async function checkProviderStatus(userId?: string): Promise<Record<string, boolean>> {
  console.log('[LLM Service] checkProviderStatus called with userId:', userId);
  
  if (!userId) {
    console.log('[LLM Service] No userId provided, returning all as unconfigured');
    return {
      openai: false,
      anthropic: false,
      cohere: false,
      huggingface: false,
    };
  }
  
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8000';
    const url = `${backendUrl}/api/providers/status?userId=${userId}`;
    console.log('[LLM Service] Fetching provider status from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[LLM Service] Provider status response status:', response.status);
    
    if (response.ok) {
      const data = await response.json() as { data?: Record<string, boolean> };
      console.log('[LLM Service] Provider status data:', JSON.stringify(data));
      return data.data || {};
    } else {
      const errorText = await response.text();
      console.error('[LLM Service] Provider status request failed:', response.status, errorText);
    }
  } catch (error) {
    console.error('[LLM Service] Failed to fetch provider status from backend:', error);
  }
  
  // Fallback: return all as unconfigured
  console.log('[LLM Service] Falling back to all providers unconfigured');
  return {
    openai: false,
    anthropic: false,
    cohere: false,
    huggingface: false,
  };
}

// Model availability endpoint
app.get('/api/models', async (req, res) => {
  try {
    const { getAvailableModels, getDisabledModels } = await import('@agentdb9/shared');
    
    const availableModels = getAvailableModels();
    const disabledModels = getDisabledModels();
    
    // Check Ollama availability
    const ollamaStatus = await checkOllamaAvailability();
    
    // Check provider API key status from backend (userId from query param)
    const userId = req.query.userId as string;
    console.log('[LLM Service] /api/models called with userId:', userId);
    
    const providerStatus = await checkProviderStatus(userId);
    console.log('[LLM Service] Provider status received:', JSON.stringify(providerStatus));
    
    const models = [
      ...availableModels.map(model => {
        if (model.provider === 'ollama') {
          // Check if this specific model is downloaded in Ollama
          // Match both exact model ID and :latest variant
          const modelBase = model.id.split(':')[0]; // e.g., "llama3.1" from "llama3.1:8b"
          const isDownloaded = ollamaStatus.downloadedModels.some((downloaded: string) => {
            // Exact match or base name match with :latest
            return downloaded === model.id || 
                   (downloaded.startsWith(modelBase + ':') && downloaded.includes(':latest'));
          });
          
          return {
            id: model.id,
            name: model.name,
            provider: model.provider,
            status: isDownloaded ? 'available' : 'unavailable',
            reason: isDownloaded ? 'Downloaded in Ollama' : 
                   ollamaStatus.available ? 'Not downloaded in Ollama' : 'Ollama service not available',
            requiresApiKey: false,
            apiKeyConfigured: true,
          };
        } else {
          // Check API key status from backend for external providers
          const apiKeyConfigured = providerStatus[model.provider] || false;
          const requiresApiKey = model.availability.requiresApiKey;
          
          return {
            id: model.id,
            name: model.name,
            provider: model.provider,
            status: requiresApiKey && !apiKeyConfigured ? 'disabled' : 'available',
            reason: requiresApiKey && !apiKeyConfigured ? 'API key not configured' : 'API key configured',
            requiresApiKey: requiresApiKey,
            apiKeyConfigured: apiKeyConfigured
          };
        }
      }),
      ...disabledModels.map(model => {
        // Check API key status from backend for external providers
        const apiKeyConfigured = model.provider !== 'ollama' ? (providerStatus[model.provider] || false) : true;
        const requiresApiKey = model.availability.requiresApiKey;
        
        return {
          id: model.id,
          name: model.name,
          provider: model.provider,
          status: requiresApiKey && !apiKeyConfigured ? 'disabled' : model.availability.status,
          reason: requiresApiKey && !apiKeyConfigured ? 'API key not configured' : model.availability.reason,
          requiresApiKey: requiresApiKey,
          apiKeyConfigured: apiKeyConfigured
        };
      })
    ];

    const availableCount = models.filter(m => m.status === 'available').length;
    const unavailableCount = models.filter(m => m.status === 'unavailable').length;
    const disabledCount = models.filter(m => m.status === 'disabled' || m.status === 'error').length;
    const unknownCount = models.filter(m => m.status === 'unknown').length;

    res.json({
      success: true,
      data: {
        models,
        available: availableCount,
        unavailable: unavailableCount,
        disabled: disabledCount,
        unknown: unknownCount,
        timestamp: new Date().toISOString()
      }
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

        const ollamaData = await ollamaResponse.json() as any;
        
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
      } catch (ollamaError: any) {
        console.error('Ollama generation error:', ollamaError);
        return res.status(500).json({
          success: false,
          error: 'Ollama service unavailable',
          details: ollamaError?.message || 'Unknown error'
        });
      }
    }
    
    // Handle external API models (OpenAI, Anthropic, etc.)
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required for external API models'
      });
    }
    
    // Get user's API key for this provider
    const apiKey = await getUserApiKey(userId, model.provider);
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: `API key not configured for ${model.provider}`,
        requiresApiKey: true
      });
    }
    
    try {
      // Build messages array from request
      const messages = request.messages || [
        { role: 'system', content: request.systemPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: request.prompt }
      ];
      
      // Call external API
      const result = await callExternalAPI(
        model.provider,
        model.id,
        messages,
        apiKey,
        {
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 1024
        }
      );
      
      const response: LLMResponse = {
        content: result.response || result.message || '',
        modelId: model.id,
        provider: model.provider,
        usage: result.usage || {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }
      };
      
      const apiResponse: APIResponse<LLMResponse> = {
        success: true,
        data: response,
        message: 'Generated successfully'
      };
      
      return res.json(apiResponse);
    } catch (externalError: any) {
      console.error(`External API (${model.provider}) generation error:`, externalError);
      return res.status(500).json({
        success: false,
        error: `${model.provider} API error`,
        details: externalError?.message || 'Unknown error'
      });
    }
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
    } catch (ollamaError: any) {
      console.error('Ollama streaming error:', ollamaError);
      res.write(`data: ${JSON.stringify({ error: ollamaError?.message || 'Unknown error' })}\n\n`);
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

// Chat endpoint (compatible with agent service)
app.post('/api/chat', async (req, res) => {
  try {
    const { model, messages, stream, temperature, max_tokens } = req.body;
    const userId = req.query.userId as string;
    const { getModelById } = await import('@agentdb9/shared');
    
    console.log('[LLM Service] /api/chat called with model:', model, 'userId:', userId, 'stream:', stream);
    
    // Get model info
    const modelInfo = getModelById(model || 'codellama:7b');
    
    if (!modelInfo) {
      return res.status(400).json({
        success: false,
        error: 'Model not found'
      });
    }
    
    // Check if this is an Ollama model
    if (modelInfo.provider === 'ollama') {
      const ollamaUrl = process.env.OLLAMA_HOST || 'http://ollama:11434';
      
      try {
        const ollamaResponse = await fetch(`${ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model,
            messages: messages || [{ role: 'user', content: 'Hello' }],
            stream: stream || false,
            options: {
              temperature: temperature || 0.7,
              top_p: 0.8,
              num_predict: max_tokens || 500
            }
          })
        });

        if (!ollamaResponse.ok) {
          throw new Error(`Ollama API error: ${ollamaResponse.status}`);
        }

        const ollamaData = await ollamaResponse.json() as any;
        
        return res.json({
          response: ollamaData.message?.content || '',
          message: ollamaData.message?.content || '',
          model: model,
          done: ollamaData.done,
          usage: {
            prompt_tokens: ollamaData.prompt_eval_count || 0,
            completion_tokens: ollamaData.eval_count || 0,
            total_tokens: (ollamaData.prompt_eval_count || 0) + (ollamaData.eval_count || 0)
          }
        });
      } catch (ollamaError: any) {
        console.error('Ollama chat error:', ollamaError);
        return res.status(500).json({
          success: false,
          error: 'Ollama service unavailable',
          details: ollamaError?.message || 'Unknown error'
        });
      }
    }
    
    // For external API models, fetch user's API key and call the provider
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required for external API models',
        message: 'Please provide userId to use external API models'
      });
    }
    
    // Get user's API key for this provider
    const apiKey = await getUserApiKey(userId, modelInfo.provider);
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key not configured',
        message: `Please configure your ${modelInfo.provider} API key in settings`
      });
    }
    
    // Call the appropriate external API
    try {
      if (stream) {
        // Set up streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        
        const streamBody = await callExternalAPIStreaming(modelInfo.provider, model, messages, apiKey, {
          temperature,
          max_tokens
        });
        
        const reader = streamBody.getReader();
        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              // Handle SSE format from external APIs
              if (line.startsWith('data: ')) {
                const data = line.substring(6);
                if (data === '[DONE]') {
                  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                  continue;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  
                  // Transform to our format
                  let content = '';
                  if (modelInfo.provider === 'openai') {
                    content = parsed.choices?.[0]?.delta?.content || '';
                  } else if (modelInfo.provider === 'anthropic') {
                    if (parsed.type === 'content_block_delta') {
                      content = parsed.delta?.text || '';
                    }
                  }
                  
                  if (content) {
                    res.write(`data: ${JSON.stringify({ 
                      content, 
                      done: false,
                      model: model
                    })}\n\n`);
                  }
                } catch (parseError) {
                  console.error('Failed to parse streaming chunk:', data);
                }
              }
            }
          }
          
          res.end();
        } finally {
          reader.releaseLock();
        }
      } else {
        // Non-streaming response
        const externalResponse = await callExternalAPI(modelInfo.provider, model, messages, apiKey, {
          temperature,
          max_tokens
        });
        
        return res.json(externalResponse);
      }
    } catch (apiError: any) {
      console.error(`${modelInfo.provider} API error:`, apiError);
      return res.status(500).json({
        success: false,
        error: `${modelInfo.provider} API error`,
        details: apiError.message
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat request'
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