// VS Code integration utilities

import { VSCodeExtension, ProjectTemplate } from '../types';

export const EXTENSION_PROFILES = {
  typescript: [
    'ms-vscode.vscode-typescript-next',
    'bradlc.vscode-tailwindcss',
    'esbenp.prettier-vscode',
    'ms-vscode.vscode-eslint'
  ],
  
  react: [
    'ms-vscode.vscode-react-refactor',
    'burkeholland.simple-react-snippets',
    'ms-vscode.vscode-react-javascript'
  ],
  
  fullstack: [
    'ms-vscode.vscode-docker',
    'ms-vscode.vscode-postgresql',
    'humao.rest-client',
    'rangav.vscode-thunder-client'
  ],
  
  ai_coding: [
    'github.copilot',
    'tabnine.tabnine-vscode',
    'visualstudioexptteam.vscodeintellicode',
    'ms-vscode.vscode-ai'
  ],
  
  git: [
    'eamodio.gitlens',
    'github.vscode-pull-request-github',
    'donjayamanne.githistory'
  ]
};

export const PROJECT_TEMPLATES: Record<string, ProjectTemplate> = {
  'next-typescript': {
    id: 'next-typescript',
    name: 'Next.js with TypeScript',
    description: 'Modern React framework with TypeScript',
    language: 'typescript',
    framework: 'nextjs',
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: '{{projectName}}',
          version: '0.1.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'next lint'
          },
          dependencies: {
            next: '^14.0.0',
            react: '^18.0.0',
            'react-dom': '^18.0.0'
          },
          devDependencies: {
            '@types/node': '^20.0.0',
            '@types/react': '^18.0.0',
            '@types/react-dom': '^18.0.0',
            typescript: '^5.0.0',
            eslint: '^8.0.0',
            'eslint-config-next': '^14.0.0'
          }
        }, null, 2),
        template: true
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'es5',
            lib: ['dom', 'dom.iterable', 'es6'],
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
            baseUrl: '.',
            paths: { '@/*': ['./src/*'] }
          },
          include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
          exclude: ['node_modules']
        }, null, 2),
        template: false
      }
    ],
    dependencies: ['next', 'react', 'react-dom'],
    devDependencies: ['@types/node', '@types/react', '@types/react-dom', 'typescript', 'eslint', 'eslint-config-next'],
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint'
    },
    extensions: [...EXTENSION_PROFILES.typescript, ...EXTENSION_PROFILES.react]
  },

  'express-typescript': {
    id: 'express-typescript',
    name: 'Express.js with TypeScript',
    description: 'Node.js backend with Express and TypeScript',
    language: 'typescript',
    framework: 'express',
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: '{{projectName}}',
          version: '1.0.0',
          description: '',
          main: 'dist/index.js',
          scripts: {
            dev: 'ts-node-dev --respawn --transpile-only src/index.ts',
            build: 'tsc',
            start: 'node dist/index.js',
            test: 'jest'
          },
          dependencies: {
            express: '^4.18.0',
            cors: '^2.8.5',
            helmet: '^7.0.0',
            morgan: '^1.10.0'
          },
          devDependencies: {
            '@types/node': '^20.0.0',
            '@types/express': '^4.17.0',
            '@types/cors': '^2.8.0',
            '@types/morgan': '^1.9.0',
            typescript: '^5.0.0',
            'ts-node-dev': '^2.0.0'
          }
        }, null, 2),
        template: true
      }
    ],
    dependencies: ['express', 'cors', 'helmet', 'morgan'],
    devDependencies: ['@types/node', '@types/express', '@types/cors', '@types/morgan', 'typescript', 'ts-node-dev'],
    scripts: {
      dev: 'ts-node-dev --respawn --transpile-only src/index.ts',
      build: 'tsc',
      start: 'node dist/index.js',
      test: 'jest'
    },
    extensions: [...EXTENSION_PROFILES.typescript, ...EXTENSION_PROFILES.fullstack]
  }
};

export const detectProjectType = async (projectPath: string): Promise<string> => {
  // This would be implemented to analyze project files
  // For now, return a default
  return 'typescript';
};

export const getExtensionsForProject = (projectType: string): string[] => {
  const baseExtensions = EXTENSION_PROFILES.typescript;
  
  switch (projectType) {
    case 'react':
    case 'nextjs':
      return [...baseExtensions, ...EXTENSION_PROFILES.react];
    case 'fullstack':
      return [...baseExtensions, ...EXTENSION_PROFILES.fullstack];
    default:
      return baseExtensions;
  }
};

export const generateProjectFromTemplate = (
  templateId: string,
  projectName: string,
  variables: Record<string, string> = {}
): ProjectTemplate | null => {
  const template = PROJECT_TEMPLATES[templateId];
  if (!template) return null;

  const processedTemplate = { ...template };
  
  // Process template files
  processedTemplate.files = template.files.map(file => {
    if (!file.template) return file;
    
    let content = file.content;
    
    // Replace template variables
    content = content.replace(/\{\{projectName\}\}/g, projectName);
    
    // Replace custom variables
    Object.entries(variables).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    
    return { ...file, content };
  });
  
  return processedTemplate;
};

export const createVSCodeWorkspace = (projectPath: string, extensions: string[]) => {
  return {
    folders: [{ path: projectPath }],
    extensions: {
      recommendations: extensions
    },
    settings: {
      'typescript.preferences.includePackageJsonAutoImports': 'auto',
      'editor.formatOnSave': true,
      'editor.codeActionsOnSave': {
        'source.fixAll.eslint': true,
        'source.organizeImports': true
      }
    }
  };
};