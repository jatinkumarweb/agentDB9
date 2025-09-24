import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WSGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('WebSocketGateway');
  private monitoringClients = new Set<string>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.monitoringClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_environment')
  handleSubscribeEnvironment(@ConnectedSocket() client: Socket) {
    this.monitoringClients.add(client.id);
    this.logger.log(`Client ${client.id} subscribed to environment monitoring`);
    
    // Send initial status if available
    client.emit('environment_health', {
      status: 'connected',
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('unsubscribe_environment')
  handleUnsubscribeEnvironment(@ConnectedSocket() client: Socket) {
    this.monitoringClients.delete(client.id);
    this.logger.log(`Client ${client.id} unsubscribed from environment monitoring`);
  }

  @SubscribeMessage('agent_task')
  handleAgentTask(
    @MessageBody() data: { agentId: string; task: any },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Agent task received for agent ${data.agentId}`);
    
    // Broadcast task status to all clients
    this.server.emit('agent_task_status', {
      agentId: data.agentId,
      status: 'received',
      timestamp: new Date().toISOString(),
    });
  }

  // Method to broadcast environment health updates
  broadcastEnvironmentHealth(health: any) {
    this.monitoringClients.forEach(clientId => {
      const socket = this.server.sockets.sockets.get(clientId);
      if (socket) {
        socket.emit('environment_health', health);
      }
    });
  }

  // Method to broadcast agent status updates
  broadcastAgentStatus(agentId: string, status: any) {
    this.server.emit('agent_status_update', {
      agentId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}