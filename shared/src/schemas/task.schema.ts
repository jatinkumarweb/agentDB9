/**
 * Task schema definitions and validators
 */

import { CodeTask, TaskStatus, CodeTaskResult } from '../types';

/**
 * Task type enum
 */
export const TaskTypeEnum = [
  'generate',
  'modify',
  'refactor',
  'debug',
  'test',
  'document',
] as const;
export type TaskType = typeof TaskTypeEnum[number];

/**
 * Task status enum
 */
export const TaskStatusEnum: readonly TaskStatus[] = [
  'pending',
  'in-progress',
  'completed',
  'failed',
  'cancelled',
] as const;

/**
 * Create task request schema
 */
export const CreateTaskSchema = {
  agentId: {
    type: 'string' as const,
    required: true,
    pattern: /^[a-f0-9-]{36}$/i,
  },
  type: {
    type: 'string' as const,
    required: true,
    enum: TaskTypeEnum,
  },
  language: {
    type: 'string' as const,
    required: true,
    minLength: 1,
    maxLength: 50,
  },
  description: {
    type: 'string' as const,
    required: true,
    minLength: 1,
    maxLength: 5000,
  },
  context: {
    type: 'object' as const,
    required: false,
    properties: {
      existingFiles: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      dependencies: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      constraints: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      targetFile: {
        type: 'string' as const,
        required: false,
      },
      selectedCode: {
        type: 'string' as const,
        required: false,
      },
    },
  },
};

/**
 * Update task request schema
 */
export const UpdateTaskSchema = {
  status: {
    type: 'string' as const,
    required: false,
    enum: TaskStatusEnum,
  },
  result: {
    type: 'object' as const,
    required: false,
  },
};

/**
 * Validator functions
 */

export function validateTaskType(type: any): type is TaskType {
  return TaskTypeEnum.includes(type);
}

export function validateTaskStatus(status: any): status is TaskStatus {
  return TaskStatusEnum.includes(status);
}

export function validateTaskId(id: any): id is string {
  if (typeof id !== 'string') return false;
  return /^[a-f0-9-]{36}$/i.test(id);
}

export function validateTaskResult(result: any): result is CodeTaskResult {
  if (!result || typeof result !== 'object') return false;
  
  // Validate required fields
  if (typeof result.success !== 'boolean') return false;
  
  // Validate optional fields if present
  if (result.generatedCode !== undefined && typeof result.generatedCode !== 'string') return false;
  if (result.explanation !== undefined && typeof result.explanation !== 'string') return false;
  if (result.error !== undefined && typeof result.error !== 'string') return false;
  
  if (result.modifiedFiles !== undefined) {
    if (!Array.isArray(result.modifiedFiles)) return false;
    for (const file of result.modifiedFiles) {
      if (typeof file !== 'object') return false;
      if (typeof file.path !== 'string') return false;
      if (!['create', 'update', 'delete'].includes(file.action)) return false;
    }
  }
  
  if (result.suggestions !== undefined) {
    if (!Array.isArray(result.suggestions)) return false;
    for (const suggestion of result.suggestions) {
      if (typeof suggestion !== 'string') return false;
    }
  }
  
  if (result.testResults !== undefined) {
    if (!Array.isArray(result.testResults)) return false;
    for (const test of result.testResults) {
      if (typeof test !== 'object') return false;
      if (typeof test.name !== 'string') return false;
      if (!['passed', 'failed', 'skipped'].includes(test.status)) return false;
    }
  }
  
  return true;
}

export function validateTask(task: any): task is CodeTask {
  if (!task || typeof task !== 'object') return false;
  
  // Validate required fields
  if (!validateTaskId(task.id)) return false;
  if (!validateTaskId(task.agentId)) return false;
  if (!validateTaskType(task.type)) return false;
  if (typeof task.language !== 'string' || task.language.length === 0) return false;
  if (typeof task.description !== 'string' || task.description.length === 0) return false;
  if (!validateTaskStatus(task.status)) return false;
  
  // Validate dates
  if (!(task.createdAt instanceof Date)) return false;
  if (task.completedAt !== undefined && !(task.completedAt instanceof Date)) return false;
  
  // Validate context
  if (!task.context || typeof task.context !== 'object') return false;
  if (!Array.isArray(task.context.existingFiles)) return false;
  if (!Array.isArray(task.context.dependencies)) return false;
  if (!Array.isArray(task.context.constraints)) return false;
  
  // Validate result if present
  if (task.result !== undefined && !validateTaskResult(task.result)) return false;
  
  return true;
}

/**
 * Type guards
 */

export function isTaskType(value: unknown): value is TaskType {
  return validateTaskType(value);
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return validateTaskStatus(value);
}

export function isTask(value: unknown): value is CodeTask {
  return validateTask(value);
}

export function isTaskResult(value: unknown): value is CodeTaskResult {
  return validateTaskResult(value);
}

/**
 * Helper functions
 */

export function isTaskPending(task: CodeTask): boolean {
  return task.status === 'pending';
}

export function isTaskInProgress(task: CodeTask): boolean {
  return task.status === 'in-progress';
}

export function isTaskCompleted(task: CodeTask): boolean {
  return task.status === 'completed';
}

export function isTaskFailed(task: CodeTask): boolean {
  return task.status === 'failed';
}

export function isTaskCancelled(task: CodeTask): boolean {
  return task.status === 'cancelled';
}

export function isTaskFinished(task: CodeTask): boolean {
  return ['completed', 'failed', 'cancelled'].includes(task.status);
}

export function getTaskDuration(task: CodeTask): number | null {
  if (!task.completedAt) return null;
  return task.completedAt.getTime() - task.createdAt.getTime();
}

export function getTaskProgress(task: CodeTask): number {
  switch (task.status) {
    case 'pending':
      return 0;
    case 'in-progress':
      return 50;
    case 'completed':
      return 100;
    case 'failed':
    case 'cancelled':
      return 0;
    default:
      return 0;
  }
}

/**
 * Default values
 */

export const DEFAULT_TASK_STATUS: TaskStatus = 'pending';
export const DEFAULT_TASK_CONTEXT = {
  existingFiles: [],
  dependencies: [],
  constraints: [],
};
