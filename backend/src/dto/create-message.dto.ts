import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  conversationId: string;

  @IsEnum(['user', 'agent', 'system'])
  role: 'user' | 'agent' | 'system';

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}