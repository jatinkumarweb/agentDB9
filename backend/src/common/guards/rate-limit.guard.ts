import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private store: RateLimitStore = {};
  private readonly defaultLimit = 100; // requests per window
  private readonly defaultWindow = 15 * 60 * 1000; // 15 minutes

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = this.generateKey(request);
    
    const limit = this.reflector.get<number>('rateLimit', context.getHandler()) || this.defaultLimit;
    const window = this.reflector.get<number>('rateLimitWindow', context.getHandler()) || this.defaultWindow;

    const now = Date.now();
    const record = this.store[key];

    if (!record || now > record.resetTime) {
      this.store[key] = {
        count: 1,
        resetTime: now + window,
      };
      return true;
    }

    if (record.count >= limit) {
      throw new HttpException(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: `Too many requests. Limit: ${limit} requests per ${window / 1000} seconds`,
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return true;
  }

  private generateKey(request: Request): string {
    // Use user ID if authenticated, otherwise use IP
    const userId = (request as any).user?.id;
    const ip = request.ip || request.connection.remoteAddress;
    return userId || ip || 'anonymous';
  }

  // Cleanup old entries periodically
  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (now > this.store[key].resetTime) {
        delete this.store[key];
      }
    });
  }
}

// Decorators for setting rate limits
export const RateLimit = (limit: number) => Reflector.createDecorator<number>();
export const RateLimitWindow = (window: number) => Reflector.createDecorator<number>();