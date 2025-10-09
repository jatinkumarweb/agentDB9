import { Injectable, Logger } from '@nestjs/common';
import { FrameworkInfo, FrameworkType } from '@agentdb9/shared';
import { FilesystemScannerService } from '../scanner/filesystem-scanner.service';
import * as path from 'path';

@Injectable()
export class FrameworkExtractorService {
  private readonly logger = new Logger(FrameworkExtractorService.name);

  constructor(private readonly scanner: FilesystemScannerService) {}

  /**
   * Extract framework information from project
   */
  async extractFrameworks(rootPath: string): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];

    try {
      // Check for package.json
      const packageJsonPath = path.join(rootPath, 'package.json');
      if (await this.scanner.fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(await this.scanner.readFile(packageJsonPath));
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        // Detect frameworks from dependencies
        frameworks.push(...(await this.detectFromDependencies(deps, rootPath)));
      }

      // Detect from config files
      frameworks.push(...(await this.detectFromConfigFiles(rootPath)));

      // Remove duplicates and sort by confidence
      return this.deduplicateFrameworks(frameworks);
    } catch (error) {
      this.logger.error(`Failed to extract frameworks: ${error.message}`);
      return [];
    }
  }

  /**
   * Detect frameworks from dependencies
   */
  private async detectFromDependencies(
    deps: Record<string, string>,
    rootPath: string,
  ): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];

    // Next.js
    if (deps['next']) {
      frameworks.push({
        name: 'Next.js',
        type: 'fullstack',
        version: deps['next'],
        configFiles: await this.findConfigFiles(rootPath, ['next.config.js', 'next.config.mjs', 'next.config.ts']),
        detectedFrom: ['package.json'],
        confidence: 1.0,
        features: this.detectNextFeatures(deps),
        entryPoints: ['pages/_app.tsx', 'pages/_app.js', 'app/layout.tsx', 'app/page.tsx'],
      });
    }

    // NestJS
    if (deps['@nestjs/core']) {
      frameworks.push({
        name: 'NestJS',
        type: 'backend',
        version: deps['@nestjs/core'],
        configFiles: await this.findConfigFiles(rootPath, ['nest-cli.json', 'tsconfig.json']),
        detectedFrom: ['package.json'],
        confidence: 1.0,
        features: this.detectNestFeatures(deps),
        entryPoints: ['src/main.ts', 'main.ts'],
      });
    }

    // React
    if (deps['react'] && !deps['next']) {
      frameworks.push({
        name: 'React',
        type: 'frontend',
        version: deps['react'],
        configFiles: [],
        detectedFrom: ['package.json'],
        confidence: 1.0,
        features: this.detectReactFeatures(deps),
        entryPoints: ['src/index.tsx', 'src/index.js', 'src/App.tsx'],
      });
    }

    // Vue
    if (deps['vue']) {
      frameworks.push({
        name: 'Vue',
        type: 'frontend',
        version: deps['vue'],
        configFiles: await this.findConfigFiles(rootPath, ['vue.config.js', 'vite.config.ts']),
        detectedFrom: ['package.json'],
        confidence: 1.0,
        features: this.detectVueFeatures(deps),
        entryPoints: ['src/main.ts', 'src/main.js'],
      });
    }

    // Angular
    if (deps['@angular/core']) {
      frameworks.push({
        name: 'Angular',
        type: 'frontend',
        version: deps['@angular/core'],
        configFiles: await this.findConfigFiles(rootPath, ['angular.json', 'tsconfig.json']),
        detectedFrom: ['package.json'],
        confidence: 1.0,
        features: this.detectAngularFeatures(deps),
        entryPoints: ['src/main.ts'],
      });
    }

    // Express
    if (deps['express'] && !deps['@nestjs/core']) {
      frameworks.push({
        name: 'Express',
        type: 'backend',
        version: deps['express'],
        configFiles: [],
        detectedFrom: ['package.json'],
        confidence: 0.9,
        features: this.detectExpressFeatures(deps),
        entryPoints: ['src/index.ts', 'src/server.ts', 'index.js', 'server.js'],
      });
    }

    // Fastify
    if (deps['fastify']) {
      frameworks.push({
        name: 'Fastify',
        type: 'backend',
        version: deps['fastify'],
        configFiles: [],
        detectedFrom: ['package.json'],
        confidence: 0.9,
        features: [],
        entryPoints: ['src/index.ts', 'src/server.ts'],
      });
    }

    // Vite
    if (deps['vite']) {
      frameworks.push({
        name: 'Vite',
        type: 'frontend',
        version: deps['vite'],
        configFiles: await this.findConfigFiles(rootPath, ['vite.config.ts', 'vite.config.js']),
        detectedFrom: ['package.json'],
        confidence: 0.8,
        features: [],
        entryPoints: ['index.html', 'src/main.ts'],
      });
    }

    return frameworks;
  }

  /**
   * Detect frameworks from config files
   */
  private async detectFromConfigFiles(rootPath: string): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];

    // Check for Dockerfile (Docker)
    if (await this.scanner.fileExists(path.join(rootPath, 'Dockerfile'))) {
      frameworks.push({
        name: 'Docker',
        type: 'cli',
        version: 'unknown',
        configFiles: ['Dockerfile', 'docker-compose.yml'],
        detectedFrom: ['Dockerfile'],
        confidence: 1.0,
        features: [],
        entryPoints: [],
      });
    }

    return frameworks;
  }

  /**
   * Find config files
   */
  private async findConfigFiles(rootPath: string, files: string[]): Promise<string[]> {
    const found: string[] = [];
    for (const file of files) {
      if (await this.scanner.fileExists(path.join(rootPath, file))) {
        found.push(file);
      }
    }
    return found;
  }

  /**
   * Detect Next.js features
   */
  private detectNextFeatures(deps: Record<string, string>): string[] {
    const features: string[] = [];

    if (deps['@next/font'] || deps['next/font']) features.push('Font Optimization');
    if (deps['next-auth']) features.push('Authentication');
    if (deps['@vercel/analytics']) features.push('Analytics');
    if (deps['next-intl']) features.push('Internationalization');
    if (deps['next-pwa']) features.push('PWA');

    return features;
  }

  /**
   * Detect NestJS features
   */
  private detectNestFeatures(deps: Record<string, string>): string[] {
    const features: string[] = [];

    if (deps['@nestjs/typeorm'] || deps['@nestjs/mongoose']) features.push('ORM');
    if (deps['@nestjs/graphql']) features.push('GraphQL');
    if (deps['@nestjs/swagger']) features.push('OpenAPI/Swagger');
    if (deps['@nestjs/websockets']) features.push('WebSockets');
    if (deps['@nestjs/microservices']) features.push('Microservices');
    if (deps['@nestjs/passport']) features.push('Authentication');
    if (deps['@nestjs/jwt']) features.push('JWT');
    if (deps['@nestjs/config']) features.push('Configuration');

    return features;
  }

  /**
   * Detect React features
   */
  private detectReactFeatures(deps: Record<string, string>): string[] {
    const features: string[] = [];

    if (deps['react-router-dom']) features.push('Routing');
    if (deps['redux'] || deps['@reduxjs/toolkit']) features.push('State Management (Redux)');
    if (deps['zustand']) features.push('State Management (Zustand)');
    if (deps['react-query'] || deps['@tanstack/react-query']) features.push('Data Fetching');
    if (deps['styled-components'] || deps['@emotion/react']) features.push('CSS-in-JS');
    if (deps['tailwindcss']) features.push('Tailwind CSS');

    return features;
  }

  /**
   * Detect Vue features
   */
  private detectVueFeatures(deps: Record<string, string>): string[] {
    const features: string[] = [];

    if (deps['vue-router']) features.push('Routing');
    if (deps['vuex'] || deps['pinia']) features.push('State Management');
    if (deps['@vueuse/core']) features.push('Composition Utilities');

    return features;
  }

  /**
   * Detect Angular features
   */
  private detectAngularFeatures(deps: Record<string, string>): string[] {
    const features: string[] = [];

    if (deps['@angular/router']) features.push('Routing');
    if (deps['@ngrx/store']) features.push('State Management (NgRx)');
    if (deps['@angular/material']) features.push('Material Design');
    if (deps['@angular/forms']) features.push('Forms');

    return features;
  }

  /**
   * Detect Express features
   */
  private detectExpressFeatures(deps: Record<string, string>): string[] {
    const features: string[] = [];

    if (deps['express-session']) features.push('Sessions');
    if (deps['passport']) features.push('Authentication');
    if (deps['cors']) features.push('CORS');
    if (deps['helmet']) features.push('Security');
    if (deps['morgan']) features.push('Logging');

    return features;
  }

  /**
   * Remove duplicate frameworks
   */
  private deduplicateFrameworks(frameworks: FrameworkInfo[]): FrameworkInfo[] {
    const seen = new Map<string, FrameworkInfo>();

    for (const framework of frameworks) {
      const existing = seen.get(framework.name);
      if (!existing || framework.confidence > existing.confidence) {
        seen.set(framework.name, framework);
      }
    }

    return Array.from(seen.values()).sort((a, b) => b.confidence - a.confidence);
  }
}
