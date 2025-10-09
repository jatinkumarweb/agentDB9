/**
 * Project Context Types
 * 
 * Provides structured information about the workspace/project
 * that agents are working in, including framework detection,
 * dependencies, file structure, and component mapping.
 */

/**
 * Main project context structure
 */
export interface ProjectContext {
  id: string;
  workspaceId: string;
  agentId?: string;
  rootPath: string;
  name: string;
  description?: string;
  
  // Framework and language detection
  frameworks: FrameworkInfo[];
  languages: LanguageInfo[];
  
  // Project structure
  structure: ProjectStructureInfo;
  
  // Dependencies
  dependencies: DependencyInfo;
  
  // File mappings for quick lookup
  componentMap: ComponentMap;
  
  // Metadata
  metadata: ProjectMetadata;
  
  // Timestamps
  scannedAt: Date;
  updatedAt: Date;
}

/**
 * Framework detection information
 */
export interface FrameworkInfo {
  name: string;
  type: FrameworkType;
  version: string;
  configFiles: string[];
  detectedFrom: string[];
  confidence: number; // 0-1
  features: string[];
  entryPoints: string[];
}

export type FrameworkType = 
  | 'frontend' 
  | 'backend' 
  | 'fullstack' 
  | 'mobile' 
  | 'desktop' 
  | 'cli' 
  | 'library';

/**
 * Language detection information
 */
export interface LanguageInfo {
  name: string;
  version?: string;
  fileCount: number;
  percentage: number;
  configFiles: string[];
  features: string[];
}

/**
 * Project structure information
 */
export interface ProjectStructureInfo {
  type: ProjectType;
  layout: ProjectLayout;
  directories: DirectoryInfo[];
  entryPoints: EntryPoint[];
  configFiles: ConfigFile[];
  totalFiles: number;
  totalDirectories: number;
}

export type ProjectType = 
  | 'monorepo' 
  | 'single-app' 
  | 'library' 
  | 'multi-package' 
  | 'unknown';

export type ProjectLayout = 
  | 'src-based' 
  | 'app-based' 
  | 'pages-based' 
  | 'feature-based' 
  | 'domain-based' 
  | 'flat' 
  | 'custom';

/**
 * Directory information
 */
export interface DirectoryInfo {
  path: string;
  name: string;
  type: DirectoryType;
  fileCount: number;
  purpose?: string;
  frameworks: string[];
}

export type DirectoryType = 
  | 'source' 
  | 'test' 
  | 'config' 
  | 'build' 
  | 'docs' 
  | 'assets' 
  | 'components' 
  | 'pages' 
  | 'api' 
  | 'services' 
  | 'utils' 
  | 'types' 
  | 'hooks' 
  | 'styles' 
  | 'public' 
  | 'scripts' 
  | 'other';

/**
 * Entry point information
 */
export interface EntryPoint {
  path: string;
  type: EntryPointType;
  framework?: string;
  exports?: string[];
}

export type EntryPointType = 
  | 'main' 
  | 'server' 
  | 'client' 
  | 'worker' 
  | 'cli' 
  | 'test';

/**
 * Configuration file information
 */
export interface ConfigFile {
  path: string;
  type: ConfigFileType;
  framework?: string;
  parsed?: any;
}

export type ConfigFileType = 
  | 'package' 
  | 'typescript' 
  | 'babel' 
  | 'webpack' 
  | 'vite' 
  | 'next' 
  | 'nest' 
  | 'eslint' 
  | 'prettier' 
  | 'jest' 
  | 'docker' 
  | 'env' 
  | 'other';

/**
 * Dependency information
 */
export interface DependencyInfo {
  production: PackageDependency[];
  development: PackageDependency[];
  peer: PackageDependency[];
  optional: PackageDependency[];
  
  // Categorized dependencies
  frameworks: PackageDependency[];
  libraries: PackageDependency[];
  tools: PackageDependency[];
  
  // Statistics
  totalCount: number;
  outdatedCount?: number;
  vulnerabilityCount?: number;
}

/**
 * Package dependency information
 */
export interface PackageDependency {
  name: string;
  version: string;
  installedVersion?: string;
  latestVersion?: string;
  type: DependencyType;
  category?: DependencyCategory;
  description?: string;
  homepage?: string;
  repository?: string;
}

export type DependencyType = 
  | 'production' 
  | 'development' 
  | 'peer' 
  | 'optional';

export type DependencyCategory = 
  | 'framework' 
  | 'ui' 
  | 'state-management' 
  | 'routing' 
  | 'http' 
  | 'database' 
  | 'orm' 
  | 'testing' 
  | 'build-tool' 
  | 'linting' 
  | 'formatting' 
  | 'validation' 
  | 'authentication' 
  | 'logging' 
  | 'utility' 
  | 'other';

/**
 * Component mapping for quick lookup
 */
export interface ComponentMap {
  components: ComponentInfo[];
  pages: PageInfo[];
  apis: ApiInfo[];
  services: ServiceInfo[];
  utilities: UtilityInfo[];
  types: TypeInfo[];
}

/**
 * Component information
 */
export interface ComponentInfo {
  name: string;
  path: string;
  type: ComponentType;
  framework?: string;
  exports: string[];
  imports: string[];
  props?: string[];
  description?: string;
}

export type ComponentType = 
  | 'functional' 
  | 'class' 
  | 'hook' 
  | 'hoc' 
  | 'context' 
  | 'provider';

/**
 * Page information
 */
export interface PageInfo {
  name: string;
  path: string;
  route?: string;
  framework?: string;
  components: string[];
  apis: string[];
}

/**
 * API endpoint information
 */
export interface ApiInfo {
  name: string;
  path: string;
  route?: string;
  method?: string[];
  framework?: string;
  handlers: string[];
}

/**
 * Service information
 */
export interface ServiceInfo {
  name: string;
  path: string;
  type: ServiceType;
  methods: string[];
  dependencies: string[];
}

export type ServiceType = 
  | 'data' 
  | 'business' 
  | 'integration' 
  | 'utility';

/**
 * Utility information
 */
export interface UtilityInfo {
  name: string;
  path: string;
  exports: string[];
  category?: string;
}

/**
 * Type definition information
 */
export interface TypeInfo {
  name: string;
  path: string;
  kind: TypeKind;
  exports: string[];
}

export type TypeKind = 
  | 'interface' 
  | 'type' 
  | 'enum' 
  | 'class';

/**
 * Project metadata
 */
export interface ProjectMetadata {
  version?: string;
  author?: string;
  license?: string;
  repository?: string;
  homepage?: string;
  keywords?: string[];
  scripts?: Record<string, string>;
  engines?: Record<string, string>;
  
  // Custom metadata
  custom?: Record<string, any>;
}

/**
 * Context extraction request
 */
export interface ContextExtractionRequest {
  workspaceId: string;
  agentId?: string;
  rootPath: string;
  options?: ContextExtractionOptions;
}

/**
 * Context extraction options
 */
export interface ContextExtractionOptions {
  // What to scan
  scanDependencies?: boolean;
  scanComponents?: boolean;
  scanApis?: boolean;
  scanTypes?: boolean;
  
  // Depth control
  maxDepth?: number;
  maxFiles?: number;
  
  // Filters
  includePatterns?: string[];
  excludePatterns?: string[];
  
  // Performance
  useCache?: boolean;
  parallel?: boolean;
}

/**
 * Context extraction result
 */
export interface ContextExtractionResult {
  context: ProjectContext;
  status: ExtractionStatus;
  duration: number;
  filesScanned: number;
  errors: ExtractionError[];
  warnings: string[];
}

export type ExtractionStatus = 
  | 'success' 
  | 'partial' 
  | 'failed';

/**
 * Extraction error
 */
export interface ExtractionError {
  path: string;
  message: string;
  type: ErrorType;
}

export type ErrorType = 
  | 'parse' 
  | 'access' 
  | 'timeout' 
  | 'unknown';

/**
 * Context query for resolving references
 */
export interface ContextQuery {
  query: string;
  type?: ContextQueryType;
  filters?: ContextQueryFilters;
}

export type ContextQueryType = 
  | 'component' 
  | 'page' 
  | 'api' 
  | 'service' 
  | 'utility' 
  | 'type' 
  | 'file' 
  | 'any';

/**
 * Context query filters
 */
export interface ContextQueryFilters {
  framework?: string;
  directory?: string;
  fileType?: string;
  minConfidence?: number;
}

/**
 * Context query result
 */
export interface ContextQueryResult {
  matches: ContextMatch[];
  totalMatches: number;
  query: string;
  processingTime: number;
}

/**
 * Context match
 */
export interface ContextMatch {
  type: ContextQueryType;
  name: string;
  path: string;
  confidence: number;
  metadata: any;
  snippet?: string;
}

/**
 * Project summary for agent responses
 */
export interface ProjectSummary {
  name: string;
  type: ProjectType;
  description?: string;
  
  // Primary framework
  primaryFramework?: FrameworkInfo;
  
  // Languages
  primaryLanguage?: LanguageInfo;
  languages: LanguageInfo[];
  
  // Key dependencies
  majorDependencies: PackageDependency[];
  
  // Structure overview
  structure: {
    type: ProjectType;
    layout: ProjectLayout;
    directories: number;
    files: number;
  };
  
  // Quick stats
  stats: {
    components: number;
    pages: number;
    apis: number;
    services: number;
    dependencies: number;
  };
  
  // Entry points
  entryPoints: string[];
  
  // Scripts
  availableScripts: string[];
}
