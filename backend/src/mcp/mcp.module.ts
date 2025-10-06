import { Module, forwardRef } from '@nestjs/common';
import { MCPService } from './mcp.service';
import { MCPController } from './mcp.controller';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [forwardRef(() => WebSocketModule)],
  controllers: [MCPController],
  providers: [MCPService],
  exports: [MCPService],
})
export class MCPModule {}