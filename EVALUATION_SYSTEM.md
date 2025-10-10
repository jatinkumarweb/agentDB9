# Ground Truth Evaluation System

A comprehensive evaluation system for continuously assessing and scoring agent performance on real coding tasks.

## Overview

The evaluation system provides:
- **Ground Truth Dataset**: Predefined tasks with expected outputs for backend, frontend, and DevOps
- **Batch Processing**: Efficient evaluation of multiple tasks with caching
- **Multi-dimensional Scoring**: Accuracy, code quality, completeness, efficiency, maintainability, and security
- **LLM-based Evaluation**: Uses GPT-4o for complex evaluations and Llama 3.1 for simpler tasks
- **Memory Impact Analysis**: Compare agent performance with different memory configurations
- **Knowledge Source Analysis**: Evaluate the impact of knowledge sources on performance
- **Agent Comparison**: Side-by-side comparison of two agents on the same tasks

## Architecture

### Backend Components

#### Entities
- **EvaluationGroundTruth**: Stores task definitions with expected outputs and evaluation criteria
- **EvaluationResult**: Stores individual evaluation results with scores and details
- **EvaluationBatch**: Manages batch evaluation jobs with progress tracking
- **EvaluationCache**: Caches evaluation results to avoid redundant computations

#### Services
- **GroundTruthService**: Manages ground truth CRUD operations
- **EvaluationExecutor**: Executes individual evaluations and calls LLM evaluators
- **EvaluationService**: Orchestrates batch evaluations and manages workflows
- **EvaluationCacheService**: Handles caching logic with TTL and invalidation

### Frontend Components

#### Pages
- **/evaluation**: Main dashboard for agent comparison and batch management
- **/evaluation/memory**: Memory configuration impact evaluation
- **/evaluation/knowledge**: Knowledge source impact evaluation
- **/evaluation/results/[id]**: Detailed results view with real-time updates

## Evaluation Suites

### Backend Suite (10 tasks)
- REST API Endpoint Creation
- Database Query Optimization
- JWT Authentication Middleware
- WebSocket Event Handler
- Data Validation Service
- Caching Layer Implementation
- Rate Limiting Middleware
- File Upload Handler
- Background Job Queue
- API Documentation

### Frontend Suite (10 tasks)
- Form Component with Validation
- Data Table with Sorting/Filtering
- Modal Dialog Component
- State Management Setup
- Responsive Navigation
- Custom Hook for API Calls
- Infinite Scroll Component
- Toast Notification System
- Dark Mode Toggle
- File Upload with Preview

### DevOps Suite (10 tasks)
- Multi-stage Dockerfile
- Docker Compose Setup
- CI/CD Pipeline
- Nginx Configuration
- Kubernetes Deployment
- Monitoring Setup
- Backup Script
- Log Aggregation
- Infrastructure as Code
- Security Hardening

## Evaluation Process

### 1. Task Execution
```typescript
// Agent receives task description
const task = groundTruth.taskDescription;

// Agent generates solution
const solution = await agent.solve(task, {
  memoryType: 'both',
  knowledgeSources: [...]
});
```

### 2. LLM Evaluation
```typescript
// Primary evaluator (GPT-4o) for complex tasks
// Secondary evaluator (Llama 3.1) for simpler tasks
const evaluation = await evaluatorLLM.evaluate({
  agentOutput: solution,
  expectedOutput: groundTruth.expectedOutput,
  criteria: groundTruth.evaluationCriteria
});
```

### 3. Scoring
Scores are calculated on a 0-100 scale across multiple dimensions:
- **Accuracy** (30%): Correctness vs expected output
- **Code Quality** (25%): Style, patterns, best practices
- **Completeness** (20%): All requirements met
- **Efficiency** (10%): Performance and resource usage
- **Maintainability** (10%): Readability and documentation
- **Security** (5%): Vulnerability assessment (where applicable)

**Overall Score**: Weighted average based on criteria weights

### 4. Caching
Results are cached based on:
- Agent configuration (snapshot)
- Ground truth ID
- Memory configuration
- Knowledge sources

Cache TTL: 7 days (configurable)

## Usage

### 1. Seed Ground Truth Data
```bash
cd backend
npm run seed:evaluation
```

### 2. Compare Two Agents
```typescript
POST /api/evaluation/compare
{
  "agent1Id": "uuid",
  "agent2Id": "uuid",
  "evaluationSuite": "backend"
}
```

### 3. Evaluate Memory Impact
```typescript
POST /api/evaluation/memory
{
  "agentId": "uuid",
  "evaluationSuite": "frontend",
  "memoryConfigs": [null, "short-term", "long-term", "both"]
}
```

### 4. Evaluate Knowledge Impact
```typescript
POST /api/evaluation/knowledge
{
  "agentId": "uuid",
  "evaluationSuite": "devops",
  "knowledgeSources": [
    { "type": "file", "identifier": "src/config.ts" },
    { "type": "workspace", "identifier": "current-workspace" }
  ],
  "compareWithout": true
}
```

### 5. Monitor Progress
```typescript
GET /api/evaluation/batches/:id
// Returns batch status and progress
{
  "status": "running",
  "progress": {
    "total": 10,
    "completed": 5,
    "failed": 0,
    "currentTask": "Agent 1 - REST API Endpoint"
  }
}
```

## API Endpoints

### Ground Truth Management
- `POST /api/evaluation/ground-truth` - Create ground truth entry
- `GET /api/evaluation/ground-truth` - List all ground truth
- `GET /api/evaluation/ground-truth/:id` - Get specific entry
- `PUT /api/evaluation/ground-truth/:id` - Update entry
- `DELETE /api/evaluation/ground-truth/:id` - Delete entry

### Evaluation Execution
- `POST /api/evaluation/compare` - Compare two agents
- `POST /api/evaluation/memory` - Evaluate memory impact
- `POST /api/evaluation/knowledge` - Evaluate knowledge impact
- `GET /api/evaluation/results` - List results
- `GET /api/evaluation/results/:id` - Get specific result

### Batch Management
- `GET /api/evaluation/batches` - List all batches
- `GET /api/evaluation/batches/:id` - Get batch details
- `POST /api/evaluation/batches/:id/cancel` - Cancel batch
- `DELETE /api/evaluation/batches/:id` - Delete batch

### Cache Management
- `GET /api/evaluation/cache/status` - Get cache status
- `DELETE /api/evaluation/cache` - Clear all cache
- `DELETE /api/evaluation/cache/:key` - Clear specific entry

### Analytics
- `GET /api/evaluation/analytics/agent/:id` - Agent performance over time
- `GET /api/evaluation/analytics/comparison` - Historical comparisons

## Configuration

### LLM Evaluator Selection
```typescript
// In evaluation-executor.service.ts
private selectEvaluatorModel(groundTruth: EvaluationGroundTruth): string {
  const difficulty = groundTruth.metadata?.difficulty || 'medium';
  
  if (difficulty === 'hard') {
    return 'gpt-4o'; // Primary evaluator
  } else {
    return 'llama3.1:8b'; // Secondary evaluator
  }
}
```

### Cache TTL
```typescript
// In evaluation-cache.service.ts
private readonly CACHE_TTL_DAYS = 7;
```

## Best Practices

### 1. Agent Configuration Locking
- Agent configuration is snapshotted before evaluation
- Prevents configuration changes during evaluation
- Ensures cache validity

### 2. Batch Processing
- Evaluations run asynchronously in batches
- Progress updates via polling (no email notifications)
- User checks status on UI

### 3. Cost Optimization
- Use cache to avoid redundant evaluations
- Use secondary evaluator (Llama 3.1) for simpler tasks
- Batch evaluations to reduce overhead

### 4. Error Handling
- Failed evaluations are logged with error messages
- Batch continues even if individual tasks fail
- Fallback scoring when LLM evaluation fails

## Future Enhancements

1. **Real-time WebSocket Updates**: Replace polling with WebSocket for live progress
2. **Custom Evaluation Criteria**: Allow users to define custom scoring dimensions
3. **Comparative Analytics**: Advanced visualizations for agent performance trends
4. **Export Reports**: PDF/CSV export of evaluation results
5. **Scheduled Evaluations**: Cron-based automatic evaluations
6. **Multi-model Evaluation**: Use multiple LLMs and aggregate scores
7. **Fine-tuning Integration**: Use evaluation results for model fine-tuning

## Troubleshooting

### Cache Issues
```bash
# Clear all cache
curl -X DELETE http://localhost:8000/evaluation/cache

# Check cache status
curl http://localhost:8000/evaluation/cache/status
```

### Stuck Batches
```bash
# Cancel a running batch
curl -X POST http://localhost:8000/evaluation/batches/:id/cancel

# Delete a batch
curl -X DELETE http://localhost:8000/evaluation/batches/:id
```

### Database Issues
```bash
# Reset database (will clear all evaluation data)
cd backend
npm run db:reset
npm run seed:evaluation
```

## Contributing

When adding new ground truth tasks:

1. Add to appropriate suite in `backend/src/evaluation/seed-data.ts`
2. Follow the existing structure:
   - Clear task description
   - Expected output definition
   - Evaluation criteria with weights
   - Metadata (language, framework, difficulty, tags)
3. Run seed script to update database
4. Test with at least one agent

## License

Part of AgentDB9 project. See main LICENSE file.
