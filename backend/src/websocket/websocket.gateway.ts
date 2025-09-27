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
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://3000--01997b67-9c66-7e0f-8b47-1c8986ec0f96.us-east-1-01.gitpod.dev',
      /^https:\/\/\d+--[a-f0-9-]+\.us-east-1-01\.gitpod\.dev$/
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('WebSocketGateway');
  private monitoringClients = new Set<string>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id} from origin: ${client.handshake.headers.origin}`);
    this.logger.log(`Client headers:`, client.handshake.headers);
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

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `conversation_${data.conversationId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined conversation room: ${room}`);
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `conversation_${data.conversationId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} left conversation room: ${room}`);
  }

  @SubscribeMessage('stop_generation')
  handleStopGeneration(
    @MessageBody() data: { conversationId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Stop generation requested for message ${data.messageId} in conversation ${data.conversationId}`);
    
    // Broadcast stop generation to the conversation room
    const room = `conversation_${data.conversationId}`;
    this.server.to(room).emit('generation_stopped', {
      conversationId: data.conversationId,
      messageId: data.messageId,
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

  // Method to broadcast message updates during streaming
  broadcastMessageUpdate(conversationId: string, messageId: string, content: string, streaming: boolean, metadata?: any) {
    const room = `conversation_${conversationId}`;
    this.server.to(room).emit('message_update', {
      conversationId,
      messageId,
      content,
      streaming,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to broadcast new messages
  broadcastNewMessage(conversationId: string, message: any) {
    const room = `conversation_${conversationId}`;
    this.server.to(room).emit('new_message', {
      conversationId,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to broadcast conversation updates
  broadcastConversationUpdate(conversationId: string, messages: any[]) {
    const room = `conversation_${conversationId}`;
    this.server.to(room).emit('conversation_update', {
      conversationId,
      messages,
      timestamp: new Date().toISOString(),
    });
  }
}