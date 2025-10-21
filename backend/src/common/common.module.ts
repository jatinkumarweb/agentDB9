import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ValidationPipe } from './validators/validation.pipe';
import { CustomLoggerService } from './logger/logger.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { ApprovalService } from './services/approval.service';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    CustomLoggerService,
    RateLimitGuard,
    ApprovalService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
  exports: [CustomLoggerService, RateLimitGuard, ApprovalService],
})
export class CommonModule {}