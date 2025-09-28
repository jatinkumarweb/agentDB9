import { MCPTool, AgentExecutionContext } from '@agentdb9/shared';
import { logger } from '../utils/logger';

export type ToolHandler = (
  parameters: Record<string, any>,
  context?: AgentExecutionContext
) => Promise<any>;

export class ToolRegistry {
  private tools = new Map<string, MCPTool>();
  private handlers = new Map<string, ToolHandler>();

  public registerTool(tool: MCPTool, handler?: ToolHandler): void {
    this.tools.set(tool.name, tool);
    
    if (handler) {
      this.handlers.set(tool.name, handler);
    }
    
    logger.info(`Registered tool: ${tool.name}`);
  }

  public registerHandler(toolName: string, handler: ToolHandler): void {
    if (!this.tools.has(toolName)) {
      throw new Error(`Tool ${toolName} not found`);
    }
    
    this.handlers.set(toolName, handler);
    logger.info(`Registered handler for tool: ${toolName}`);
  }

  public async executeTool(
    name: string, 
    parameters: Record<string, any>,
    context?: AgentExecutionContext
  ): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`No handler registered for tool ${name}`);
    }

    logger.info(`Executing tool: ${name}`, { parameters });

    try {
      const result = await handler(parameters, context);
      logger.info(`Tool ${name} executed successfully`);
      return result;
    } catch (error) {
      logger.error(`Tool ${name} execution failed:`, error);
      throw error;
    }
  }

  public listTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  public getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  public getToolCount(): number {
    return this.tools.size;
  }

  public hasHandler(name: string): boolean {
    return this.handlers.has(name);
  }
}