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
  private readonly MAX_ITERATIONS = 5; // Allow more iterations for complex queries

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
    progressCallback?: (status: string) => void
  ): Promise<ReActResult> {
    const steps: ReActStep[] = [];
    const toolsUsed: string[] = [];
    let iteration = 0;
    let currentMessage = userMessage;

    this.logger.log(`🔄 Starting ReAct loop for: "${userMessage.substring(0, 50)}..."`);

    while (iteration < this.MAX_ITERATIONS) {
      iteration++;
      this.logger.log(`\n🔁 ReAct Iteration ${iteration}/${this.MAX_ITERATIONS}`);
      
      // Send progress update
      if (progressCallback) {
        progressCallback(`🔄 Analyzing... (step ${iteration}/${this.MAX_ITERATIONS})`);
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

      // Execute tool
      const toolResult = await this.mcpService.executeTool({
        name: toolCall.name,
        arguments: toolCall.arguments
      });

      const observation = toolResult.success
        ? JSON.stringify(toolResult.result, null, 2)
        : `Error: ${toolResult.error}`;

      this.logger.log(`👁️ Observation: ${observation.substring(0, 200)}...`);
      steps.push({ observation });

      // Prepare next message with tool result
      currentMessage = this.buildFollowUpPrompt(userMessage, toolCall, observation);
      
      // Add to conversation history
      conversationHistory.push({
        role: 'assistant',
        content: `Tool: ${toolCall.name}\nResult: ${observation}`
      });
    }

    // Max iterations reached
    this.logger.warn(`⚠️ Max iterations (${this.MAX_ITERATIONS}) reached`);
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
   * Parse tool call from LLM response
   */
  private parseToolCall(content: string): { name: string; arguments: any } | null {
    this.logger.log(`🔍 Parsing tool call from response (${content.length} chars)`);
    
    // Try XML format: <tool_call><tool_name>...</tool_name><arguments>...</arguments></tool_call>
    const xmlRegex = /<tool_call>\s*<tool_name>(.*?)<\/tool_name>\s*<arguments>(.*?)<\/arguments>\s*<\/tool_call>/s;
    const xmlMatch = content.match(xmlRegex);

    if (xmlMatch) {
      const name = xmlMatch[1].trim();
      const argsJson = xmlMatch[2].trim();
      this.logger.log(`✅ Found XML tool call: ${name} with args: ${argsJson}`);
      const args = parseJSON(argsJson);
      
      if (args) {
        return { name, arguments: args };
      } else {
        this.logger.warn(`❌ Failed to parse arguments JSON: ${argsJson}`);
      }
    } else {
      this.logger.log(`❌ No XML tool call found in response`);
    }

    // Try alternative format
    const altRegex = /<tool_call>\s*<(\w+)>.*?<\/\1>\s*<arguments>(.*?)<\/arguments>\s*<\/tool_call>/s;
    const altMatch = content.match(altRegex);

    if (altMatch) {
      const name = altMatch[1].trim();
      const argsJson = altMatch[2].trim();
      this.logger.log(`✅ Found alternative XML tool call: ${name}`);
      const args = parseJSON(argsJson);
      
      if (args) {
        return { name, arguments: args };
      }
    }

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
1. Need more info or another action? → Output ONLY the XML tool call (no text before/after)
2. Have enough info? → Provide final answer (text only, no XML)

CRITICAL: If using a tool, output ONLY XML - NO explanations.
Example: <tool_call><tool_name>write_file</tool_name><arguments>{"path": "App.jsx", "content": "..."}</arguments></tool_call>`;
  }
}
