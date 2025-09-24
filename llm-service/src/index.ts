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
    timestamp: new Date().toISOString()
  });
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