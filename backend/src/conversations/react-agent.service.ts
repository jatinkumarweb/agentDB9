import { Injectable, Logger } from '@nestjs/common';
import { MCPService } from '../mcp/mcp.service';
import { parseJSON } from '../common/utils/json-parser.util';
import { TaskPlan, TaskMilestone, TaskProgressUpdate } from '../common/interfaces/approval.interface';
import { generateId } from '@agentdb9/shared';

interface ReActStep {
  thought?: string;
  action?: string;
  actionInput?: any;
  observation?: string;
  answer?: string;
  milestoneId?: string;
}

interface ReActResult {
  finalAnswer: string;
  steps: ReActStep[];
  toolsUsed: string[];
  taskPlan?: TaskPlan;
  milestonesCompleted?: number;
}

@Injectable()
export class ReActAgentService {
  private readonly logger = new Logger(ReActAgentService.name);
  private readonly DEFAULT_MAX_ITERATIONS = 5;

  constructor(private readonly mcpService: MCPService) {}

  /**
   * Execute ReAct loop with task planning: Reason -> Act -> Observe -> Repeat
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
    workingDir?: string,
    agentId?: string,
    enableTaskPlanning: boolean = true
  ): Promise<ReActResult> {
    const MAX_ITERATIONS = maxIterations || this.DEFAULT_MAX_ITERATIONS;
    const steps: ReActStep[] = [];
    const toolsUsed: string[] = [];
    const toolCallHistory = new Set<string>();
    let iteration = 0;
    let currentMessage = userMessage;
    let taskPlan: TaskPlan | undefined;
    let currentMilestoneIndex = 0;

    this.logger.log(`🔄 Starting ReAct loop for: "${userMessage.substring(0, 50)}..."`);

    // Step 1: Generate task plan if enabled
    if (enableTaskPlanning && this.shouldGenerateTaskPlan(userMessage)) {
      this.logger.log(`📋 Generating task plan...`);
      if (progressCallback) {
        progressCallback(`📋 Planning task...`);
      }
      
      taskPlan = await this.generateTaskPlan(
        userMessage,
        systemPrompt,
        model,
        ollamaUrl
      );
      
      if (taskPlan && progressCallback) {
        // Send task plan to user
        const planUpdate: TaskProgressUpdate = {
          type: 'plan',
          taskPlanId: taskPlan.id,
          objective: taskPlan.objective,
          totalSteps: taskPlan.estimatedSteps,
          message: `📋 Task Plan:\n${taskPlan.objective}\n\nMilestones:\n${taskPlan.milestones.map((m, i) => `${i + 1}. ${m.title}`).join('\n')}`,
          timestamp: new Date(),
          metadata: { taskPlan }
        };
        progressCallback(JSON.stringify(planUpdate));
      }
    }

    while (iteration < MAX_ITERATIONS) {
      iteration++;
      this.logger.log(`\n🔁 ReAct Iteration ${iteration}/${MAX_ITERATIONS}`);
      
      // Update milestone if we have a task plan
      if (taskPlan && currentMilestoneIndex < taskPlan.milestones.length) {
        const currentMilestone = taskPlan.milestones[currentMilestoneIndex];
        if (currentMilestone.status === 'pending') {
          this.updateMilestoneStatus(taskPlan, currentMilestoneIndex, 'in_progress', progressCallback);
        }
      }
      
      // Send progress update
      if (progressCallback && !taskPlan) {
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
        
        // Mark current milestone as completed if we have a task plan
        if (taskPlan && currentMilestoneIndex < taskPlan.milestones.length) {
          this.updateMilestoneStatus(taskPlan, currentMilestoneIndex, 'completed', progressCallback);
        }
        
        steps.push({ answer: llmResponse });
        return {
          finalAnswer: llmResponse,
          steps,
          toolsUsed,
          taskPlan,
          milestonesCompleted: taskPlan ? taskPlan.milestones.filter(m => m.status === 'completed').length : 0
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
      
      const stepData: ReActStep = {
        thought: `Using ${toolCall.name}...`,
        action: toolCall.name,
        actionInput: toolCall.arguments,
        milestoneId: taskPlan && currentMilestoneIndex < taskPlan.milestones.length 
          ? taskPlan.milestones[currentMilestoneIndex].id 
          : undefined
      };
      steps.push(stepData);
      toolsUsed.push(toolCall.name);

      // Send progress update for tool execution
      if (progressCallback) {
        if (taskPlan && currentMilestoneIndex < taskPlan.milestones.length) {
          const milestone = taskPlan.milestones[currentMilestoneIndex];
          progressCallback(JSON.stringify({
            type: 'tool_execution',
            taskPlanId: taskPlan.id,
            currentMilestone: milestone,
            message: `🔧 Executing: ${toolCall.name}...`,
            timestamp: new Date(),
            metadata: { tool: toolCall.name, arguments: toolCall.arguments }
          }));
        } else {
          progressCallback(`🔧 Executing: ${toolCall.name}...`);
        }
      }

      // Execute tool with working directory and context for approval
      const toolResult = await this.mcpService.executeTool(
        {
          name: toolCall.name,
          arguments: toolCall.arguments
        }, 
        workingDir,
        {
          conversationId,
          agentId,
          requireApproval: true
        }
      );

      const observation = toolResult.success
        ? JSON.stringify(toolResult.result, null, 2)
        : `Error: ${toolResult.error}`;

      this.logger.log(`👁️ Observation: ${observation.substring(0, 200)}...`);
      steps.push({ observation, milestoneId: stepData.milestoneId });
      
      // If tool execution completed successfully and we have milestones, check if we should advance
      if (toolResult.success && taskPlan && currentMilestoneIndex < taskPlan.milestones.length) {
        const currentMilestone = taskPlan.milestones[currentMilestoneIndex];
        // If this tool was the last one for this milestone, mark it complete and move to next
        if (currentMilestone.tools.includes(toolCall.name)) {
          this.updateMilestoneStatus(taskPlan, currentMilestoneIndex, 'completed', progressCallback, toolResult.result);
          currentMilestoneIndex++;
        }
      }
      
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
      toolsUsed,
      taskPlan,
      milestonesCompleted: taskPlan ? taskPlan.milestones.filter(m => m.status === 'completed').length : 0
    };
  }

  /**
   * Check if task plan should be generated
   */
  private shouldGenerateTaskPlan(userMessage: string): boolean {
    const lowerMessage = userMessage.toLowerCase();
    
    // Generate plan for complex tasks
    const complexTaskKeywords = [
      'create app', 'create application', 'build app', 'setup project',
      'initialize project', 'create react', 'create next', 'create vue',
      'implement', 'develop', 'build a', 'create a complete'
    ];
    
    return complexTaskKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Generate task plan by asking LLM to break down the task
   */
  private async generateTaskPlan(
    userMessage: string,
    systemPrompt: string,
    model: string,
    ollamaUrl: string
  ): Promise<TaskPlan | undefined> {
    try {
      const planningPrompt = `You are a task planning assistant. Break down the following user request into clear, actionable milestones.

User Request: ${userMessage}

Provide a JSON response with this structure:
{
  "objective": "Brief description of the overall goal",
  "description": "Detailed description of what will be accomplished",
  "milestones": [
    {
      "title": "Milestone title",
      "description": "What this milestone accomplishes",
      "type": "analysis|file_operation|command_execution|validation|git_operation",
      "requiresApproval": true/false,
      "tools": ["tool1", "tool2"]
    }
  ],
  "estimatedSteps": 5
}

Focus on:
1. Breaking complex tasks into 3-7 clear milestones
2. Marking milestones that need user approval (commands, installations, deletions)
3. Logical ordering of steps
4. Realistic tool usage

Respond with ONLY the JSON, no other text.`;

      const response = await this.callLLM(
        planningPrompt,
        '',
        [],
        model,
        ollamaUrl
      );

      // Parse the JSON response
      const planData = parseJSON(response);
      
      if (!planData || !planData.objective || !planData.milestones) {
        this.logger.warn('Failed to parse task plan from LLM response');
        return undefined;
      }

      // Create task plan with proper structure
      const taskPlan: TaskPlan = {
        id: generateId(),
        objective: planData.objective,
        description: planData.description || planData.objective,
        estimatedSteps: planData.estimatedSteps || planData.milestones.length,
        requiresApproval: planData.milestones.some((m: any) => m.requiresApproval),
        createdAt: new Date(),
        milestones: planData.milestones.map((m: any, index: number) => ({
          id: generateId(),
          order: index + 1,
          title: m.title,
          description: m.description,
          type: m.type || 'file_operation',
          status: 'pending',
          requiresApproval: m.requiresApproval || false,
          tools: m.tools || []
        }))
      };

      this.logger.log(`✅ Generated task plan with ${taskPlan.milestones.length} milestones`);
      return taskPlan;
    } catch (error) {
      this.logger.error('Failed to generate task plan:', error);
      return undefined;
    }
  }

  /**
   * Update milestone status and send progress update
   */
  private updateMilestoneStatus(
    taskPlan: TaskPlan | undefined,
    milestoneIndex: number,
    status: 'in_progress' | 'completed' | 'failed',
    progressCallback?: (status: string) => void,
    result?: any,
    error?: string
  ): void {
    if (!taskPlan || milestoneIndex >= taskPlan.milestones.length) {
      return;
    }

    const milestone = taskPlan.milestones[milestoneIndex];
    milestone.status = status;
    
    if (status === 'in_progress') {
      milestone.startedAt = new Date();
    } else if (status === 'completed' || status === 'failed') {
      milestone.completedAt = new Date();
      if (result) milestone.result = result;
      if (error) milestone.error = error;
    }

    if (progressCallback) {
      const completedCount = taskPlan.milestones.filter(m => m.status === 'completed').length;
      const percentage = Math.round((completedCount / taskPlan.milestones.length) * 100);
      
      const update: TaskProgressUpdate = {
        type: status === 'completed' ? 'milestone_complete' : 'milestone_progress',
        taskPlanId: taskPlan.id,
        objective: taskPlan.objective,
        currentMilestone: milestone,
        currentStep: milestoneIndex + 1,
        totalSteps: taskPlan.milestones.length,
        percentage,
        message: status === 'in_progress' 
          ? `🔄 ${milestone.title}...`
          : status === 'completed'
          ? `✅ ${milestone.title}`
          : `❌ ${milestone.title} failed`,
        timestamp: new Date(),
        metadata: { milestone, completedCount }
      };
      
      progressCallback(JSON.stringify(update));
    }
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

    console.log(`🤖 [ReAct] Sending to Ollama with system prompt length: ${systemPrompt.length}`);
    console.log(`🤖 [ReAct] System prompt preview: ${systemPrompt.substring(0, 300)}...`);

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
