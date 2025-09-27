import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export class CreateMessageDto {
  // conversationId is set by the controller from URL parameter
  conversationId?: string;

  // @IsEnum(['user', 'agent', 'system']) // TODO: Re-enable role validation after implementing proper role management
  @IsString()
  role: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}