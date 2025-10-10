import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ReActAgentService } from './react-agent.service';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { WebSocketModule } from '../websocket/websocket.module';
import { MCPModule } from '../mcp/mcp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message]),
    forwardRef(() => WebSocketModule),
    MCPModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, ReActAgentService],
  exports: [ConversationsService],
})
export class ConversationsModule {}