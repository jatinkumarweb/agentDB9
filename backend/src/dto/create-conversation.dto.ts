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

  // TODO: Make required when user management is implemented
  @IsOptional()
  @IsString()
  userId?: string;
}