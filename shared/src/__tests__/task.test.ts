/**
 * Unit tests for task interfaces and validators
 */

import {
  validateTaskType,
  validateTaskStatus,
  validateTaskId,
  validateTaskResult,
  validateTask,
  isTaskType,
  isTaskStatus,
  isTask,
  isTaskResult,
  isTaskPending,
  isTaskInProgress,
  isTaskCompleted,
  isTaskFailed,
  isTaskCancelled,
  isTaskFinished,
  getTaskDuration,
  getTaskProgress,
  TaskType,
  TaskStatus,
  CodeTask,
  CodeTaskResult,
  DEFAULT_TASK_STATUS,
  DEFAULT_TASK_CONTEXT,
} from '../schemas/task.schema';

describe('Task Type Validation', () => {
  test('should validate all valid types', () => {
    const types: TaskType[] = ['generate', 'modify', 'refactor', 'debug', 'test', 'document'];
    
    types.forEach(type => {
      expect(validateTaskType(type)).toBe(true);
      expect(isTaskType(type)).toBe(true);
    });
  });

  test('should reject invalid type', () => {
    expect(validateTaskType('invalid')).toBe(false);
    expect(validateTaskType('')).toBe(false);
    expect(validateTaskType(null)).toBe(false);
  });
});

describe('Task Status Validation', () => {
  test('should validate all valid statuses', () => {
    const statuses: TaskStatus[] = ['pending', 'in-progress', 'completed', 'failed', 'cancelled'];
    
    statuses.forEach(status => {
      expect(validateTaskStatus(status)).toBe(true);
      expect(isTaskStatus(status)).toBe(true);
    });
  });

  test('should reject invalid status', () => {
    expect(validateTaskStatus('invalid')).toBe(false);
    expect(validateTaskStatus('')).toBe(false);
    expect(validateTaskStatus(null)).toBe(false);
  });

  test('should validate default status', () => {
    expect(validateTaskStatus(DEFAULT_TASK_STATUS)).toBe(true);
  });
});

describe('Task ID Validation', () => {
  test('should validate valid UUID', () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';
    expect(validateTaskId(validUUID)).toBe(true);
  });

  test('should reject invalid UUID', () => {
    expect(validateTaskId('not-a-uuid')).toBe(false);
    expect(validateTaskId('123')).toBe(false);
    expect(validateTaskId('')).toBe(false);
    expect(validateTaskId(null)).toBe(false);
  });
});

describe('Task Result Validation', () => {
  test('should validate successful result', () => {
    const result: CodeTaskResult = {
      success: true,
      generatedCode: 'const x = 1;',
      explanation: 'Created a constant',
    };
    expect(validateTaskResult(result)).toBe(true);
    expect(isTaskResult(result)).toBe(true);
  });

  test('should validate failed result', () => {
    const result: CodeTaskResult = {
      success: false,
      error: 'Something went wrong',
    };
    expect(validateTaskResult(result)).toBe(true);
  });

  test('should validate result with modified files', () => {
    const result: CodeTaskResult = {
      success: true,
      modifiedFiles: [
        { path: '/test.ts', action: 'create', content: 'test' },
        { path: '/test2.ts', action: 'update', content: 'test2' },
        { path: '/test3.ts', action: 'delete' },
      ],
    };
    expect(validateTaskResult(result)).toBe(true);
  });

  test('should validate result with suggestions', () => {
    const result: CodeTaskResult = {
      success: true,
      suggestions: ['Add error handling', 'Add tests'],
    };
    expect(validateTaskResult(result)).toBe(true);
  });

  test('should validate result with test results', () => {
    const result: CodeTaskResult = {
      success: true,
      testResults: [
        { name: 'test1', status: 'passed', duration: 100 },
        { name: 'test2', status: 'failed', error: 'Expected true' },
        { name: 'test3', status: 'skipped' },
      ],
    };
    expect(validateTaskResult(result)).toBe(true);
  });

  test('should reject result without success field', () => {
    const result = { generatedCode: 'test' };
    expect(validateTaskResult(result)).toBe(false);
  });

  test('should reject result with invalid modified files', () => {
    const result: any = {
      success: true,
      modifiedFiles: [
        { path: 123, action: 'create' }, // Invalid path type
      ],
    };
    expect(validateTaskResult(result)).toBe(false);
  });

  test('should reject result with invalid action', () => {
    const result: any = {
      success: true,
      modifiedFiles: [
        { path: '/test.ts', action: 'invalid' },
      ],
    };
    expect(validateTaskResult(result)).toBe(false);
  });
});

describe('Task Validation', () => {
  const validTask: CodeTask = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    agentId: '123e4567-e89b-12d3-a456-426614174001',
    type: 'generate',
    language: 'typescript',
    description: 'Create a new component',
    context: {
      existingFiles: ['/src/index.ts'],
      dependencies: ['react'],
      constraints: ['Use functional components'],
    },
    status: 'pending',
    createdAt: new Date(),
  };

  test('should validate correct task', () => {
    expect(validateTask(validTask)).toBe(true);
    expect(isTask(validTask)).toBe(true);
  });

  test('should validate task with result', () => {
    const taskWithResult = {
      ...validTask,
      status: 'completed' as TaskStatus,
      result: {
        success: true,
        generatedCode: 'const Component = () => {};',
      },
      completedAt: new Date(),
    };
    expect(validateTask(taskWithResult)).toBe(true);
  });

  test('should reject invalid task ID', () => {
    const invalid = { ...validTask, id: 'not-a-uuid' };
    expect(validateTask(invalid)).toBe(false);
  });

  test('should reject invalid agent ID', () => {
    const invalid = { ...validTask, agentId: 'not-a-uuid' };
    expect(validateTask(invalid)).toBe(false);
  });

  test('should reject invalid type', () => {
    const invalid = { ...validTask, type: 'invalid' };
    expect(validateTask(invalid)).toBe(false);
  });

  test('should reject empty language', () => {
    const invalid = { ...validTask, language: '' };
    expect(validateTask(invalid)).toBe(false);
  });

  test('should reject empty description', () => {
    const invalid = { ...validTask, description: '' };
    expect(validateTask(invalid)).toBe(false);
  });

  test('should reject invalid status', () => {
    const invalid = { ...validTask, status: 'invalid' };
    expect(validateTask(invalid)).toBe(false);
  });

  test('should reject invalid context', () => {
    const invalid = { ...validTask, context: null };
    expect(validateTask(invalid)).toBe(false);
  });

  test('should reject invalid createdAt', () => {
    const invalid = { ...validTask, createdAt: 'not-a-date' as any };
    expect(validateTask(invalid)).toBe(false);
  });
});

describe('Task Status Helper Functions', () => {
  const baseTask: CodeTask = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    agentId: '123e4567-e89b-12d3-a456-426614174001',
    type: 'generate',
    language: 'typescript',
    description: 'Test task',
    context: DEFAULT_TASK_CONTEXT,
    status: 'pending',
    createdAt: new Date(),
  };

  test('should identify pending task', () => {
    const task = { ...baseTask, status: 'pending' as TaskStatus };
    expect(isTaskPending(task)).toBe(true);
    expect(isTaskInProgress(task)).toBe(false);
    expect(isTaskCompleted(task)).toBe(false);
    expect(isTaskFailed(task)).toBe(false);
    expect(isTaskCancelled(task)).toBe(false);
    expect(isTaskFinished(task)).toBe(false);
  });

  test('should identify in-progress task', () => {
    const task = { ...baseTask, status: 'in-progress' as TaskStatus };
    expect(isTaskInProgress(task)).toBe(true);
    expect(isTaskPending(task)).toBe(false);
    expect(isTaskFinished(task)).toBe(false);
  });

  test('should identify completed task', () => {
    const task = { ...baseTask, status: 'completed' as TaskStatus };
    expect(isTaskCompleted(task)).toBe(true);
    expect(isTaskFinished(task)).toBe(true);
  });

  test('should identify failed task', () => {
    const task = { ...baseTask, status: 'failed' as TaskStatus };
    expect(isTaskFailed(task)).toBe(true);
    expect(isTaskFinished(task)).toBe(true);
  });

  test('should identify cancelled task', () => {
    const task = { ...baseTask, status: 'cancelled' as TaskStatus };
    expect(isTaskCancelled(task)).toBe(true);
    expect(isTaskFinished(task)).toBe(true);
  });
});

describe('Task Duration Calculation', () => {
  test('should calculate duration for completed task', () => {
    const createdAt = new Date('2024-01-01T00:00:00Z');
    const completedAt = new Date('2024-01-01T00:01:00Z');
    
    const task: CodeTask = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      agentId: '123e4567-e89b-12d3-a456-426614174001',
      type: 'generate',
      language: 'typescript',
      description: 'Test',
      context: DEFAULT_TASK_CONTEXT,
      status: 'completed',
      createdAt,
      completedAt,
    };
    
    const duration = getTaskDuration(task);
    expect(duration).toBe(60000); // 1 minute in milliseconds
  });

  test('should return null for incomplete task', () => {
    const task: CodeTask = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      agentId: '123e4567-e89b-12d3-a456-426614174001',
      type: 'generate',
      language: 'typescript',
      description: 'Test',
      context: DEFAULT_TASK_CONTEXT,
      status: 'in-progress',
      createdAt: new Date(),
    };
    
    expect(getTaskDuration(task)).toBeNull();
  });
});

describe('Task Progress Calculation', () => {
  const baseTask: CodeTask = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    agentId: '123e4567-e89b-12d3-a456-426614174001',
    type: 'generate',
    language: 'typescript',
    description: 'Test',
    context: DEFAULT_TASK_CONTEXT,
    status: 'pending',
    createdAt: new Date(),
  };

  test('should return 0 for pending task', () => {
    expect(getTaskProgress(baseTask)).toBe(0);
  });

  test('should return 50 for in-progress task', () => {
    const task = { ...baseTask, status: 'in-progress' as TaskStatus };
    expect(getTaskProgress(task)).toBe(50);
  });

  test('should return 100 for completed task', () => {
    const task = { ...baseTask, status: 'completed' as TaskStatus };
    expect(getTaskProgress(task)).toBe(100);
  });

  test('should return 0 for failed task', () => {
    const task = { ...baseTask, status: 'failed' as TaskStatus };
    expect(getTaskProgress(task)).toBe(0);
  });

  test('should return 0 for cancelled task', () => {
    const task = { ...baseTask, status: 'cancelled' as TaskStatus };
    expect(getTaskProgress(task)).toBe(0);
  });
});

describe('Default Values', () => {
  test('should have valid default status', () => {
    expect(validateTaskStatus(DEFAULT_TASK_STATUS)).toBe(true);
  });

  test('should have valid default context', () => {
    expect(Array.isArray(DEFAULT_TASK_CONTEXT.existingFiles)).toBe(true);
    expect(Array.isArray(DEFAULT_TASK_CONTEXT.dependencies)).toBe(true);
    expect(Array.isArray(DEFAULT_TASK_CONTEXT.constraints)).toBe(true);
  });
});
