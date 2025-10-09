import { Module } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { WebSocketBridgeService } from './websocket-bridge.service';

@Module({
  providers: [WebSocketGateway, WebSocketBridgeService],
  exports: [WebSocketGateway, WebSocketBridgeService],
})
export class WebSocketModule {}