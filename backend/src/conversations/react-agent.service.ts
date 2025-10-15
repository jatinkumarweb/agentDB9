import { Injectable, Logger } from '@nestjs/common';
import { MCPService } from '../mcp/mcp.service';
import { parseJSON } from '../common/utils/json-parser.util';

interface ReActStep {
  thought?: string;
  action?: string;
  actionInput?: any;
  observation?: string;
  answer?: string;
}

interface ReActResult {
  finalAnswer: string;
  steps: ReActStep[];
  toolsUsed: string[];
}

@Injectable()
export class ReActAgentService {
  private readonly logger = new Logger(ReActAgentService.name);
  private readonly DEFAULT_MAX_ITERATIONS = 5;

  constructor(private readonly mcpService: MCPService) {}

  /**
   * Execute ReAct loop: Reason -> Act -> Observe -> Repeat
   */
  async executeReActLoop(
    userMessage: string,
    systemPrompt: string,
    model: string,
    ollamaUrl: string,
    conversationHistory: any[] = [],
    conversationId?: string,
    progressCallback?: (status: string) => void,
    maxIterations?: number,
    toolExecutionCallback?: (toolName: string, toolResult: any, observation: string) => Promise<void>,
    workingDir?: string
  ): Promise<ReActResult> {
    const MAX_ITERATIONS = maxIterations || this.DEFAULT_MAX_ITERATIONS;
    const steps: ReActStep[] = [];
    const toolsUsed: string[] = [];
    const toolCallHistory = new Set<string>();
    let iteration = 0;
    let currentMessage = userMessage;

    this.logger.log(`🔄 Starting ReAct loop for: "${userMessage.substring(0, 50)}..."`);

    while (iteration < MAX_ITERATIONS) {
      iteration++;
      this.logger.log(`\n🔁 ReAct Iteration ${iteration}/${MAX_ITERATIONS}`);
      
      // Send progress update
      if (progressCallback) {
        progressCallback(`🔄 Analyzing... (step ${iteration}/${MAX_ITERATIONS})`);
      }

      // Call LLM with current context
      const llmResponse = await this.callLLM(
        systemPrompt,
        currentMessage,
        conversationHistory,
        model,
        ollamaUrl
      );

      this.logger.log(`💭 LLM Response: ${llmResponse.substring(0, 200)}...`);

      // Parse response for tool calls
      const toolCall = this.parseToolCall(llmResponse);

      if (!toolCall) {
        // No tool call found - this is the final answer
        this.logger.log(`✅ Final answer received (no tool call)`);
        steps.push({ answer: llmResponse });
        return {
          finalAnswer: llmResponse,
          steps,
          toolsUsed
        };
      }

      // Check for repeated tool calls (infinite loop detection)
      const toolKey = `${toolCall.name}:${JSON.stringify(toolCall.arguments)}`;
      if (toolCallHistory.has(toolKey)) {
        this.logger.warn(`⚠️ Detected repeated tool call: ${toolKey} - Forcing final answer`);
        currentMessage = `You've already called ${toolCall.name} with these exact arguments and received the results.

DO NOT call any more tools. Based on ALL the information you've gathered so far, provide your FINAL ANSWER to the original question now.

Original Question: ${userMessage}

Provide a complete answer based on the data you already have.`;
        continue; // Skip to next iteration which should give final answer
      }
      toolCallHistory.add(toolKey);

      // Tool call found - execute it
      this.logger.log(`🔧 Tool call detected: ${toolCall.name}`);
      
      // Send progress update
      if (progressCallback) {
        progressCallback(`🔧 Executing: ${toolCall.name}...`);
      }
      
      steps.push({
        thought: `Using ${toolCall.name}...`,
        action: toolCall.name,
        actionInput: toolCall.arguments
      });
      toolsUsed.push(toolCall.name);

      // Execute tool with working directory
      const toolResult = await this.mcpService.executeTool({
        name: toolCall.name,
        arguments: toolCall.arguments
      }, workingDir);

      const observation = toolResult.success
        ? JSON.stringify(toolResult.result, null, 2)
        : `Error: ${toolResult.error}`;

      this.logger.log(`👁️ Observation: ${observation.substring(0, 200)}...`);
      steps.push({ observation });
      
      // Call tool execution callback if provided (for memory saving)
      if (toolExecutionCallback) {
        await toolExecutionCallback(toolCall.name, toolResult, observation);
      }

      // Prepare next message with tool result
      currentMessage = this.buildFollowUpPrompt(userMessage, toolCall, observation);
      
      // Add to conversation history
      conversationHistory.push({
        role: 'assistant',
        content: `Tool: ${toolCall.name}\nResult: ${observation}`
      });
    }

    // Max iterations reached
    this.logger.warn(`⚠️ Max iterations (${MAX_ITERATIONS}) reached`);
    return {
      finalAnswer: 'I apologize, but I reached the maximum number of steps while processing your request. Please try rephrasing your question.',
      steps,
      toolsUsed
    };
  }

  /**
   * Call LLM with current context
   */
  private async callLLM(
    systemPrompt: string,
    userMessage: string,
    history: any[],
    model: string,
    ollamaUrl: string
  ): Promise<string> {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage }
    ];

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false, // Non-streaming for ReAct
        options: {
          temperature: 0.3,
          top_p: 0.8,
          num_predict: 1024
        }
      })
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    return data.message?.content || '';
  }

  /**
   * Parse tool call from LLM response (JSON format with jsonrepair)
   */
  private parseToolCall(content: string): { name: string; arguments: any } | null {
    this.logger.log(`🔍 Parsing tool call from response (${content.length} chars)`);
    
    // Try JSON format with TOOL_CALL: marker
    const jsonMarkerRegex = /TOOL_CALL:\s*(\{[\s\S]*?\})\s*(?:\n|$)/;
    let match = content.match(jsonMarkerRegex);
    
    if (match) {
      this.logger.log('✅ Found TOOL_CALL: marker with JSON');
      const jsonStr = match[1].trim();
      
      try {
        // Use jsonrepair to fix common JSON errors
        const toolCallData = parseJSON(jsonStr);
        
        if (toolCallData && toolCallData.tool) {
          this.logger.log(`✅ Successfully parsed JSON tool call: ${toolCallData.tool}`);
          return {
            name: toolCallData.tool,
            arguments: toolCallData.arguments || {}
          };
        }
      } catch (error) {
        this.logger.error('❌ Failed to parse JSON tool call:', error);
      }
    }
    
    // Fallback: Try to find JSON object without marker
    if (!match) {
      const jsonObjectRegex = /\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*\{[\s\S]*?\}\s*\}/;
      match = content.match(jsonObjectRegex);
      
      if (match) {
        this.logger.log('✅ Found JSON object without marker');
        try {
          const toolCallData = parseJSON(match[0]);
          if (toolCallData && toolCallData.tool) {
            return {
              name: toolCallData.tool,
              arguments: toolCallData.arguments || {}
            };
          }
        } catch (error) {
          this.logger.error('❌ Failed to parse JSON object:', error);
        }
      }
    }
    
    // Legacy fallback: Try XML format for backward compatibility
    if (!match) {
      this.logger.log('⚠️ Trying legacy XML format...');
      const xmlRegex = /<tool_call>\s*<tool_name>(.*?)<\/tool_name>\s*<arguments>(.*?)<\/arguments>\s*<\/tool_call>/s;
      const xmlMatch = content.match(xmlRegex);

      if (xmlMatch) {
        const name = xmlMatch[1].trim();
        const argsJson = xmlMatch[2].trim();
        this.logger.log(`✅ Found XML tool call: ${name}`);
        const args = parseJSON(argsJson);
        
        if (args) {
          return { name, arguments: args };
        }
      }
    }

    this.logger.log('❌ No tool call pattern matched');
    return null;
  }

  /**
   * Build follow-up prompt with tool result
   */
  private buildFollowUpPrompt(
    originalQuestion: string,
    toolCall: { name: string; arguments: any },
    observation: string
  ): string {
    // For workspace summary, we have comprehensive data - encourage final answer
    if (toolCall.name === 'get_workspace_summary') {
      return `WORKSPACE DATA RECEIVED - Answer the question now.

Question: ${originalQuestion}

Complete Workspace Data:
${observation}

DO NOT use any more tools. Provide your final answer based on this data.`;
    }
    
    return `Tool Result: ${observation}

Original Question: ${originalQuestion}

Decide your next action:
1. Need more info or another action? → Output ONLY the JSON tool call (no text before/after)
2. Have enough info? → Provide final answer (text only, no JSON)

CRITICAL: If using a tool, output ONLY JSON with TOOL_CALL: marker - NO explanations.
Example:
TOOL_CALL:
{"tool": "write_file", "arguments": {"path": "App.jsx", "content": "..."}}`;
  }

  /**
   * Execute ReAct with custom configuration for agent service
   */
  async executeWithReAct(
    userMessage: string,
    model: string,
    systemPrompt: string,
    context: any,
    maxIterations: number = 5
  ): Promise<string> {
    const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
    
    try {
      const result = await this.executeReActLoop(
        userMessage,
        systemPrompt,
        model,
        ollamaUrl,
        [],
        context.conversationId,
        undefined,
        maxIterations
      );
      
      return result.finalAnswer;
    } catch (error) {
      this.logger.error('Error in executeWithReAct:', error);
      throw error;
    }
  }
}
