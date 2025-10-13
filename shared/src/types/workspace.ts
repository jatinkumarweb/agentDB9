/**
 * Workspace types supported by the system
 */
export enum WorkspaceType {
  VSCODE = 'vscode',
  SPREADSHEET = 'spreadsheet',
  NOTEBOOK = 'notebook',      // Future
  DATABASE = 'database',       // Future
  DESIGN = 'design'            // Future
}

/**
 * Workspace status
 */
export type WorkspaceStatus = 'active' | 'inactive' | 'archived';

/**
 * Configuration for a workspace type
 */
export interface WorkspaceTypeConfig {
  type: WorkspaceType;
  name: string;
  description: string;
  icon: string;
  containerImage: string;
  defaultPort: number;
  mcpTools: string[];          // MCP tools available for this type
  supportedLanguages?: string[];
  features: string[];
}

/**
 * Workspace entity
 */
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  userId: string;
  type: WorkspaceType;
  currentProjectId?: string;   // Active project in this workspace
  config: WorkspaceTypeConfig;
  status: WorkspaceStatus;
  containerName?: string;       // Docker container name
  volumeName?: string;          // Docker volume name
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request to create a workspace
 */
export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  type: WorkspaceType;
  isDefault?: boolean;
  projectId?: string;           // Optional initial project
}

/**
 * Request to update a workspace
 */
export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  status?: WorkspaceStatus;
  isDefault?: boolean;
  currentProjectId?: string;
}

/**
 * Request to switch project in workspace
 */
export interface SwitchProjectRequest {
  workspaceId: string;
  projectId: string;
}

/**
 * Workspace type configurations
 */
export const WORKSPACE_TYPE_CONFIGS: Record<WorkspaceType, WorkspaceTypeConfig> = {
  [WorkspaceType.VSCODE]: {
    type: WorkspaceType.VSCODE,
    name: 'VS Code',
    description: 'Full-featured code editor with terminal and extensions',
    icon: 'code',
    containerImage: 'codercom/code-server:latest',
    defaultPort: 8080,
    mcpTools: [
      'list_files',
      'read_file',
      'write_file',
      'delete_file',
      'create_directory',
      'execute_command',
      'get_workspace_summary'
    ],
    supportedLanguages: ['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'cpp'],
    features: [
      'Syntax highlighting',
      'IntelliSense',
      'Debugging',
      'Git integration',
      'Terminal access',
      'Extensions'
    ]
  },
  [WorkspaceType.SPREADSHEET]: {
    type: WorkspaceType.SPREADSHEET,
    name: 'Spreadsheet',
    description: 'Data analysis and visualization with spreadsheet tools',
    icon: 'table',
    containerImage: 'agentdb9/spreadsheet:latest',
    defaultPort: 8081,
    mcpTools: [
      'read_spreadsheet',
      'write_spreadsheet',
      'create_chart',
      'apply_formula',
      'analyze_data',
      'import_csv',
      'export_excel'
    ],
    supportedLanguages: ['python', 'javascript'],
    features: [
      'Excel/CSV support',
      'Data visualization',
      'Formula engine',
      'Statistical analysis',
      'Chart creation',
      'Data import/export'
    ]
  },
  [WorkspaceType.NOTEBOOK]: {
    type: WorkspaceType.NOTEBOOK,
    name: 'Notebook',
    description: 'Interactive notebook environment for data science',
    icon: 'book-open',
    containerImage: 'jupyter/datascience-notebook:latest',
    defaultPort: 8888,
    mcpTools: [
      'execute_cell',
      'create_notebook',
      'read_notebook',
      'install_package',
      'plot_data'
    ],
    supportedLanguages: ['python', 'r', 'julia'],
    features: [
      'Jupyter notebooks',
      'Interactive execution',
      'Rich output',
      'Data visualization',
      'Package management'
    ]
  },
  [WorkspaceType.DATABASE]: {
    type: WorkspaceType.DATABASE,
    name: 'Database',
    description: 'Database management and query interface',
    icon: 'database',
    containerImage: 'agentdb9/database:latest',
    defaultPort: 8082,
    mcpTools: [
      'execute_query',
      'list_tables',
      'describe_table',
      'create_table',
      'export_data',
      'import_data'
    ],
    supportedLanguages: ['sql', 'plpgsql'],
    features: [
      'SQL editor',
      'Query execution',
      'Schema management',
      'Data export/import',
      'Query history'
    ]
  },
  [WorkspaceType.DESIGN]: {
    type: WorkspaceType.DESIGN,
    name: 'Design',
    description: 'Visual design and prototyping tools',
    icon: 'palette',
    containerImage: 'agentdb9/design:latest',
    defaultPort: 8083,
    mcpTools: [
      'create_component',
      'edit_design',
      'export_assets',
      'generate_code'
    ],
    supportedLanguages: ['html', 'css', 'svg'],
    features: [
      'Visual editor',
      'Component library',
      'Asset management',
      'Code generation',
      'Export to various formats'
    ]
  }
};

/**
 * Get workspace type configuration
 */
export function getWorkspaceTypeConfig(type: WorkspaceType): WorkspaceTypeConfig {
  return WORKSPACE_TYPE_CONFIGS[type];
}

/**
 * Get all available workspace types
 */
export function getAvailableWorkspaceTypes(): WorkspaceType[] {
  return [WorkspaceType.VSCODE, WorkspaceType.SPREADSHEET];
}

/**
 * Check if workspace type is available
 */
export function isWorkspaceTypeAvailable(type: WorkspaceType): boolean {
  return getAvailableWorkspaceTypes().includes(type);
}
