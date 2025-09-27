import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { CreateAgentRequest, AgentConfiguration } from '@agentdb9/shared';

export class CreateAgentDto implements CreateAgentRequest {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  configuration: AgentConfiguration;
}