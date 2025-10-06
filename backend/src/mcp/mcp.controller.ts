import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { Public } from '../auth/decorators/public.decorator';

interface ToolExecutionEvent {
  conversationId?: string;
  tool: string;
  parameters: any;
  status: 'started' | 'completed' | 'failed';
  result?: any;
  error?: string;
  duration?: number;
}

interface FileChangeEvent {
  conversationId?: string;
  path: string;
  action: 'created' | 'modified' | 'deleted';
  content?: string;
}

interface AgentActivityEvent {
  conversationId?: string;
  type: 'file_edit' | 'file_create' | 'file_delete' | 'git_operation' | 'terminal_command' | 'test_run';
  description: string;
  tool?: string;
  parameters?: any;
  result?: any;
  file?: string;
  status?: 'in_progress' | 'completed' | 'failed';
}

@ApiTags('mcp')
@Controller('api/mcp')
export class MCPController {
  constructor(private readonly websocketGateway: WebSocketGateway) {}

  @Post('tool-execution')
  @Public()
  @ApiOperation({ summary: 'Receive tool execution events from MCP server' })
  @ApiResponse({ status: 200, description: 'Event broadcasted successfully' })
  async handleToolExecution(@Body() data: ToolExecutionEvent) {
    // Broadcast to WebSocket clients
    this.websocketGateway.broadcastToolExecution(data);
    
    // Also broadcast as agent activity for UI display
    if (data.status === 'completed' || data.status === 'failed') {
      this.websocketGateway.broadcastAgentActivity({
        conversationId: data.conversationId,
        type: this.getActivityTypeFromTool(data.tool),
        description: this.getActivityDescription(data.tool, data.parameters, data.status),
        tool: data.tool,
        parameters: data.parameters,
        result: data.result,
        file: data.parameters?.path || data.parameters?.file,
        status: data.status === 'completed' ? 'completed' : 'failed',
      });
    }
    
    return { success: true };
  }

  @Post('file-change')
  @Public()
  @ApiOperation({ summary: 'Receive file change events from MCP server' })
  @ApiResponse({ status: 200, description: 'Event broadcasted successfully' })
  async handleFileChange(@Body() data: FileChangeEvent) {
    // Broadcast to WebSocket clients
    this.websocketGateway.broadcastFileChange(data);
    
    // Also broadcast as agent activity
    this.websocketGateway.broadcastAgentActivity({
      conversationId: data.conversationId,
      type: data.action === 'created' ? 'file_create' : 
            data.action === 'deleted' ? 'file_delete' : 'file_edit',
      description: `File ${data.action}: ${data.path}`,
      file: data.path,
      status: 'completed',
    });
    
    return { success: true };
  }

  @Post('agent-activity')
  @Public()
  @ApiOperation({ summary: 'Receive agent activity events from MCP server' })
  @ApiResponse({ status: 200, description: 'Event broadcasted successfully' })
  async handleAgentActivity(@Body() data: AgentActivityEvent) {
    // Broadcast to WebSocket clients
    this.websocketGateway.broadcastAgentActivity(data);
    return { success: true };
  }

  private getActivityTypeFromTool(tool: string): 'file_edit' | 'file_create' | 'file_delete' | 'git_operation' | 'terminal_command' | 'test_run' {
    if (tool.startsWith('fs_') || tool.startsWith('editor_')) {
      if (tool.includes('create')) return 'file_create';
      if (tool.includes('delete')) return 'file_delete';
      return 'file_edit';
    }
    
    if (tool.startsWith('git_')) {
      return 'git_operation';
    }
    
    if (tool.startsWith('terminal_')) {
      return 'terminal_command';
    }
    
    if (tool.startsWith('test_')) {
      return 'test_run';
    }
    
    return 'file_edit';
  }

  private getActivityDescription(tool: string, parameters: any, status: string): string {
    const toolDescriptions: Record<string, string> = {
      'fs_read_file': `Reading file: ${parameters?.path}`,
      'fs_write_file': `Writing file: ${parameters?.path}`,
      'fs_create_file': `Creating file: ${parameters?.path}`,
      'fs_delete_file': `Deleting file: ${parameters?.path}`,
      'git_add': `Adding files to git: ${parameters?.files?.join(', ')}`,
      'git_commit': `Committing changes: ${parameters?.message}`,
      'git_push': `Pushing to remote`,
      'git_pull': `Pulling from remote`,
      'terminal_execute': `Executing: ${parameters?.command}`,
      'test_run_all': `Running all tests`,
      'test_run_file': `Running tests for: ${parameters?.file}`,
      'project_init': `Initializing project: ${parameters?.name}`,
    };

    const baseDescription = toolDescriptions[tool] || `Executing ${tool}`;
    
    if (status === 'started') {
      return baseDescription;
    } else if (status === 'failed') {
      return `Failed: ${baseDescription}`;
    } else {
      return `Completed: ${baseDescription}`;
    }
  }
}
