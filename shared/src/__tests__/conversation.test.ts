/**
 * Unit tests for conversation and message interfaces
 */

import {
  validateConversationStatus,
  validateConversationId,
  validateConversation,
  isConversationStatus,
  isConversation,
  DEFAULT_CONVERSATION_TITLE,
  DEFAULT_CONVERSATION_STATUS,
  ConversationStatus,
} from '../schemas/conversation.schema';

import {
  validateMessageRole,
  validateMessageId,
  validateMessageMetadata,
  validateMessage,
  isMessageRole,
  isMessage,
  isMessageMetadata,
  isUserMessage,
  isAgentMessage,
  isSystemMessage,
  isToolMessage,
  isStreamingMessage,
  isCompletedMessage,
  hasCodeBlocks,
  hasToolCalls,
  extractCodeBlocks,
  extractFileReferences,
  sanitizeMessageContent,
  MessageRole,
  ConversationMessage,
  MessageMetadata,
} from '../schemas/message.schema';

describe('Conversation Status Validation', () => {
  test('should validate valid statuses', () => {
    expect(validateConversationStatus('active')).toBe(true);
    expect(validateConversationStatus('archived')).toBe(true);
    expect(isConversationStatus('active')).toBe(true);
  });

  test('should reject invalid status', () => {
    expect(validateConversationStatus('invalid')).toBe(false);
    expect(validateConversationStatus('')).toBe(false);
    expect(validateConversationStatus(null)).toBe(false);
  });

  test('should validate default status', () => {
    expect(validateConversationStatus(DEFAULT_CONVERSATION_STATUS)).toBe(true);
  });
});

describe('Conversation ID Validation', () => {
  test('should validate valid UUID', () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';
    expect(validateConversationId(validUUID)).toBe(true);
  });

  test('should reject invalid UUID', () => {
    expect(validateConversationId('not-a-uuid')).toBe(false);
    expect(validateConversationId('123')).toBe(false);
    expect(validateConversationId('')).toBe(false);
    expect(validateConversationId(null)).toBe(false);
  });

  test('should handle case insensitivity', () => {
    const upperUUID = '123E4567-E89B-12D3-A456-426614174000';
    expect(validateConversationId(upperUUID)).toBe(true);
  });
});

describe('Message Role Validation', () => {
  test('should validate all valid roles', () => {
    const roles: MessageRole[] = ['user', 'agent', 'system', 'tool'];
    
    roles.forEach(role => {
      expect(validateMessageRole(role)).toBe(true);
      expect(isMessageRole(role)).toBe(true);
    });
  });

  test('should reject invalid role', () => {
    expect(validateMessageRole('invalid')).toBe(false);
    expect(validateMessageRole('')).toBe(false);
    expect(validateMessageRole(null)).toBe(false);
  });
});

describe('Message Metadata Validation', () => {
  test('should validate empty metadata', () => {
    expect(validateMessageMetadata({})).toBe(true);
    expect(validateMessageMetadata(null)).toBe(true);
    expect(validateMessageMetadata(undefined)).toBe(true);
  });

  test('should validate metadata with streaming fields', () => {
    const metadata: MessageMetadata = {
      streaming: true,
      completed: false,
      stopped: false,
    };
    expect(validateMessageMetadata(metadata)).toBe(true);
    expect(isMessageMetadata(metadata)).toBe(true);
  });

  test('should validate metadata with model info', () => {
    const metadata: MessageMetadata = {
      model: 'qwen2.5-coder:7b',
      provider: 'ollama',
      temperature: 0.3,
    };
    expect(validateMessageMetadata(metadata)).toBe(true);
  });

  test('should validate metadata with token usage', () => {
    const metadata: MessageMetadata = {
      tokenUsage: {
        prompt: 100,
        completion: 200,
        total: 300,
      },
    };
    expect(validateMessageMetadata(metadata)).toBe(true);
  });

  test('should validate metadata with code blocks', () => {
    const metadata: MessageMetadata = {
      codeBlocks: [
        { language: 'typescript', code: 'const x = 1;' },
        { language: 'python', code: 'x = 1', filename: 'test.py' },
      ],
    };
    expect(validateMessageMetadata(metadata)).toBe(true);
  });

  test('should validate metadata with tool calls', () => {
    const metadata: MessageMetadata = {
      toolCalls: [
        { name: 'readFile', parameters: { path: '/test.ts' } },
        { name: 'writeFile', parameters: { path: '/test.ts', content: 'test' }, result: 'success' },
      ],
    };
    expect(validateMessageMetadata(metadata)).toBe(true);
  });

  test('should reject invalid temperature', () => {
    expect(validateMessageMetadata({ temperature: -1 })).toBe(false);
    expect(validateMessageMetadata({ temperature: 3 })).toBe(false);
  });

  test('should reject invalid token usage', () => {
    expect(validateMessageMetadata({ tokenUsage: { prompt: -1, completion: 0, total: 0 } })).toBe(false);
  });

  test('should reject invalid code blocks', () => {
    expect(validateMessageMetadata({ codeBlocks: [{ language: 123 }] })).toBe(false);
    expect(validateMessageMetadata({ codeBlocks: 'not-array' })).toBe(false);
  });
});

describe('Message Validation', () => {
  const validMessage: ConversationMessage = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    conversationId: '123e4567-e89b-12d3-a456-426614174001',
    role: 'user',
    content: 'Hello, world!',
    timestamp: new Date(),
  };

  test('should validate correct message', () => {
    expect(validateMessage(validMessage)).toBe(true);
    expect(isMessage(validMessage)).toBe(true);
  });

  test('should validate message with metadata', () => {
    const messageWithMetadata = {
      ...validMessage,
      metadata: {
        streaming: false,
        completed: true,
        model: 'test-model',
      },
    };
    expect(validateMessage(messageWithMetadata)).toBe(true);
  });

  test('should reject invalid message ID', () => {
    const invalid = { ...validMessage, id: 'not-a-uuid' };
    expect(validateMessage(invalid)).toBe(false);
  });

  test('should reject invalid conversation ID', () => {
    const invalid = { ...validMessage, conversationId: 'not-a-uuid' };
    expect(validateMessage(invalid)).toBe(false);
  });

  test('should reject invalid role', () => {
    const invalid = { ...validMessage, role: 'invalid' };
    expect(validateMessage(invalid)).toBe(false);
  });

  test('should reject empty content', () => {
    const invalid = { ...validMessage, content: '' };
    expect(validateMessage(invalid)).toBe(false);
  });

  test('should reject invalid timestamp', () => {
    const invalid = { ...validMessage, timestamp: 'not-a-date' as any };
    expect(validateMessage(invalid)).toBe(false);
  });
});

describe('Message Helper Functions', () => {
  const userMessage: ConversationMessage = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    conversationId: '123e4567-e89b-12d3-a456-426614174001',
    role: 'user',
    content: 'Test',
    timestamp: new Date(),
  };

  test('should identify user messages', () => {
    expect(isUserMessage(userMessage)).toBe(true);
    expect(isAgentMessage(userMessage)).toBe(false);
    expect(isSystemMessage(userMessage)).toBe(false);
    expect(isToolMessage(userMessage)).toBe(false);
  });

  test('should identify agent messages', () => {
    const agentMessage = { ...userMessage, role: 'agent' };
    expect(isAgentMessage(agentMessage)).toBe(true);
    expect(isUserMessage(agentMessage)).toBe(false);
  });

  test('should identify streaming messages', () => {
    const streamingMessage = {
      ...userMessage,
      metadata: { streaming: true },
    };
    expect(isStreamingMessage(streamingMessage)).toBe(true);
    expect(isCompletedMessage(streamingMessage)).toBe(false);
  });

  test('should identify completed messages', () => {
    const completedMessage = {
      ...userMessage,
      metadata: { completed: true },
    };
    expect(isCompletedMessage(completedMessage)).toBe(true);
    expect(isStreamingMessage(completedMessage)).toBe(false);
  });

  test('should detect code blocks', () => {
    const messageWithCode = {
      ...userMessage,
      metadata: {
        codeBlocks: [{ language: 'typescript', code: 'const x = 1;' }],
      },
    };
    expect(hasCodeBlocks(messageWithCode)).toBe(true);
    expect(hasCodeBlocks(userMessage)).toBe(false);
  });

  test('should detect tool calls', () => {
    const messageWithTools = {
      ...userMessage,
      metadata: {
        toolCalls: [{ name: 'test', parameters: {} }],
      },
    };
    expect(hasToolCalls(messageWithTools)).toBe(true);
    expect(hasToolCalls(userMessage)).toBe(false);
  });
});

describe('Code Block Extraction', () => {
  test('should extract single code block', () => {
    const content = '```typescript\nconst x = 1;\n```';
    const blocks = extractCodeBlocks(content);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].language).toBe('typescript');
    expect(blocks[0].code).toBe('const x = 1;');
  });

  test('should extract multiple code blocks', () => {
    const content = `
      \`\`\`typescript
      const x = 1;
      \`\`\`
      
      Some text
      
      \`\`\`python
      x = 1
      \`\`\`
    `;
    const blocks = extractCodeBlocks(content);
    
    expect(blocks).toHaveLength(2);
    expect(blocks[0].language).toBe('typescript');
    expect(blocks[1].language).toBe('python');
  });

  test('should handle code blocks without language', () => {
    const content = '```\ncode here\n```';
    const blocks = extractCodeBlocks(content);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].language).toBe('text');
  });

  test('should return empty array for no code blocks', () => {
    const content = 'Just plain text';
    const blocks = extractCodeBlocks(content);
    
    expect(blocks).toHaveLength(0);
  });
});

describe('File Reference Extraction', () => {
  test('should extract file references', () => {
    const content = 'Check `src/index.ts` and `test.py` files';
    const refs = extractFileReferences(content);
    
    expect(refs).toContain('src/index.ts');
    expect(refs).toContain('test.py');
  });

  test('should handle multiple file types', () => {
    const content = '`file.js` `file.tsx` `file.cpp` `file.go` `file.rs`';
    const refs = extractFileReferences(content);
    
    expect(refs.length).toBeGreaterThan(0);
  });

  test('should remove duplicates', () => {
    const content = '`test.ts` and `test.ts` again';
    const refs = extractFileReferences(content);
    
    expect(refs).toHaveLength(1);
    expect(refs[0]).toBe('test.ts');
  });

  test('should return empty array for no references', () => {
    const content = 'No file references here';
    const refs = extractFileReferences(content);
    
    expect(refs).toHaveLength(0);
  });
});

describe('Message Content Sanitization', () => {
  test('should remove null bytes', () => {
    const content = 'Hello\0World';
    const sanitized = sanitizeMessageContent(content);
    
    expect(sanitized).toBe('HelloWorld');
  });

  test('should trim whitespace', () => {
    const content = '  Hello World  ';
    const sanitized = sanitizeMessageContent(content);
    
    expect(sanitized).toBe('Hello World');
  });

  test('should truncate long content', () => {
    const content = 'a'.repeat(100001);
    const sanitized = sanitizeMessageContent(content, 100000);
    
    expect(sanitized.length).toBeLessThanOrEqual(100000 + 20); // Allow for truncation message
    expect(sanitized).toContain('[truncated]');
  });

  test('should not truncate short content', () => {
    const content = 'Short message';
    const sanitized = sanitizeMessageContent(content);
    
    expect(sanitized).toBe(content);
  });
});
