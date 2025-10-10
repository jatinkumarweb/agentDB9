import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationResult } from '../entities/evaluation-result.entity';
import { EvaluationGroundTruth } from '../entities/evaluation-ground-truth.entity';
import { Agent } from '../entities/agent.entity';
import { AgentsService } from '../agents/agents.service';
import { ConversationsService } from '../conversations/conversations.service';
import type {
  EvaluationScores,
  EvaluationDetails,
  EvaluationKnowledgeSource,
  EvaluationMemoryType,
} from '@agentdb9/shared';

@Injectable()
export class EvaluationExecutor {
  private readonly logger = new Logger(EvaluationExecutor.name);

  constructor(
    @InjectRepository(EvaluationResult)
    private readonly resultRepo: Repository<EvaluationResult>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    private readonly agentsService: AgentsService,
    private readonly conversationsService: ConversationsService,
  ) {}

  async executeEvaluation(
    agent: Agent,
    groundTruth: EvaluationGroundTruth,
    memoryType: EvaluationMemoryType = null,
    knowledgeSources: EvaluationKnowledgeSource[] = [],
  ): Promise<EvaluationResult> {
    this.logger.log(
      `Executing evaluation for agent ${agent.id} on task ${groundTruth.id}`,
    );

    const startTime = Date.now();

    // Create evaluation result record
    const result = this.resultRepo.create({
      groundTruthId: groundTruth.id,
      agentId: agent.id,
      agentConfiguration: agent.configuration,
      memoryUsed: memoryType !== null,
      memoryType,
      knowledgeSources,
      status: 'running',
    });

    await this.resultRepo.save(result);

    try {
      // Execute agent on the task
      const agentOutput = await this.runAgentTask(
        agent,
        groundTruth,
        memoryType,
        knowledgeSources,
      );

      result.agentOutput = agentOutput;
      result.executionTime = Date.now() - startTime;

      // Evaluate the output
      const evaluation = await this.evaluateOutput(
        agentOutput,
        groundTruth,
      );

      result.scores = evaluation.scores;
      result.evaluationDetails = evaluation.details;
      result.status = 'completed';

      this.logger.log(
        `Evaluation completed for agent ${agent.id} on task ${groundTruth.id}. Score: ${evaluation.scores.overall}`,
      );
    } catch (error) {
      this.logger.error(
        `Evaluation failed for agent ${agent.id} on task ${groundTruth.id}`,
        error.stack,
      );
      result.status = 'failed';
      result.errorMessage = error.message;
    }

    return this.resultRepo.save(result);
  }

  private async runAgentTask(
    agent: Agent,
    groundTruth: EvaluationGroundTruth,
    memoryType: EvaluationMemoryType,
    knowledgeSources: EvaluationKnowledgeSource[],
  ): Promise<any> {
    // Create a temporary conversation for this evaluation
    const conversation = await this.conversationsService.create({
      agentId: agent.id,
      title: `Evaluation: ${groundTruth.taskType}`,
    });

    try {
      // Prepare context based on knowledge sources
      let context = '';
      if (knowledgeSources.length > 0) {
        context = this.prepareKnowledgeContext(knowledgeSources);
      }

      // Send the task to the agent
      const prompt = this.buildEvaluationPrompt(groundTruth, context);
      
      const response = await this.conversationsService.sendMessage(
        conversation.id,
        {
          content: prompt,
          role: 'user',
        },
      );

      return {
        response: response.content,
        conversationId: conversation.id,
        timestamp: new Date(),
      };
    } finally {
      // Clean up: delete the temporary conversation
      await this.conversationsService.delete(conversation.id);
    }
  }

  private buildEvaluationPrompt(
    groundTruth: EvaluationGroundTruth,
    context: string,
  ): string {
    let prompt = `Task: ${groundTruth.taskDescription}\n\n`;

    if (context) {
      prompt += `Context:\n${context}\n\n`;
    }

    prompt += `Please provide a complete solution for this task. Include all necessary code, explanations, and any relevant details.`;

    return prompt;
  }

  private prepareKnowledgeContext(sources: EvaluationKnowledgeSource[]): string {
    return sources
      .map((source) => {
        let ctx = `[${source.type.toUpperCase()}: ${source.identifier}]\n`;
        if (source.content) {
          ctx += source.content + '\n';
        }
        return ctx;
      })
      .join('\n---\n\n');
  }

  private async evaluateOutput(
    agentOutput: any,
    groundTruth: EvaluationGroundTruth,
  ): Promise<{ scores: EvaluationScores; details: EvaluationDetails }> {
    // Use LLM to evaluate the output
    const evaluatorModel = this.selectEvaluatorModel(groundTruth);
    
    const evaluationPrompt = this.buildEvaluationPrompt2(
      agentOutput,
      groundTruth,
    );

    const evaluation = await this.callEvaluatorLLM(
      evaluationPrompt,
      evaluatorModel,
    );

    return evaluation;
  }

  private selectEvaluatorModel(groundTruth: EvaluationGroundTruth): string {
    // Use GPT-4 for primary evaluation
    // Use Llama 3.1 for secondary/simpler evaluations
    const difficulty = groundTruth.metadata?.difficulty || 'medium';
    
    if (difficulty === 'hard') {
      return 'gpt-4o'; // Primary evaluator
    } else {
      return 'llama3.1:8b'; // Secondary evaluator
    }
  }

  private buildEvaluationPrompt2(
    agentOutput: any,
    groundTruth: EvaluationGroundTruth,
  ): string {
    const criteria = groundTruth.evaluationCriteria;
    
    return `You are an expert code evaluator. Evaluate the following agent output against the expected output and criteria.

Task Description:
${groundTruth.taskDescription}

Expected Output:
${JSON.stringify(groundTruth.expectedOutput, null, 2)}

Agent Output:
${JSON.stringify(agentOutput, null, 2)}

Evaluation Criteria (weights):
- Accuracy: ${criteria.accuracy}
- Code Quality: ${criteria.codeQuality}
- Completeness: ${criteria.completeness}
- Efficiency: ${criteria.efficiency}
- Maintainability: ${criteria.maintainability}
${criteria.security ? `- Security: ${criteria.security}` : ''}

Please provide a detailed evaluation in the following JSON format:
{
  "scores": {
    "accuracy": <0-100>,
    "codeQuality": <0-100>,
    "completeness": <0-100>,
    "efficiency": <0-100>,
    "maintainability": <0-100>,
    ${criteria.security ? '"security": <0-100>,' : ''}
    "overall": <weighted average>
  },
  "details": {
    "evaluatorReasoning": "<detailed explanation>",
    "strengths": ["<strength 1>", "<strength 2>", ...],
    "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
    "suggestions": ["<suggestion 1>", "<suggestion 2>", ...],
    "comparisonToExpected": "<comparison analysis>"
  }
}

Respond ONLY with valid JSON.`;
  }

  private async callEvaluatorLLM(
    prompt: string,
    model: string,
  ): Promise<{ scores: EvaluationScores; details: EvaluationDetails }> {
    try {
      // Call LLM service
      const llmUrl = process.env.LLM_SERVICE_URL || 'http://localhost:9000';
      
      const response = await fetch(`${llmUrl}/api/llm/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          modelId: model,
          temperature: 0.1, // Low temperature for consistent evaluation
          maxTokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM service error: ${response.statusText}`);
      }

      const result = await response.json();
      const evaluation = JSON.parse(result.content);

      return {
        scores: evaluation.scores,
        details: {
          ...evaluation.details,
          evaluatorModel: model,
        },
      };
    } catch (error) {
      this.logger.error('Failed to call evaluator LLM', error.stack);
      
      // Fallback to basic scoring if LLM fails
      return this.fallbackEvaluation();
    }
  }

  private fallbackEvaluation(): {
    scores: EvaluationScores;
    details: EvaluationDetails;
  } {
    return {
      scores: {
        accuracy: 50,
        codeQuality: 50,
        completeness: 50,
        efficiency: 50,
        maintainability: 50,
        overall: 50,
      },
      details: {
        evaluatorModel: 'fallback',
        evaluatorReasoning: 'Evaluation failed, using fallback scores',
        strengths: [],
        weaknesses: ['Evaluation could not be completed'],
        suggestions: ['Retry evaluation'],
        comparisonToExpected: 'Unable to compare',
      },
    };
  }
}
