# Workspace Enhancement Plan

## Current State Analysis

### Existing Implementation
- **Project Entity**: Has userId, name, description, language, framework, status, agents[]
- **ProjectContext Entity**: Has workspaceId, agentId, rootPath, name, description, data
- **Workspace Container**: Single VSCode container with shared volume (`./workspace`)
- **No Workspace Types**: All workspaces are VSCode-based
- **No Workspace Selector**: Direct access to `/workspace` route
- **No Project Switching**: Single workspace volume for all projects
- **No Agent-Workspace Compatibility**: Agents can be used anywhere

### Issues to Address
1. No workspace type system (only VSCode exists)
2. No user-workspace-project relationship
3. No workspace selector UI
4. No project volume isolation
5. No agent specialization by workspace type
6. No memory aggregation by project context

---

## Phase 1: Database Schema & Type System

### 1.1 Create Workspace Type Enum
```typescript
// shared/src/types/workspace.ts
export enum WorkspaceType {
  VSCODE = 'vscode',
  SPREADSHEET = 'spreadsheet',
  NOTEBOOK = 'notebook',      // Future
  DATABASE = 'database',       // Future
  DESIGN = 'design'            // Future
}

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
```

### 1.2 Create Workspace Entity
```typescript
// backend/src/entities/workspace.entity.ts
@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  userId: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: WorkspaceType.VSCODE
  })
  type: WorkspaceType;

  @Column({ nullable: true })
  currentProjectId?: string;  // Active project in this workspace

  @Column('text', {
    transformer: {
      to: (value: any) => JSON.stringify(value),
      from: (value: string) => JSON.parse(value)
    }
  })
  config: WorkspaceTypeConfig;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active'
  })
  status: 'active' | 'inactive' | 'archived';

  @Column({ nullable: true })
  containerName?: string;      // Docker container name

  @Column({ nullable: true })
  volumeName?: string;          // Docker volume name

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 1.3 Update Project Entity
```typescript
// Add to existing Project entity
@Column({ nullable: true })
workspaceId?: string;           // Which workspace this project belongs to

@Column({
  type: 'varchar',
  length: 50,
  default: WorkspaceType.VSCODE
})
workspaceType: WorkspaceType;   // What type of workspace can use this project

@Column({ nullable: true })
volumePath?: string;            // Path to project files in volume
```

### 1.4 Update Agent Entity
```typescript
// Add to existing Agent configuration
export interface AgentConfiguration {
  // ... existing fields
  supportedWorkspaceTypes?: WorkspaceType[];  // Which workspace types this agent supports
  specializationContext?: {
    workspaceType: WorkspaceType;
    customPrompts?: Record<WorkspaceType, string>;
    toolPreferences?: Record<WorkspaceType, string[]>;
  };
}
```

---

## Phase 2: Backend Services

### 2.1 Workspace Service
```typescript
// backend/src/workspaces/workspaces.service.ts
@Injectable()
export class WorkspacesService {
  // CRUD operations
  async create(userId: string, type: WorkspaceType, name: string): Promise<Workspace>
  async findByUser(userId: string): Promise<Workspace[]>
  async findByType(userId: string, type: WorkspaceType): Promise<Workspace[]>
  async getDefault(userId: string): Promise<Workspace | null>
  async setDefault(workspaceId: string): Promise<void>
  
  // Container management
  async startContainer(workspaceId: string): Promise<void>
  async stopContainer(workspaceId: string): Promise<void>
  async switchProject(workspaceId: string, projectId: string): Promise<void>
  
  // Volume management
  async createVolume(workspaceId: string, projectId: string): Promise<string>
  async mountVolume(workspaceId: string, volumeName: string): Promise<void>
  async unmountVolume(workspaceId: string): Promise<void>
}
```

### 2.2 Project Service Updates
```typescript
// backend/src/projects/projects.service.ts
// Add methods:
async getByWorkspace(workspaceId: string): Promise<Project[]>
async assignToWorkspace(projectId: string, workspaceId: string): Promise<void>
async getCompatibleProjects(workspaceType: WorkspaceType): Promise<Project[]>
```

### 2.3 Agent Service Updates
```typescript
// backend/src/agents/agents.service.ts
// Add methods:
async getByWorkspaceType(workspaceType: WorkspaceType): Promise<Agent[]>
async isCompatibleWithWorkspace(agentId: string, workspaceType: WorkspaceType): Promise<boolean>
```

### 2.4 Memory Service Updates
```typescript
// backend/src/memory/memory.service.ts
// Add methods:
async getMemoryByProject(agentId: string, projectId: string): Promise<Memory[]>
async aggregateProjectMemories(projectId: string): Promise<ProjectMemorySummary>
async getWorkspaceContext(workspaceId: string): Promise<WorkspaceMemoryContext>
```

---

## Phase 3: Container & Volume Management

### 3.1 Docker Compose Updates
```yaml
# docker-compose.yml additions

# VSCode workspace (existing, but with dynamic volumes)
vscode:
  volumes:
    - ${WORKSPACE_VOLUME:-./workspace}:/home/coder/workspace:cached
    - vscode-data:/home/coder/.local/share/code-server

# New: Spreadsheet workspace
spreadsheet:
  build:
    context: ./spreadsheet
    dockerfile: Dockerfile
  ports:
    - "8081:8080"
  environment:
    - WORKSPACE_TYPE=spreadsheet
  volumes:
    - ${SPREADSHEET_VOLUME:-./workspace-spreadsheet}:/workspace:cached
  command: npm start

# New: Spreadsheet MCP server
mcp-spreadsheet:
  build:
    context: ./mcp-spreadsheet
    dockerfile: Dockerfile
  network_mode: "service:spreadsheet"
  environment:
    - MCP_PORT=9003
    - WORKSPACE_PATH=/workspace
  volumes:
    - ${SPREADSHEET_VOLUME:-./workspace-spreadsheet}:/workspace:cached

volumes:
  # Dynamic project volumes (created by backend)
  project-volume-1:
  project-volume-2:
  # ... more as needed
```

### 3.2 Volume Switching Logic
```typescript
// backend/src/workspaces/volume-manager.service.ts
@Injectable()
export class VolumeManagerService {
  async switchProjectVolume(
    workspaceId: string,
    fromProjectId: string,
    toProjectId: string
  ): Promise<void> {
    // 1. Stop workspace container
    await this.stopContainer(workspaceId);
    
    // 2. Unmount current volume
    await this.unmountVolume(workspaceId, fromProjectId);
    
    // 3. Mount new project volume
    await this.mountVolume(workspaceId, toProjectId);
    
    // 4. Restart workspace container
    await this.startContainer(workspaceId);
    
    // 5. Update workspace.currentProjectId
    await this.workspacesService.updateCurrentProject(workspaceId, toProjectId);
  }
  
  private async mountVolume(workspaceId: string, projectId: string): Promise<void> {
    const workspace = await this.workspacesService.findOne(workspaceId);
    const project = await this.projectsService.findOne(projectId);
    
    // Use docker SDK to mount volume
    const volumeName = `project-${projectId}`;
    await this.dockerService.mountVolume(
      workspace.containerName,
      volumeName,
      '/workspace'
    );
  }
}
```

---

## Phase 4: Frontend UI Components

### 4.1 Workspace Selector Component
```typescript
// frontend/src/components/workspace/WorkspaceSelector.tsx
interface WorkspaceSelectorProps {
  userId: string;
  onSelect: (workspace: Workspace) => void;
  currentWorkspaceId?: string;
}

export function WorkspaceSelector({ userId, onSelect, currentWorkspaceId }: WorkspaceSelectorProps) {
  // Similar to AgentSelector
  // - List user's workspaces
  // - Show workspace type icons
  // - Show current project
  // - Create new workspace button
  // - Switch workspace action
}
```

### 4.2 Project Selector Component
```typescript
// frontend/src/components/workspace/ProjectSelector.tsx
interface ProjectSelectorProps {
  workspaceId: string;
  workspaceType: WorkspaceType;
  onSelect: (project: Project) => void;
  currentProjectId?: string;
}

export function ProjectSelector({ workspaceId, workspaceType, onSelect, currentProjectId }: ProjectSelectorProps) {
  // - List projects compatible with workspace type
  // - Show current project
  // - Create new project button
  // - Switch project action (triggers volume switch)
}
```

### 4.3 Create Workspace Modal
```typescript
// frontend/src/components/workspace/CreateWorkspaceModal.tsx
export function CreateWorkspaceModal() {
  // - Select workspace type (VSCode, Spreadsheet, etc)
  // - Enter workspace name
  // - Optional: Select initial project
  // - Create button (calls backend API)
}
```

### 4.4 Updated Workspace Page
```typescript
// frontend/src/app/workspace/page.tsx
export default function WorkspacePage() {
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Show workspace selector if no workspace selected
  if (!selectedWorkspace) {
    return <WorkspaceSelector onSelect={setSelectedWorkspace} />;
  }
  
  // Show project selector if no project selected
  if (!selectedProject) {
    return <ProjectSelector 
      workspaceId={selectedWorkspace.id}
      workspaceType={selectedWorkspace.type}
      onSelect={setSelectedProject}
    />;
  }
  
  // Render appropriate workspace container based on type
  return (
    <WorkspaceProvider workspace={selectedWorkspace} project={selectedProject}>
      {selectedWorkspace.type === WorkspaceType.VSCODE && <VSCodeContainer />}
      {selectedWorkspace.type === WorkspaceType.SPREADSHEET && <SpreadsheetContainer />}
    </WorkspaceProvider>
  );
}
```

---

## Phase 5: Spreadsheet Workspace Implementation

### 5.1 Spreadsheet Container
```dockerfile
# spreadsheet/Dockerfile
FROM node:22-slim

# Install spreadsheet engine (e.g., Handsontable, AG Grid, or custom)
RUN npm install -g @handsontable/react handsontable

# Install Python for data processing
RUN apt-get update && apt-get install -y python3 python3-pip
RUN pip3 install pandas openpyxl xlrd

WORKDIR /workspace

EXPOSE 8080

CMD ["npm", "start"]
```

### 5.2 Spreadsheet MCP Tools
```typescript
// mcp-spreadsheet/src/tools/spreadsheet-tools.ts
export const spreadsheetTools = [
  {
    name: 'read_spreadsheet',
    description: 'Read data from spreadsheet file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        sheet: { type: 'string' },
        range: { type: 'string' }
      }
    }
  },
  {
    name: 'write_spreadsheet',
    description: 'Write data to spreadsheet',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        sheet: { type: 'string' },
        data: { type: 'array' }
      }
    }
  },
  {
    name: 'create_chart',
    description: 'Create chart from spreadsheet data',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['bar', 'line', 'pie'] },
        dataRange: { type: 'string' }
      }
    }
  },
  {
    name: 'apply_formula',
    description: 'Apply formula to cells',
    inputSchema: {
      type: 'object',
      properties: {
        formula: { type: 'string' },
        range: { type: 'string' }
      }
    }
  },
  {
    name: 'analyze_data',
    description: 'Perform statistical analysis on data',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['sum', 'average', 'median', 'correlation'] },
        range: { type: 'string' }
      }
    }
  }
];
```

### 5.3 Spreadsheet UI Component
```typescript
// frontend/src/components/workspace/SpreadsheetContainer.tsx
export function SpreadsheetContainer() {
  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b p-2 flex items-center space-x-2">
        <button>New Sheet</button>
        <button>Import</button>
        <button>Export</button>
        <button>Charts</button>
      </div>
      
      {/* Spreadsheet Grid */}
      <div className="flex-1">
        <HotTable
          data={data}
          colHeaders={true}
          rowHeaders={true}
          width="100%"
          height="100%"
          licenseKey="non-commercial-and-evaluation"
        />
      </div>
      
      {/* Agent Panel */}
      <CollaborationPanel workspaceType={WorkspaceType.SPREADSHEET} />
    </div>
  );
}
```

---

## Phase 6: Agent Specialization

### 6.1 Workspace-Specific System Prompts
```typescript
// backend/src/conversations/conversations.service.ts
private async buildSystemPrompt(
  agent: Agent,
  conversationId: string,
  userMessage: string,
  workspaceType?: WorkspaceType
): Promise<string> {
  let systemPrompt = agent.configuration?.systemPrompt || 'You are a helpful AI assistant.';
  
  // Add workspace-specific context
  if (workspaceType && agent.configuration?.specializationContext) {
    const customPrompt = agent.configuration.specializationContext.customPrompts?.[workspaceType];
    if (customPrompt) {
      systemPrompt += `\n\n${customPrompt}`;
    }
  }
  
  // Add workspace-specific tool instructions
  if (workspaceType === WorkspaceType.SPREADSHEET) {
    systemPrompt += `\n\nYou are working in a spreadsheet environment. You have access to:
- read_spreadsheet: Read data from Excel/CSV files
- write_spreadsheet: Write data to spreadsheets
- create_chart: Generate visualizations
- apply_formula: Apply Excel formulas
- analyze_data: Perform statistical analysis

Focus on data analysis, visualization, and spreadsheet operations.`;
  }
  
  // ... rest of existing logic
}
```

### 6.2 Agent Filtering by Workspace Type
```typescript
// frontend/src/components/agent-settings/AgentSelector.tsx
// Update to filter agents by workspace type
const compatibleAgents = agents.filter(agent => {
  if (!agent.configuration?.supportedWorkspaceTypes) {
    return true; // Agent supports all workspace types
  }
  return agent.configuration.supportedWorkspaceTypes.includes(currentWorkspaceType);
});
```

---

## Phase 7: Memory Aggregation by Project

### 7.1 Project-Scoped Memory Context
```typescript
// backend/src/memory/memory.service.ts
async getMemoryContext(
  agentId: string,
  sessionId: string,
  query?: string,
  projectId?: string  // NEW: Filter by project
): Promise<MemoryContext> {
  // Get short-term memories
  let stmQuery: MemoryQuery = {
    agentId,
    sessionId,
    minImportance: 0.3
  };
  
  // Add project filter if provided
  if (projectId) {
    stmQuery.projectId = projectId;
  }
  
  const stmResult = await this.stmService.query(stmQuery);
  
  // Get long-term memories with project context
  const ltmResult = await this.ltmService.query({
    agentId,
    projectId,  // Filter LTM by project
    limit: 10
  });
  
  // ... rest of logic
}
```

### 7.2 Project Memory Summary
```typescript
// backend/src/memory/memory.service.ts
async getProjectMemorySummary(projectId: string): Promise<ProjectMemorySummary> {
  // Aggregate all memories related to this project
  const memories = await this.ltmService.query({ projectId });
  
  return {
    projectId,
    totalMemories: memories.length,
    categories: this.groupByCategory(memories),
    keyLearnings: this.extractKeyLearnings(memories),
    commonPatterns: this.identifyPatterns(memories),
    agentContributions: this.groupByAgent(memories)
  };
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create workspace type enum and interfaces
- [ ] Create Workspace entity and migration
- [ ] Update Project and Agent entities
- [ ] Create WorkspacesService with basic CRUD

### Phase 2: Backend Services (Week 1-2)
- [ ] Implement workspace CRUD operations
- [ ] Implement project-workspace association
- [ ] Implement agent-workspace compatibility checks
- [ ] Add project filtering to memory service

### Phase 3: Container Management (Week 2)
- [ ] Implement VolumeManagerService
- [ ] Add Docker SDK integration
- [ ] Implement volume switching logic
- [ ] Update docker-compose for dynamic volumes

### Phase 4: Frontend UI (Week 2-3)
- [ ] Create WorkspaceSelector component
- [ ] Create ProjectSelector component
- [ ] Create CreateWorkspaceModal
- [ ] Update workspace page with selectors
- [ ] Add workspace switching UI

### Phase 5: Spreadsheet Workspace (Week 3-4)
- [ ] Create spreadsheet container Dockerfile
- [ ] Implement spreadsheet MCP tools
- [ ] Create SpreadsheetContainer component
- [ ] Integrate spreadsheet UI library
- [ ] Test spreadsheet agent interactions

### Phase 6: Agent Specialization (Week 4)
- [ ] Add workspace-specific prompts
- [ ] Implement agent filtering by workspace type
- [ ] Update conversation service for workspace context
- [ ] Test agent specialization

### Phase 7: Testing & Polish (Week 4-5)
- [ ] Test workspace switching
- [ ] Test project volume switching
- [ ] Test memory aggregation by project
- [ ] Test agent specialization
- [ ] Performance optimization
- [ ] Documentation

---

## API Endpoints

### Workspaces
- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/:id` - Get workspace details
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace
- `POST /api/workspaces/:id/switch-project` - Switch project
- `POST /api/workspaces/:id/start` - Start workspace container
- `POST /api/workspaces/:id/stop` - Stop workspace container

### Projects (Updated)
- `GET /api/projects/workspace/:workspaceId` - Get projects by workspace
- `GET /api/projects/compatible/:workspaceType` - Get compatible projects
- `POST /api/projects/:id/assign-workspace` - Assign to workspace

### Agents (Updated)
- `GET /api/agents/workspace-type/:type` - Get agents by workspace type
- `GET /api/agents/:id/compatible/:workspaceType` - Check compatibility

### Memory (Updated)
- `GET /api/memory/project/:projectId` - Get project memories
- `GET /api/memory/project/:projectId/summary` - Get project memory summary

---

## Database Migrations

### Migration 1: Create workspaces table
```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL DEFAULT 'vscode',
  current_project_id UUID REFERENCES projects(id),
  config TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  container_name VARCHAR(255),
  volume_name VARCHAR(255),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX idx_workspaces_type ON workspaces(type);
```

### Migration 2: Update projects table
```sql
ALTER TABLE projects
ADD COLUMN workspace_id UUID REFERENCES workspaces(id),
ADD COLUMN workspace_type VARCHAR(50) DEFAULT 'vscode',
ADD COLUMN volume_path VARCHAR(500);

CREATE INDEX idx_projects_workspace_id ON projects(workspace_id);
```

### Migration 3: Update agents configuration
```sql
-- No schema change needed, just update configuration JSON
-- Add supportedWorkspaceTypes and specializationContext to existing agents
```

---

## Testing Strategy

### Unit Tests
- Workspace CRUD operations
- Volume switching logic
- Agent compatibility checks
- Memory filtering by project

### Integration Tests
- Workspace creation flow
- Project switching with volume mount
- Agent selection by workspace type
- Memory aggregation across projects

### E2E Tests
- Complete workspace creation and usage
- Switching between VSCode and Spreadsheet workspaces
- Agent interactions in different workspace types
- Memory persistence across project switches

---

## Success Criteria

1. ✅ Users can create multiple workspaces of different types
2. ✅ Users can switch between workspaces seamlessly
3. ✅ Projects are isolated in separate volumes
4. ✅ Agents are filtered by workspace compatibility
5. ✅ Memory is aggregated by project context
6. ✅ Spreadsheet workspace is functional with specialized tools
7. ✅ No data loss during workspace/project switching
8. ✅ Performance is acceptable (< 5s for workspace switch)

---

## Future Enhancements

- **Notebook Workspace**: Jupyter-style notebook environment
- **Database Workspace**: SQL query and schema management
- **Design Workspace**: Figma-like design tools
- **Collaborative Workspaces**: Multi-user real-time collaboration
- **Workspace Templates**: Pre-configured workspace setups
- **Workspace Sharing**: Share workspaces with team members
- **Workspace Snapshots**: Save and restore workspace states
- **Cloud Storage Integration**: Sync workspace files to cloud
