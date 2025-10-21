import { Module } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { WebSocketBridgeService } from './websocket-bridge.service';
import { ApprovalWebSocketListener } from './approval-websocket.listener';

@Module({
  providers: [WebSocketGateway, WebSocketBridgeService, ApprovalWebSocketListener],
  exports: [WebSocketGateway, WebSocketBridgeService],
})
export class WebSocketModule {}