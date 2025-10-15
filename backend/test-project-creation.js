#!/usr/bin/env node

/**
 * Test project creation and folder initialization
 * Run with: node backend/test-project-creation.js
 */

const fs = require('fs').promises;
const path = require('path');

console.log('========================================');
console.log('Project Creation Test');
console.log('========================================\n');

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || '/workspace';
const TEST_PROJECT_NAME = 'TestProject-' + Date.now();

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Verify workspace path exists
  console.log('Test 1: Workspace path exists');
  try {
    await fs.access(WORKSPACE_PATH);
    console.log(`  ✅ PASS - ${WORKSPACE_PATH} exists\n`);
    passed++;
  } catch (error) {
    console.log(`  ❌ FAIL - ${WORKSPACE_PATH} does not exist`);
    console.log(`  Error: ${error.message}\n`);
    failed++;
    return { passed, failed }; // Can't continue without workspace
  }

  // Test 2: Verify projects directory exists
  console.log('Test 2: Projects directory exists');
  const projectsDir = path.join(WORKSPACE_PATH, 'projects');
  try {
    await fs.access(projectsDir);
    console.log(`  ✅ PASS - ${projectsDir} exists\n`);
    passed++;
  } catch (error) {
    console.log(`  ❌ FAIL - ${projectsDir} does not exist`);
    console.log(`  Error: ${error.message}\n`);
    failed++;
  }

  // Test 3: Create safe folder name
  console.log('Test 3: Create safe folder name');
  const safeName = TEST_PROJECT_NAME
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  console.log(`  Input: ${TEST_PROJECT_NAME}`);
  console.log(`  Output: ${safeName}`);
  if (safeName && safeName.length > 0 && !safeName.startsWith('-') && !safeName.endsWith('-')) {
    console.log(`  ✅ PASS - Valid safe name\n`);
    passed++;
  } else {
    console.log(`  ❌ FAIL - Invalid safe name\n`);
    failed++;
  }

  // Test 4: Create project folder
  console.log('Test 4: Create project folder');
  const projectPath = path.join(projectsDir, safeName);
  console.log(`  Path: ${projectPath}`);
  try {
    await fs.mkdir(projectPath, { recursive: true });
    console.log(`  ✅ PASS - Folder created\n`);
    passed++;
  } catch (error) {
    console.log(`  ❌ FAIL - Could not create folder`);
    console.log(`  Error: ${error.message}\n`);
    failed++;
    return { passed, failed };
  }

  // Test 5: Create README
  console.log('Test 5: Create README.md');
  const readmePath = path.join(projectPath, 'README.md');
  const readmeContent = `# ${TEST_PROJECT_NAME}\n\nTest project for verification.\n`;
  try {
    await fs.writeFile(readmePath, readmeContent);
    console.log(`  ✅ PASS - README created\n`);
    passed++;
  } catch (error) {
    console.log(`  ❌ FAIL - Could not create README`);
    console.log(`  Error: ${error.message}\n`);
    failed++;
  }

  // Test 6: Create src directory
  console.log('Test 6: Create src directory');
  const srcPath = path.join(projectPath, 'src');
  try {
    await fs.mkdir(srcPath, { recursive: true });
    console.log(`  ✅ PASS - src directory created\n`);
    passed++;
  } catch (error) {
    console.log(`  ❌ FAIL - Could not create src directory`);
    console.log(`  Error: ${error.message}\n`);
    failed++;
  }

  // Test 7: Verify all files exist
  console.log('Test 7: Verify all files exist');
  try {
    const files = await fs.readdir(projectPath);
    console.log(`  Files: ${files.join(', ')}`);
    if (files.includes('README.md') && files.includes('src')) {
      console.log(`  ✅ PASS - All expected files exist\n`);
      passed++;
    } else {
      console.log(`  ❌ FAIL - Missing expected files\n`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAIL - Could not read directory`);
    console.log(`  Error: ${error.message}\n`);
    failed++;
  }

  // Test 8: Test file creation in project directory
  console.log('Test 8: Create test file in project');
  const testFilePath = path.join(projectPath, 'test.txt');
  try {
    await fs.writeFile(testFilePath, 'test content');
    const content = await fs.readFile(testFilePath, 'utf8');
    if (content === 'test content') {
      console.log(`  ✅ PASS - Can create and read files\n`);
      passed++;
    } else {
      console.log(`  ❌ FAIL - File content mismatch\n`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAIL - Could not create test file`);
    console.log(`  Error: ${error.message}\n`);
    failed++;
  }

  // Test 9: Verify permissions
  console.log('Test 9: Verify directory permissions');
  try {
    const stats = await fs.stat(projectPath);
    console.log(`  Mode: ${stats.mode.toString(8)}`);
    console.log(`  ✅ PASS - Can read directory stats\n`);
    passed++;
  } catch (error) {
    console.log(`  ❌ FAIL - Could not read stats`);
    console.log(`  Error: ${error.message}\n`);
    failed++;
  }

  // Cleanup
  console.log('Cleanup: Removing test project');
  try {
    await fs.rm(projectPath, { recursive: true, force: true });
    console.log(`  ✅ Test project removed\n`);
  } catch (error) {
    console.log(`  ⚠️  Could not remove test project: ${error.message}\n`);
  }

  return { passed, failed };
}

// Run tests
runTests().then(({ passed, failed }) => {
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
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
