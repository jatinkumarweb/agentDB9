import { MCPTool, TestResult, CommandResult } from '@agentdb9/shared';
import { TerminalTools } from './TerminalTools';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';

export interface TestFramework {
  name: string;
  testCommand: string;
  testFilePatterns: string[];
  configFiles: string[];
  detectCommand?: string;
}

export class TestingTools {
  private terminalTools: TerminalTools;
  private frameworks: TestFramework[] = [
    {
      name: 'jest',
      testCommand: 'npm test',
      testFilePatterns: ['**/*.test.js', '**/*.test.ts', '**/*.spec.js', '**/*.spec.ts'],
      configFiles: ['jest.config.js', 'jest.config.ts', 'jest.config.json'],
      detectCommand: 'npx jest --version'
    },
    {
      name: 'vitest',
      testCommand: 'npx vitest run',
      testFilePatterns: ['**/*.test.js', '**/*.test.ts', '**/*.spec.js', '**/*.spec.ts'],
      configFiles: ['vitest.config.js', 'vitest.config.ts', 'vite.config.js', 'vite.config.ts'],
      detectCommand: 'npx vitest --version'
    },
    {
      name: 'mocha',
      testCommand: 'npx mocha',
      testFilePatterns: ['test/**/*.js', 'test/**/*.ts', '**/*.test.js', '**/*.test.ts'],
      configFiles: ['.mocharc.json', '.mocharc.js', '.mocharc.yaml'],
      detectCommand: 'npx mocha --version'
    },
    {
      name: 'cypress',
      testCommand: 'npx cypress run',
      testFilePatterns: ['cypress/e2e/**/*.cy.js', 'cypress/e2e/**/*.cy.ts'],
      configFiles: ['cypress.config.js', 'cypress.config.ts'],
      detectCommand: 'npx cypress version'
    },
    {
      name: 'playwright',
      testCommand: 'npx playwright test',
      testFilePatterns: ['tests/**/*.spec.js', 'tests/**/*.spec.ts', 'e2e/**/*.spec.js', 'e2e/**/*.spec.ts'],
      configFiles: ['playwright.config.js', 'playwright.config.ts'],
      detectCommand: 'npx playwright --version'
    },
    {
      name: 'pytest',
      testCommand: 'pytest',
      testFilePatterns: ['test_*.py', '*_test.py', 'tests/**/*.py'],
      configFiles: ['pytest.ini', 'pyproject.toml', 'setup.cfg'],
      detectCommand: 'pytest --version'
    },
    {
      name: 'go-test',
      testCommand: 'go test ./...',
      testFilePatterns: ['*_test.go'],
      configFiles: ['go.mod'],
      detectCommand: 'go version'
    },
    {
      name: 'cargo-test',
      testCommand: 'cargo test',
      testFilePatterns: ['src/**/*_test.rs', 'tests/**/*.rs'],
      configFiles: ['Cargo.toml'],
      detectCommand: 'cargo --version'
    }
  ];

  constructor(terminalTools: TerminalTools) {
    this.terminalTools = terminalTools;
  }

  public getTools(): MCPTool[] {
    return [
      {
        name: 'test_run_all',
        description: 'Run all tests in the project',
        inputSchema: {
          type: 'object',
          properties: {
            framework: { type: 'string', description: 'Test framework to use (auto-detected if not specified)' },
            cwd: { type: 'string', description: 'Working directory to run tests in' },
            timeout: { type: 'number', description: 'Timeout in milliseconds', default: 300000 },
            verbose: { type: 'boolean', description: 'Run tests in verbose mode', default: false },
            coverage: { type: 'boolean', description: 'Generate coverage report', default: false }
          },
          required: []
        }
      },
      {
        name: 'test_run_file',
        description: 'Run tests for a specific file',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Test file to run' },
            framework: { type: 'string', description: 'Test framework to use (auto-detected if not specified)' },
            cwd: { type: 'string', description: 'Working directory to run tests in' },
            timeout: { type: 'number', description: 'Timeout in milliseconds', default: 60000 }
          },
          required: ['file']
        }
      },
      {
        name: 'test_run_pattern',
        description: 'Run tests matching a specific pattern',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Test pattern to match' },
            framework: { type: 'string', description: 'Test framework to use (auto-detected if not specified)' },
            cwd: { type: 'string', description: 'Working directory to run tests in' },
            timeout: { type: 'number', description: 'Timeout in milliseconds', default: 180000 }
          },
          required: ['pattern']
        }
      },
      {
        name: 'test_generate',
        description: 'Generate test cases for a source file',
        inputSchema: {
          type: 'object',
          properties: {
            sourceFile: { type: 'string', description: 'Source file to generate tests for' },
            testFile: { type: 'string', description: 'Output test file path (optional)' },
            framework: { type: 'string', description: 'Test framework to use' },
            testType: { 
              type: 'string', 
              enum: ['unit', 'integration', 'e2e'],
              description: 'Type of tests to generate',
              default: 'unit'
            },
            coverage: { 
              type: 'array',
              items: { type: 'string' },
              description: 'Functions/methods to test (optional, tests all if not specified)'
            }
          },
          required: ['sourceFile']
        }
      },
      {
        name: 'test_watch',
        description: 'Run tests in watch mode',
        inputSchema: {
          type: 'object',
          properties: {
            framework: { type: 'string', description: 'Test framework to use (auto-detected if not specified)' },
            cwd: { type: 'string', description: 'Working directory to run tests in' },
            pattern: { type: 'string', description: 'File pattern to watch' }
          },
          required: []
        }
      },
      {
        name: 'test_coverage',
        description: 'Generate test coverage report',
        inputSchema: {
          type: 'object',
          properties: {
            framework: { type: 'string', description: 'Test framework to use (auto-detected if not specified)' },
            cwd: { type: 'string', description: 'Working directory to run tests in' },
            format: { 
              type: 'string', 
              enum: ['text', 'html', 'json', 'lcov'],
              description: 'Coverage report format',
              default: 'text'
            },
            threshold: { type: 'number', description: 'Minimum coverage threshold', default: 80 }
          },
          required: []
        }
      },
      {
        name: 'test_detect_framework',
        description: 'Detect the test framework used in the project',
        inputSchema: {
          type: 'object',
          properties: {
            cwd: { type: 'string', description: 'Working directory to check' }
          },
          required: []
        }
      },
      {
        name: 'test_list_files',
        description: 'List all test files in the project',
        inputSchema: {
          type: 'object',
          properties: {
            framework: { type: 'string', description: 'Test framework to use for pattern matching' },
            cwd: { type: 'string', description: 'Working directory to search in' }
          },
          required: []
        }
      },
      {
        name: 'test_debug',
        description: 'Run tests in debug mode',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Specific test file to debug' },
            testName: { type: 'string', description: 'Specific test name to debug' },
            framework: { type: 'string', description: 'Test framework to use (auto-detected if not specified)' },
            cwd: { type: 'string', description: 'Working directory to run tests in' },
            port: { type: 'number', description: 'Debug port', default: 9229 }
          },
          required: []
        }
      },
      {
        name: 'test_setup',
        description: 'Set up testing environment for a project',
        inputSchema: {
          type: 'object',
          properties: {
            framework: { type: 'string', description: 'Test framework to set up' },
            language: { type: 'string', description: 'Programming language' },
            cwd: { type: 'string', description: 'Working directory' },
            features: {
              type: 'array',
              items: { type: 'string' },
              description: 'Additional features to set up (coverage, mocking, etc.)'
            }
          },
          required: ['framework', 'language']
        }
      }
    ];
  }

  public async runAllTests(
    framework?: string, 
    cwd?: string, 
    timeout: number = 300000,
    verbose: boolean = false,
    coverage: boolean = false
  ): Promise<TestResult[]> {
    try {
      const detectedFramework = framework || await this.detectFramework(cwd);
      if (!detectedFramework) {
        throw new Error('No test framework detected');
      }

      const testFramework = this.frameworks.find(f => f.name === detectedFramework);
      if (!testFramework) {
        throw new Error(`Unsupported test framework: ${detectedFramework}`);
      }

      let command = testFramework.testCommand;
      
      // Add verbose flag if supported
      if (verbose) {
        if (detectedFramework === 'jest') {
          command += ' --verbose';
        } else if (detectedFramework === 'vitest') {
          command += ' --reporter=verbose';
        } else if (detectedFramework === 'pytest') {
          command += ' -v';
        }
      }

      // Add coverage flag if supported
      if (coverage) {
        if (detectedFramework === 'jest') {
          command += ' --coverage';
        } else if (detectedFramework === 'vitest') {
          command += ' --coverage';
        } else if (detectedFramework === 'pytest') {
          command += ' --cov';
        }
      }

      logger.info(`Running all tests with ${detectedFramework}: ${command}`);
      
      const result = await this.terminalTools.executeCommand(command, cwd, timeout);
      return this.parseTestResults(result, detectedFramework);
    } catch (error) {
      logger.error('Failed to run all tests:', error);
      throw new Error(`Failed to run tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async runTestFile(
    file: string, 
    framework?: string, 
    cwd?: string, 
    timeout: number = 60000
  ): Promise<TestResult[]> {
    try {
      const detectedFramework = framework || await this.detectFramework(cwd);
      if (!detectedFramework) {
        throw new Error('No test framework detected');
      }

      let command: string;
      
      switch (detectedFramework) {
        case 'jest':
          command = `npx jest ${file}`;
          break;
        case 'vitest':
          command = `npx vitest run ${file}`;
          break;
        case 'mocha':
          command = `npx mocha ${file}`;
          break;
        case 'pytest':
          command = `pytest ${file}`;
          break;
        case 'go-test':
          command = `go test ${file}`;
          break;
        case 'cargo-test':
          command = `cargo test --test ${path.basename(file, '.rs')}`;
          break;
        default:
          throw new Error(`Running single file not supported for ${detectedFramework}`);
      }

      logger.info(`Running test file ${file} with ${detectedFramework}: ${command}`);
      
      const result = await this.terminalTools.executeCommand(command, cwd, timeout);
      return this.parseTestResults(result, detectedFramework);
    } catch (error) {
      logger.error(`Failed to run test file ${file}:`, error);
      throw new Error(`Failed to run test file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async runTestPattern(
    pattern: string, 
    framework?: string, 
    cwd?: string, 
    timeout: number = 180000
  ): Promise<TestResult[]> {
    try {
      const detectedFramework = framework || await this.detectFramework(cwd);
      if (!detectedFramework) {
        throw new Error('No test framework detected');
      }

      let command: string;
      
      switch (detectedFramework) {
        case 'jest':
          command = `npx jest --testNamePattern="${pattern}"`;
          break;
        case 'vitest':
          command = `npx vitest run --grep="${pattern}"`;
          break;
        case 'mocha':
          command = `npx mocha --grep "${pattern}"`;
          break;
        case 'pytest':
          command = `pytest -k "${pattern}"`;
          break;
        default:
          throw new Error(`Pattern matching not supported for ${detectedFramework}`);
      }

      logger.info(`Running tests matching pattern "${pattern}" with ${detectedFramework}: ${command}`);
      
      const result = await this.terminalTools.executeCommand(command, cwd, timeout);
      return this.parseTestResults(result, detectedFramework);
    } catch (error) {
      logger.error(`Failed to run tests with pattern ${pattern}:`, error);
      throw new Error(`Failed to run tests with pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async generateTests(
    sourceFile: string,
    testFile?: string,
    framework?: string,
    testType: 'unit' | 'integration' | 'e2e' = 'unit',
    coverage?: string[]
  ): Promise<string> {
    try {
      // This would integrate with the LLM service to generate tests
      // For now, return a basic template
      
      const detectedFramework = framework || await this.detectFramework() || 'jest';
      const language = this.detectLanguage(sourceFile);
      
      logger.info(`Generating ${testType} tests for ${sourceFile} using ${detectedFramework}`);
      
      // Generate basic test template based on framework and language
      const testTemplate = this.generateTestTemplate(sourceFile, detectedFramework, language, testType);
      
      if (testFile) {
        await fs.writeFile(testFile, testTemplate, 'utf-8');
        logger.info(`Generated test file: ${testFile}`);
      }
      
      return testTemplate;
    } catch (error) {
      logger.error(`Failed to generate tests for ${sourceFile}:`, error);
      throw new Error(`Failed to generate tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async watchTests(framework?: string, cwd?: string, pattern?: string): Promise<void> {
    try {
      const detectedFramework = framework || await this.detectFramework(cwd);
      if (!detectedFramework) {
        throw new Error('No test framework detected');
      }

      let command: string;
      
      switch (detectedFramework) {
        case 'jest':
          command = 'npx jest --watch';
          if (pattern) command += ` --testPathPattern="${pattern}"`;
          break;
        case 'vitest':
          command = 'npx vitest';
          break;
        default:
          throw new Error(`Watch mode not supported for ${detectedFramework}`);
      }

      logger.info(`Starting test watch mode with ${detectedFramework}: ${command}`);
      
      // Create a terminal for watch mode
      const terminalId = await this.terminalTools.createTerminal('Test Watch', cwd);
      await this.terminalTools.sendText(terminalId, command);
    } catch (error) {
      logger.error('Failed to start test watch mode:', error);
      throw new Error(`Failed to start test watch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async generateCoverage(
    framework?: string, 
    cwd?: string, 
    format: 'text' | 'html' | 'json' | 'lcov' = 'text',
    threshold: number = 80
  ): Promise<CommandResult> {
    try {
      const detectedFramework = framework || await this.detectFramework(cwd);
      if (!detectedFramework) {
        throw new Error('No test framework detected');
      }

      let command: string;
      
      switch (detectedFramework) {
        case 'jest':
          command = `npx jest --coverage --coverageReporters=${format}`;
          if (threshold) command += ` --coverageThreshold='{"global":{"statements":${threshold},"branches":${threshold},"functions":${threshold},"lines":${threshold}}}'`;
          break;
        case 'vitest':
          command = `npx vitest run --coverage --coverage.reporter=${format}`;
          break;
        case 'pytest':
          command = `pytest --cov --cov-report=${format}`;
          if (threshold) command += ` --cov-fail-under=${threshold}`;
          break;
        default:
          throw new Error(`Coverage not supported for ${detectedFramework}`);
      }

      logger.info(`Generating coverage report with ${detectedFramework}: ${command}`);
      
      return await this.terminalTools.executeCommand(command, cwd, 120000);
    } catch (error) {
      logger.error('Failed to generate coverage report:', error);
      throw new Error(`Failed to generate coverage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async detectFramework(cwd?: string): Promise<string | null> {
    const workingDir = cwd || process.cwd();
    
    try {
      // Check for config files first
      for (const framework of this.frameworks) {
        for (const configFile of framework.configFiles) {
          try {
            await fs.access(path.join(workingDir, configFile));
            logger.info(`Detected ${framework.name} via config file: ${configFile}`);
            return framework.name;
          } catch {
            // Config file doesn't exist, continue
          }
        }
      }

      // Check package.json for dependencies
      try {
        const packageJsonPath = path.join(workingDir, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        for (const framework of this.frameworks) {
          if (allDeps[framework.name]) {
            logger.info(`Detected ${framework.name} via package.json dependency`);
            return framework.name;
          }
        }
      } catch {
        // package.json doesn't exist or is invalid
      }

      // Check for test files
      for (const framework of this.frameworks) {
        for (const pattern of framework.testFilePatterns) {
          // Simple pattern matching - in a real implementation, use glob
          const testDir = path.join(workingDir, 'test');
          try {
            const files = await fs.readdir(testDir);
            if (files.some(file => file.includes('test') || file.includes('spec'))) {
              logger.info(`Detected ${framework.name} via test files`);
              return framework.name;
            }
          } catch {
            // Test directory doesn't exist
          }
        }
      }

      logger.warn('No test framework detected');
      return null;
    } catch (error) {
      logger.error('Error detecting test framework:', error);
      return null;
    }
  }

  public async listTestFiles(framework?: string, cwd?: string): Promise<string[]> {
    const workingDir = cwd || process.cwd();
    const detectedFramework = framework || await this.detectFramework(cwd);
    
    if (!detectedFramework) {
      return [];
    }

    const testFramework = this.frameworks.find(f => f.name === detectedFramework);
    if (!testFramework) {
      return [];
    }

    const testFiles: string[] = [];
    
    // Simple implementation - in a real implementation, use glob
    try {
      const files = await this.getAllFiles(workingDir);
      for (const file of files) {
        for (const pattern of testFramework.testFilePatterns) {
          if (this.matchesPattern(file, pattern)) {
            testFiles.push(file);
            break;
          }
        }
      }
    } catch (error) {
      logger.error('Error listing test files:', error);
    }

    return testFiles;
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...await this.getAllFiles(fullPath));
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory not accessible
    }
    
    return files;
  }

  private matchesPattern(file: string, pattern: string): boolean {
    // Simple pattern matching - in a real implementation, use minimatch or similar
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');
    
    return new RegExp(regex).test(file);
  }

  private parseTestResults(result: CommandResult, framework: string): TestResult[] {
    // Parse test results based on framework output format
    // This is a simplified implementation
    
    const tests: TestResult[] = [];
    
    if (!result.success) {
      tests.push({
        name: 'Test Suite',
        status: 'failed',
        error: result.error || 'Tests failed'
      });
      return tests;
    }

    // Basic parsing - in a real implementation, parse actual test output
    const lines = result.output.split('\n');
    let passedCount = 0;
    let failedCount = 0;

    for (const line of lines) {
      if (line.includes('✓') || line.includes('PASS') || line.includes('passed')) {
        passedCount++;
      } else if (line.includes('✗') || line.includes('FAIL') || line.includes('failed')) {
        failedCount++;
      }
    }

    if (passedCount > 0) {
      tests.push({
        name: `${passedCount} tests`,
        status: 'passed'
      });
    }

    if (failedCount > 0) {
      tests.push({
        name: `${failedCount} tests`,
        status: 'failed'
      });
    }

    return tests;
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby'
    };

    return languageMap[ext] || 'unknown';
  }

  private generateTestTemplate(
    sourceFile: string, 
    framework: string, 
    language: string, 
    testType: string
  ): string {
    const fileName = path.basename(sourceFile, path.extname(sourceFile));
    
    // Basic template generation - in a real implementation, use LLM service
    switch (framework) {
      case 'jest':
        return `import { ${fileName} } from './${fileName}';

describe('${fileName}', () => {
  test('should work correctly', () => {
    // TODO: Add test implementation
    expect(true).toBe(true);
  });
});
`;

      case 'pytest':
        return `import pytest
from ${fileName} import *

def test_${fileName}():
    """Test ${fileName} functionality."""
    # TODO: Add test implementation
    assert True
`;

      case 'go-test':
        return `package main

import "testing"

func Test${fileName}(t *testing.T) {
    // TODO: Add test implementation
    if true != true {
        t.Error("Test failed")
    }
}
`;

      default:
        return `// TODO: Add tests for ${sourceFile}
// Framework: ${framework}
// Language: ${language}
// Test Type: ${testType}
`;
    }
  }
}