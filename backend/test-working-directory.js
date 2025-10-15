#!/usr/bin/env node

/**
 * Test script to verify working directory resolution
 * Run with: node backend/test-working-directory.js
 */

const path = require('path');

console.log('========================================');
console.log('Working Directory Resolution Test');
console.log('========================================\n');

// Test data
const testCases = [
  {
    name: 'Project with localPath',
    conversation: {
      id: 'conv-123',
      projectId: 'proj-123'
    },
    project: {
      id: 'proj-123',
      name: 'TestProject',
      localPath: '/workspace/projects/testproject'
    },
    expected: '/workspace/projects/testproject'
  },
  {
    name: 'Project without localPath',
    conversation: {
      id: 'conv-124',
      projectId: 'proj-124'
    },
    project: {
      id: 'proj-124',
      name: 'TestProject2',
      localPath: null
    },
    expected: '/workspace' // Should fall back to default
  },
  {
    name: 'Conversation without projectId',
    conversation: {
      id: 'conv-125',
      projectId: null
    },
    project: null,
    expected: '/workspace' // Should use default
  },
  {
    name: 'Project not found',
    conversation: {
      id: 'conv-126',
      projectId: 'proj-999'
    },
    project: null, // Simulates not found
    expected: '/workspace' // Should fall back to default
  }
];

// Simulate getWorkingDirectory logic
function getWorkingDirectory(conversation, project) {
  if (conversation?.projectId) {
    if (project?.localPath) {
      return project.localPath;
    }
  }
  return process.env.VSCODE_WORKSPACE || '/workspace';
}

// Run tests
let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  Conversation projectId: ${testCase.conversation.projectId || 'null'}`);
  console.log(`  Project localPath: ${testCase.project?.localPath || 'null'}`);
  console.log(`  Expected: ${testCase.expected}`);
  
  const result = getWorkingDirectory(testCase.conversation, testCase.project);
  console.log(`  Result: ${result}`);
  
  if (result === testCase.expected) {
    console.log('  ✅ PASS\n');
    passed++;
  } else {
    console.log('  ❌ FAIL\n');
    failed++;
  }
});

// Test path construction
console.log('========================================');
console.log('Path Construction Test');
console.log('========================================\n');

const pathTests = [
  {
    name: 'Simple project name',
    projectName: 'MyProject',
    expected: 'myproject'
  },
  {
    name: 'Name with spaces',
    projectName: 'My Test Project',
    expected: 'my-test-project'
  },
  {
    name: 'Name with special characters',
    projectName: 'Test@Project#123',
    expected: 'test-project-123'
  },
  {
    name: 'Name with leading/trailing hyphens',
    projectName: '-Test-Project-',
    expected: 'test-project'
  }
];

function createSafeFolderName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

pathTests.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log(`  Input: "${test.projectName}"`);
  console.log(`  Expected: "${test.expected}"`);
  
  const result = createSafeFolderName(test.projectName);
  console.log(`  Result: "${result}"`);
  
  if (result === test.expected) {
    console.log('  ✅ PASS\n');
    passed++;
  } else {
    console.log('  ❌ FAIL\n');
    failed++;
  }
});

// Summary
console.log('========================================');
console.log('Summary');
console.log('========================================');
console.log(`Total tests: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed === 0) {
  console.log('\n✅ All tests passed!');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
}
