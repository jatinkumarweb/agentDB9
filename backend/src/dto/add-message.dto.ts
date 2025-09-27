import { IsString, IsOptional, IsObject } from 'class-validator';

export class AddMessageDto {
  // TODO: Re-enable role validation when user management is implemented
  // @IsEnum(['user', 'agent', 'system'])
  @IsString()
  role: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}