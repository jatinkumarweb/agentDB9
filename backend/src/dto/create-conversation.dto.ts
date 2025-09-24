import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  agentId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}