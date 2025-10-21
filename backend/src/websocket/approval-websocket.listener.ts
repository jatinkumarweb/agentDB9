import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway } from './websocket.gateway';
import { ApprovalRequest, ApprovalResponse } from '../common/interfaces/approval.interface';
import { ApprovalService } from '../common/services/approval.service';

@Injectable()
export class ApprovalWebSocketListener {
  private readonly logger = new Logger(ApprovalWebSocketListener.name);

  constructor(
    private websocketGateway: WebSocketGateway,
    private approvalService: ApprovalService,
  ) {
    // Listen for approval responses from WebSocket
    this.websocketGateway.server?.on('connection', (socket) => {
      socket.on('approval_response_received', (data: any) => {
        this.handleApprovalResponse(data);
      });
    });
  }

  /**
   * Listen for approval requests and broadcast via WebSocket
   */
  @OnEvent('approval.request')
  handleApprovalRequest(request: ApprovalRequest) {
    this.logger.log(`Broadcasting approval request: ${request.id} (${request.type})`);
    this.websocketGateway.broadcastApprovalRequest(request.conversationId, request);
  }

  /**
   * Handle approval response from user
   */
  private handleApprovalResponse(data: any) {
    this.logger.log(`Received approval response: ${data.requestId} (${data.status})`);
    
    const response: ApprovalResponse = {
      requestId: data.requestId,
      status: data.status,
      timestamp: new Date(data.timestamp || Date.now()),
      modifiedCommand: data.modifiedCommand,
      selectedPackages: data.selectedPackages,
      comment: data.comment,
      rememberChoice: data.rememberChoice,
    };
    
    this.approvalService.handleApprovalResponse(response);
  }
}
