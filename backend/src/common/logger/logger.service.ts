import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { service: 'agentdb9-backend' },
      transports: [
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({ 
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    });

    // Add console transport in development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      );
    }
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  // Custom methods for structured logging
  logApiCall(method: string, url: string, statusCode: number, responseTime: number, userId?: string) {
    this.logger.info('API Call', {
      method,
      url,
      statusCode,
      responseTime,
      userId,
      type: 'api_call',
    });
  }

  logLLMRequest(modelId: string, provider: string, promptLength: number, responseTime: number, userId?: string) {
    this.logger.info('LLM Request', {
      modelId,
      provider,
      promptLength,
      responseTime,
      userId,
      type: 'llm_request',
    });
  }

  logAgentAction(agentId: string, action: string, success: boolean, duration: number, userId?: string) {
    this.logger.info('Agent Action', {
      agentId,
      action,
      success,
      duration,
      userId,
      type: 'agent_action',
    });
  }

  logSecurityEvent(event: string, userId?: string, ip?: string, userAgent?: string) {
    this.logger.warn('Security Event', {
      event,
      userId,
      ip,
      userAgent,
      type: 'security_event',
    });
  }

  logDatabaseOperation(operation: string, table: string, duration: number, success: boolean) {
    this.logger.info('Database Operation', {
      operation,
      table,
      duration,
      success,
      type: 'database_operation',
    });
  }
}