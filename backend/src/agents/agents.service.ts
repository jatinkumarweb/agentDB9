import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../entities/agent.entity';
import { CreateAgentDto } from '../dto/create-agent.dto';
import { generateId } from '@agentdb9/shared';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private agentsRepository: Repository<Agent>,
  ) {}

  async findAll(userId?: string): Promise<Agent[]> {
    const whereCondition = userId ? { userId } : {};
    return this.agentsRepository.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentsRepository.findOne({ where: { id } });
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    return agent;
  }

  async create(createAgentDto: CreateAgentDto, userId: string): Promise<Agent> {
    // Generate default capabilities based on model
    const defaultCapabilities = [
      { type: 'code-generation' as const, enabled: true, confidence: 0.8 },
      { type: 'code-modification' as const, enabled: true, confidence: 0.8 },
      { type: 'code-refactoring' as const, enabled: true, confidence: 0.7 },
      { type: 'debugging' as const, enabled: true, confidence: 0.6 },
      { type: 'testing' as const, enabled: false, confidence: 0.5 },
      { type: 'documentation' as const, enabled: true, confidence: 0.7 },
    ];

    const agent = this.agentsRepository.create({
      ...createAgentDto,
      userId: userId,
      status: 'idle',
      capabilities: defaultCapabilities,
    });

    const savedAgent = await this.agentsRepository.save(agent);
    return Array.isArray(savedAgent) ? savedAgent[0] : savedAgent;
  }

  async update(id: string, updateData: Partial<CreateAgentDto>): Promise<Agent> {
    const agent = await this.findOne(id);
    Object.assign(agent, updateData);
    const savedAgent = await this.agentsRepository.save(agent);
    return Array.isArray(savedAgent) ? savedAgent[0] : savedAgent;
  }

  async remove(id: string): Promise<void> {
    const agent = await this.findOne(id);
    await this.agentsRepository.remove(agent);
  }

  async executeTask(id: string, taskData: any): Promise<any> {
    const agent = await this.findOne(id);
    
    // Update agent status to coding
    agent.status = 'coding';
    await this.agentsRepository.save(agent);

    try {
      // Mock task execution - in real implementation, this would call the LLM service
      const result = {
        taskId: generateId(),
        agentId: id,
        status: 'completed',
        result: 'Task completed successfully',
        timestamp: new Date(),
      };

      // Update agent status back to idle
      agent.status = 'idle' as const;
      await this.agentsRepository.save(agent);

      return result;
    } catch (error) {
      // Update agent status to error
      agent.status = 'error' as const;
      await this.agentsRepository.save(agent);
      throw error;
    }
  }
}