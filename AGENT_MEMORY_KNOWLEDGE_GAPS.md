# Agent Memory & Knowledge Base Integration Gaps

## Current State Analysis

### ✅ What Exists (Backend)

1. **Memory System (Backend)**
   - `MemoryController` with endpoints for:
     - Creating memories
     - Getting memory context
     - Querying memories
     - Getting stats
     - Consolidating memories
     - Clearing session memories
   - `LongTermMemoryService` and `ShortTermMemoryService`
   - `MemoryConsolidationService`
   - Database entity: `LongTermMemory`

2. **Knowledge Base System (Backend)**
   - `KnowledgeController` with endpoints for:
     - Ingesting knowledge sources
     - Retrieving knowledge
     - Getting agent knowledge context
     - Adding/updating/deleting sources
     - Listing sources
   - `KnowledgeService` with full implementation
   - Database entities: `KnowledgeSource`, `DocumentChunk`

3. **Agent Configuration (Backend)**
   - `AgentConfiguration` interface includes:
     - `knowledgeBase?: KnowledgeBaseConfiguration`
   - Knowledge base config supports:
     - Multiple embedding providers
     - Vector stores (Qdrant, etc.)
     - Chunk size/overlap settings
     - Multiple source types (PDF, markdown, website, API, GitHub, documentation)

### ❌ What's Missing

#### 1. **Frontend UI for Agent Memory Management**
   - No UI to view agent's long-term memories
   - No UI to manually add memories to agents
   - No UI to view memory statistics
   - No UI to trigger memory consolidation
   - No memory context display during conversations

#### 2. **Frontend UI for Knowledge Base Management**
   - No UI to add knowledge sources to agents
   - No UI to upload files (PDF, markdown) as knowledge
   - No UI to add URLs/websites as knowledge
   - No UI to view/manage existing knowledge sources
   - No UI to see knowledge source status (pending, indexed, failed)
   - No UI to trigger re-indexing

#### 3. **Agent Creation/Edit Form Enhancements**
   - Current form only has:
     - Name
     - Description
     - Model selection
     - Temperature
     - Max tokens
   - Missing:
     - Knowledge base configuration toggle
     - Memory settings
     - Code style preferences
     - Auto-save/format/test options
     - System prompt customization

#### 4. **File Upload Infrastructure**
   - No file upload component
   - No file storage service
   - No file processing pipeline
   - No progress indicators for file processing

#### 5. **Agent Settings/Configuration Page**
   - No dedicated page to edit agent after creation
   - No way to update agent configuration
   - No way to manage agent's knowledge base
   - No way to view/manage agent's memories

## Proposed Implementation

### Phase 1: Agent Configuration Enhancement

**Backend:**
- ✅ Already exists - no changes needed

**Frontend:**
1. Create `AgentConfigurationForm` component with tabs:
   - Basic Info (name, description, model)
   - Advanced Settings (temperature, tokens, system prompt)
   - Code Style (indent, quotes, semicolons, etc.)
   - Automation (auto-save, auto-format, auto-test)
   - Knowledge Base (toggle, settings)
   - Memory Settings (retention, consolidation)

2. Create `AgentEditModal` or dedicated page at `/agents/[id]/settings`

### Phase 2: Knowledge Base Management

**Backend:**
- ✅ Already exists - endpoints ready

**Frontend:**
1. Create `KnowledgeSourceManager` component:
   - List existing sources
   - Add new sources (URL, file upload, GitHub repo)
   - View source status and metadata
   - Delete sources
   - Trigger re-indexing

2. Create `FileUploader` component:
   - Drag & drop interface
   - Support PDF, markdown, text files
   - Progress indicator
   - Error handling

3. Create `KnowledgeSourceCard` component:
   - Display source info
   - Show indexing status
   - Show chunk count, token count
   - Actions: edit, delete, re-index

### Phase 3: Memory Management

**Backend:**
- ✅ Already exists - endpoints ready

**Frontend:**
1. Create `MemoryViewer` component:
   - Display long-term memories
   - Filter by category (lesson, challenge, feedback, etc.)
   - Search memories
   - View memory metadata

2. Create `MemoryStats` component:
   - Show memory statistics
   - Visualize memory distribution
   - Show consolidation history

3. Create `MemoryCreator` component:
   - Manually add memories
   - Select category
   - Set importance
   - Add tags

4. Integrate memory context in chat:
   - Show relevant memories during conversation
   - Highlight when agent uses memory
   - Allow user to add conversation to memory

### Phase 4: Integration

1. **Agent Dashboard Enhancement:**
   - Add "Knowledge" tab showing sources
   - Add "Memory" tab showing memories
   - Add "Settings" tab for configuration

2. **Chat Interface Enhancement:**
   - Show active knowledge sources
   - Display memory context being used
   - Add quick actions to save to memory

3. **Agent Card Enhancement:**
   - Show knowledge source count
   - Show memory count
   - Show last updated

## API Endpoints Already Available

### Memory Endpoints
```
POST   /memory                          - Create memory
GET    /memory/context/:agentId/:sessionId  - Get memory context
POST   /memory/query                    - Query memories
GET    /memory/stats/:agentId           - Get memory stats
POST   /memory/consolidate              - Consolidate memories
POST   /memory/clear/:agentId/:sessionId - Clear session memories
```

### Knowledge Endpoints
```
POST   /knowledge/ingest                - Ingest knowledge source
POST   /knowledge/retrieve              - Retrieve knowledge
GET    /knowledge/context/:agentId      - Get agent knowledge context
POST   /knowledge/sources/:agentId      - Add knowledge source
PUT    /knowledge/sources/:sourceId     - Update knowledge source
DELETE /knowledge/sources/:sourceId     - Delete knowledge source
GET    /knowledge/sources/:agentId      - List knowledge sources
```

### Agent Endpoints
```
GET    /api/agents                      - List agents
POST   /api/agents                      - Create agent
GET    /api/agents/:id                  - Get agent
PUT    /api/agents/:id                  - Update agent
DELETE /api/agents/:id                  - Delete agent
```

## Recommended Next Steps

1. **Start with Agent Edit/Settings Page**
   - Create `/agents/[id]/settings` page
   - Implement tabbed interface
   - Add all configuration options

2. **Add Knowledge Base Management**
   - Create knowledge source manager component
   - Implement file upload
   - Connect to existing backend endpoints

3. **Add Memory Management**
   - Create memory viewer component
   - Add memory creation UI
   - Integrate memory context in chat

4. **Enhance Agent Creation**
   - Expand AgentCreator form
   - Add knowledge base setup during creation
   - Add memory configuration options

## Technical Considerations

1. **File Upload:**
   - Use multipart/form-data
   - Implement chunked upload for large files
   - Add file type validation
   - Store files in backend (filesystem or S3)

2. **Real-time Updates:**
   - Use WebSocket for indexing progress
   - Show live status updates
   - Notify when processing completes

3. **Error Handling:**
   - Handle failed uploads gracefully
   - Show clear error messages
   - Allow retry for failed operations

4. **Performance:**
   - Paginate memory/knowledge lists
   - Lazy load large datasets
   - Cache frequently accessed data

5. **UX:**
   - Use loading states
   - Show progress indicators
   - Provide clear feedback
   - Make actions reversible where possible
