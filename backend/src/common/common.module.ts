import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ValidationPipe } from './validators/validation.pipe';
import { CustomLoggerService } from './logger/logger.service';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Global()
@Module({
  providers: [
    CustomLoggerService,
    RateLimitGuard,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
  exports: [CustomLoggerService, RateLimitGuard],
})
export class CommonModule {}