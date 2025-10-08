import { MCPTool } from '@agentdb9/shared';
import { FileSystemTools } from './FileSystemTools';
import { GitTools } from './GitTools';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';

export interface ProjectTemplate {
  name: string;
  description: string;
  language: string;
  framework?: string;
  files: ProjectFile[];
  dependencies?: string[];
  devDependencies?: string[];
  scripts?: Record<string, string>;
}

export interface ProjectFile {
  path: string;
  content: string;
  template?: boolean;
}

export class ProjectTools {
  private fileSystemTools: FileSystemTools;
  private gitTools: GitTools;
  private templates: ProjectTemplate[] = [
    {
      name: 'node-typescript',
      description: 'Node.js TypeScript project with basic setup',
      language: 'typescript',
      framework: 'node',
      files: [
        {
          path: 'package.json',
          content: JSON.stringify({
            name: 'new-project',
            version: '1.0.0',
            description: '',
            main: 'dist/index.js',
            scripts: {
              build: 'tsc',
              start: 'node dist/index.js',
              dev: 'ts-node-dev --respawn src/index.ts',
              test: 'jest'
            }
          }, null, 2)
        },
        {
          path: 'tsconfig.json',
          content: JSON.stringify({
            compilerOptions: {
              target: 'ES2020',
              module: 'commonjs',
              outDir: './dist',
              rootDir: './src',
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true,
              forceConsistentCasingInFileNames: true
            },
            include: ['src/**/*'],
            exclude: ['node_modules', 'dist']
          }, null, 2)
        },
        {
          path: 'src/index.ts',
          content: `console.log('Hello, TypeScript!');`
        },
        {
          path: '.gitignore',
          content: `node_modules/
dist/
.env
*.log
.DS_Store`
        }
      ],
      dependencies: [],
      devDependencies: ['typescript', '@types/node', 'ts-node-dev', 'jest', '@types/jest', 'ts-jest']
    },
    {
      name: 'react-typescript',
      description: 'React TypeScript project with Vite',
      language: 'typescript',
      framework: 'react',
      files: [
        {
          path: 'package.json',
          content: JSON.stringify({
            name: 'react-app',
            version: '1.0.0',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'tsc && vite build',
              preview: 'vite preview',
              test: 'vitest'
            }
          }, null, 2)
        },
        {
          path: 'vite.config.ts',
          content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`
        },
        {
          path: 'src/App.tsx',
          content: `import React from 'react'

function App() {
  return (
    <div>
      <h1>Hello React!</h1>
    </div>
  )
}

export default App`
        },
        {
          path: 'src/main.tsx',
          content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
        },
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
        }
      ],
      dependencies: ['react', 'react-dom'],
      devDependencies: ['@types/react', '@types/react-dom', '@vitejs/plugin-react', 'typescript', 'vite', 'vitest']
    },
    {
      name: 'nextjs-typescript',
      description: 'Next.js 14+ with TypeScript, Tailwind CSS, and App Router',
      language: 'typescript',
      framework: 'nextjs',
      files: [
        {
          path: 'package.json',
          content: JSON.stringify({
            name: 'nextjs-app',
            version: '0.1.0',
            private: true,
            scripts: {
              dev: 'next dev',
              build: 'next build',
              start: 'next start',
              lint: 'next lint'
            }
          }, null, 2)
        },
        {
          path: 'tsconfig.json',
          content: JSON.stringify({
            compilerOptions: {
              target: 'ES2017',
              lib: ['dom', 'dom.iterable', 'esnext'],
              allowJs: true,
              skipLibCheck: true,
              strict: true,
              noEmit: true,
              esModuleInterop: true,
              module: 'esnext',
              moduleResolution: 'bundler',
              resolveJsonModule: true,
              isolatedModules: true,
              jsx: 'preserve',
              incremental: true,
              plugins: [{ name: 'next' }],
              paths: { '@/*': ['./src/*'] }
            },
            include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
            exclude: ['node_modules']
          }, null, 2)
        },
        {
          path: 'next.config.ts',
          content: `import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
}

export default nextConfig`
        },
        {
          path: 'src/app/layout.tsx',
          content: `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Next.js App',
  description: 'Created with Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}`
        },
        {
          path: 'src/app/page.tsx',
          content: `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Welcome to Next.js!</h1>
      <p className="mt-4 text-lg">Get started by editing src/app/page.tsx</p>
    </main>
  )
}`
        },
        {
          path: 'src/app/globals.css',
          content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}`
        },
        {
          path: 'tailwind.config.ts',
          content: `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config`
        },
        {
          path: 'postcss.config.mjs',
          content: `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

export default config`
        },
        {
          path: '.gitignore',
          content: `# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts`
        },
        {
          path: '.eslintrc.json',
          content: JSON.stringify({
            extends: 'next/core-web-vitals'
          }, null, 2)
        }
      ],
      dependencies: ['next', 'react', 'react-dom'],
      devDependencies: ['typescript', '@types/node', '@types/react', '@types/react-dom', 'tailwindcss', 'postcss', 'autoprefixer', 'eslint', 'eslint-config-next']
    },
    {
      name: 'python-basic',
      description: 'Basic Python project with pytest',
      language: 'python',
      files: [
        {
          path: 'requirements.txt',
          content: 'pytest>=7.0.0'
        },
        {
          path: 'main.py',
          content: `def main():
    print("Hello, Python!")

if __name__ == "__main__":
    main()`
        },
        {
          path: 'test_main.py',
          content: `import pytest
from main import main

def test_main(capsys):
    main()
    captured = capsys.readouterr()
    assert "Hello, Python!" in captured.out`
        },
        {
          path: '.gitignore',
          content: `__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/
pip-log.txt
pip-delete-this-directory.txt
.pytest_cache/
htmlcov/
.coverage
.coverage.*
coverage.xml
*.cover
.hypothesis/`
        }
      ]
    }
  ];

  constructor(fileSystemTools: FileSystemTools, gitTools: GitTools) {
    this.fileSystemTools = fileSystemTools;
    this.gitTools = gitTools;
  }

  public getTools(): MCPTool[] {
    return [
      {
        name: 'project_init',
        description: 'Initialize a new project from a template',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name' },
            template: { type: 'string', description: 'Project template to use' },
            path: { type: 'string', description: 'Path to create project in (optional)' },
            gitInit: { type: 'boolean', description: 'Initialize git repository', default: true },
            installDeps: { type: 'boolean', description: 'Install dependencies', default: true }
          },
          required: ['name', 'template']
        }
      },
      {
        name: 'project_list_templates',
        description: 'List available project templates',
        inputSchema: {
          type: 'object',
          properties: {
            language: { type: 'string', description: 'Filter by programming language' },
            framework: { type: 'string', description: 'Filter by framework' }
          },
          required: []
        }
      },
      {
        name: 'project_analyze',
        description: 'Analyze an existing project structure',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Project path to analyze' }
          },
          required: ['path']
        }
      },
      {
        name: 'project_add_dependency',
        description: 'Add a dependency to the project',
        inputSchema: {
          type: 'object',
          properties: {
            package: { type: 'string', description: 'Package name to add' },
            version: { type: 'string', description: 'Package version (optional)' },
            dev: { type: 'boolean', description: 'Add as dev dependency', default: false },
            path: { type: 'string', description: 'Project path' }
          },
          required: ['package']
        }
      },
      {
        name: 'project_remove_dependency',
        description: 'Remove a dependency from the project',
        inputSchema: {
          type: 'object',
          properties: {
            package: { type: 'string', description: 'Package name to remove' },
            path: { type: 'string', description: 'Project path' }
          },
          required: ['package']
        }
      },
      {
        name: 'project_install_dependencies',
        description: 'Install project dependencies',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Project path' },
            clean: { type: 'boolean', description: 'Clean install', default: false }
          },
          required: []
        }
      },
      {
        name: 'project_build',
        description: 'Build the project',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Project path' },
            target: { type: 'string', description: 'Build target (optional)' }
          },
          required: []
        }
      },
      {
        name: 'project_clean',
        description: 'Clean project build artifacts',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Project path' }
          },
          required: []
        }
      },
      {
        name: 'project_scaffold_component',
        description: 'Scaffold a new component/module',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Component name' },
            type: { type: 'string', description: 'Component type (class, function, etc.)' },
            path: { type: 'string', description: 'Path to create component in' },
            withTests: { type: 'boolean', description: 'Generate test files', default: true }
          },
          required: ['name', 'type']
        }
      },
      {
        name: 'project_generate_config',
        description: 'Generate configuration files for tools',
        inputSchema: {
          type: 'object',
          properties: {
            tool: { 
              type: 'string', 
              enum: ['eslint', 'prettier', 'jest', 'vitest', 'typescript', 'vite'],
              description: 'Tool to generate config for' 
            },
            path: { type: 'string', description: 'Project path' }
          },
          required: ['tool']
        }
      }
    ];
  }

  public async initProject(
    name: string,
    templateName: string,
    projectPath?: string,
    gitInit: boolean = true,
    installDeps: boolean = true
  ): Promise<string> {
    try {
      const template = this.templates.find(t => t.name === templateName);
      if (!template) {
        throw new Error(`Template not found: ${templateName}`);
      }

      const fullPath = projectPath ? path.join(projectPath, name) : name;
      
      // Create project directory
      await this.fileSystemTools.createDirectory(fullPath);
      
      // Create files from template
      for (const file of template.files) {
        const filePath = path.join(fullPath, file.path);
        await this.fileSystemTools.writeFile(filePath, file.content);
      }

      // Initialize git if requested
      if (gitInit) {
        this.gitTools.setWorkingDirectory(fullPath);
        await this.gitTools.init();
      }

      // Install dependencies if requested and package.json exists
      if (installDeps && template.dependencies || template.devDependencies) {
        await this.installDependencies(fullPath);
      }

      logger.info(`Created project ${name} from template ${templateName} at ${fullPath}`);
      return fullPath;
    } catch (error) {
      logger.error(`Failed to initialize project ${name}:`, error);
      throw new Error(`Failed to initialize project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public listTemplates(language?: string, framework?: string): ProjectTemplate[] {
    let filtered = this.templates;
    
    if (language) {
      filtered = filtered.filter(t => t.language === language);
    }
    
    if (framework) {
      filtered = filtered.filter(t => t.framework === framework);
    }
    
    return filtered.map(t => ({
      name: t.name,
      description: t.description,
      language: t.language,
      framework: t.framework,
      files: [],
      dependencies: t.dependencies,
      devDependencies: t.devDependencies
    }));
  }

  public async analyzeProject(projectPath: string): Promise<any> {
    try {
      const analysis = {
        path: projectPath,
        language: 'unknown',
        framework: 'unknown',
        packageManager: 'unknown',
        hasTests: false,
        hasGit: false,
        dependencies: {},
        devDependencies: {},
        scripts: {},
        structure: [] as any[]
      };

      // Check if directory exists
      const exists = await this.fileSystemTools.exists(projectPath);
      if (!exists) {
        throw new Error(`Project path does not exist: ${projectPath}`);
      }

      // Analyze package.json (Node.js projects)
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await this.fileSystemTools.exists(packageJsonPath)) {
        const packageJson = JSON.parse(await this.fileSystemTools.readFile(packageJsonPath));
        analysis.language = 'javascript';
        analysis.packageManager = 'npm';
        analysis.dependencies = packageJson.dependencies || {};
        analysis.devDependencies = packageJson.devDependencies || {};
        analysis.scripts = packageJson.scripts || {};
        
        // Detect framework
        if (packageJson.dependencies?.react) analysis.framework = 'react';
        else if (packageJson.dependencies?.vue) analysis.framework = 'vue';
        else if (packageJson.dependencies?.angular) analysis.framework = 'angular';
        else if (packageJson.dependencies?.express) analysis.framework = 'express';
        else if (packageJson.dependencies?.nestjs) analysis.framework = 'nestjs';
      }

      // Check for TypeScript
      const tsconfigPath = path.join(projectPath, 'tsconfig.json');
      if (await this.fileSystemTools.exists(tsconfigPath)) {
        analysis.language = 'typescript';
      }

      // Check for Python
      const requirementsPath = path.join(projectPath, 'requirements.txt');
      const pyprojectPath = path.join(projectPath, 'pyproject.toml');
      if (await this.fileSystemTools.exists(requirementsPath) || await this.fileSystemTools.exists(pyprojectPath)) {
        analysis.language = 'python';
        analysis.packageManager = 'pip';
      }

      // Check for Go
      const goModPath = path.join(projectPath, 'go.mod');
      if (await this.fileSystemTools.exists(goModPath)) {
        analysis.language = 'go';
        analysis.packageManager = 'go';
      }

      // Check for Rust
      const cargoPath = path.join(projectPath, 'Cargo.toml');
      if (await this.fileSystemTools.exists(cargoPath)) {
        analysis.language = 'rust';
        analysis.packageManager = 'cargo';
      }

      // Check for tests
      const testDirs = ['test', 'tests', '__tests__', 'spec'];
      for (const testDir of testDirs) {
        const testPath = path.join(projectPath, testDir);
        if (await this.fileSystemTools.exists(testPath)) {
          analysis.hasTests = true;
          break;
        }
      }

      // Check for git
      const gitPath = path.join(projectPath, '.git');
      analysis.hasGit = await this.fileSystemTools.exists(gitPath);

      // Get project structure
      analysis.structure = await this.getProjectStructure(projectPath);

      logger.info(`Analyzed project at ${projectPath}`);
      return analysis;
    } catch (error) {
      logger.error(`Failed to analyze project at ${projectPath}:`, error);
      throw new Error(`Failed to analyze project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async addDependency(
    packageName: string,
    version?: string,
    isDev: boolean = false,
    projectPath?: string
  ): Promise<void> {
    try {
      const workingDir = projectPath || process.cwd();
      const packageJsonPath = path.join(workingDir, 'package.json');
      
      if (!await this.fileSystemTools.exists(packageJsonPath)) {
        throw new Error('package.json not found');
      }

      const packageJson = JSON.parse(await this.fileSystemTools.readFile(packageJsonPath));
      
      const versionSpec = version ? `${packageName}@${version}` : packageName;
      const depKey = isDev ? 'devDependencies' : 'dependencies';
      
      if (!packageJson[depKey]) {
        packageJson[depKey] = {};
      }
      
      packageJson[depKey][packageName] = version || 'latest';
      
      await this.fileSystemTools.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      
      logger.info(`Added ${isDev ? 'dev ' : ''}dependency: ${packageName}${version ? `@${version}` : ''}`);
    } catch (error) {
      logger.error(`Failed to add dependency ${packageName}:`, error);
      throw new Error(`Failed to add dependency: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async removeDependency(packageName: string, projectPath?: string): Promise<void> {
    try {
      const workingDir = projectPath || process.cwd();
      const packageJsonPath = path.join(workingDir, 'package.json');
      
      if (!await this.fileSystemTools.exists(packageJsonPath)) {
        throw new Error('package.json not found');
      }

      const packageJson = JSON.parse(await this.fileSystemTools.readFile(packageJsonPath));
      
      // Remove from both dependencies and devDependencies
      if (packageJson.dependencies?.[packageName]) {
        delete packageJson.dependencies[packageName];
      }
      if (packageJson.devDependencies?.[packageName]) {
        delete packageJson.devDependencies[packageName];
      }
      
      await this.fileSystemTools.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      
      logger.info(`Removed dependency: ${packageName}`);
    } catch (error) {
      logger.error(`Failed to remove dependency ${packageName}:`, error);
      throw new Error(`Failed to remove dependency: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async installDependencies(projectPath?: string, clean: boolean = false): Promise<void> {
    try {
      const workingDir = projectPath || process.cwd();
      
      // Detect package manager
      let command = 'npm install';
      
      if (await this.fileSystemTools.exists(path.join(workingDir, 'yarn.lock'))) {
        command = 'yarn install';
      } else if (await this.fileSystemTools.exists(path.join(workingDir, 'pnpm-lock.yaml'))) {
        command = 'pnpm install';
      }
      
      if (clean) {
        // Clean install
        if (command.startsWith('npm')) {
          command = 'npm ci';
        } else if (command.startsWith('yarn')) {
          command = 'yarn install --frozen-lockfile';
        } else if (command.startsWith('pnpm')) {
          command = 'pnpm install --frozen-lockfile';
        }
      }
      
      logger.info(`Installing dependencies with: ${command}`);
      // This would use TerminalTools to execute the command
      // await this.terminalTools.executeCommand(command, workingDir);
    } catch (error) {
      logger.error('Failed to install dependencies:', error);
      throw new Error(`Failed to install dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getProjectStructure(projectPath: string, maxDepth: number = 3, currentDepth: number = 0): Promise<any[]> {
    if (currentDepth >= maxDepth) return [];
    
    try {
      const entries = await this.fileSystemTools.listDirectory(projectPath);
      const structure = [];
      
      for (const entry of entries) {
        // Skip common directories that are not relevant
        if (['node_modules', '.git', 'dist', 'build', '__pycache__'].includes(entry.name)) {
          continue;
        }
        
        const item: any = {
          name: entry.name,
          type: entry.type,
          path: entry.path
        };
        
        if (entry.type === 'directory') {
          item.children = await this.getProjectStructure(entry.path, maxDepth, currentDepth + 1);
        }
        
        structure.push(item);
      }
      
      return structure;
    } catch (error) {
      logger.error(`Failed to get structure for ${projectPath}:`, error);
      return [];
    }
  }
}