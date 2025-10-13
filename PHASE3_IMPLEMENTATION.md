# Phase 3 Implementation - Advanced Container & Volume Management

## Implementation Date
2025-10-13

## Overview
Phase 3 adds advanced container and volume management features including resource limits, health monitoring, volume backup/restore, automatic cleanup, and real-time logs streaming. This phase enhances the workspace orchestration system with production-ready operational capabilities.

## Components Implemented

### 1. Container Resource Limits

**Updated Files:**
- `shared/src/types/workspace.ts` - Added resource limit interfaces
- `backend/src/workspaces/workspace-container.service.ts` - Applied resource limits to containers

**New Interfaces:**
```typescript
interface ContainerResourceLimits {
  cpus?: number;              // CPU limit (e.g., 1.5 = 1.5 cores)
  memory?: number;            // Memory limit in MB
  memorySwap?: number;        // Memory + swap limit in MB
  memoryReservation?: number; // Soft memory limit in MB
}
```

**Workspace Type Configurations:**
- **VSCode:** 2 CPUs, 2048MB memory, 512MB reservation
- **Spreadsheet:** 1.5 CPUs, 1536MB memory, 384MB reservation

**Features:**
- CPU limits using Docker NanoCpus (nanosecond precision)
- Memory limits with hard and soft constraints
- Memory swap configuration
- Automatic resource limit application during container creation

### 2. Container Health Checks

**Updated Files:**
- `shared/src/types/workspace.ts` - Added health check configuration
- `backend/src/workspaces/workspace-container.service.ts` - Implemented health monitoring

**Health Check Configuration:**
```typescript
healthCheck: {
  enabled: boolean;
  interval?: number;        // Health check interval in seconds
  timeout?: number;         // Health check timeout in seconds
  retries?: number;         // Number of retries before unhealthy
}
```

**Default Configuration:**
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3
- Start period: 60 seconds (grace period)
- Test command: `curl -f http://localhost:{port}/healthz || exit 1`

**New Methods:**
- `getContainerHealth(workspaceId)` - Get detailed health status
- Enhanced `getWorkspaceStatus()` - Includes health information

**Health Status Response:**
```json
{
  "healthy": true,
  "status": "healthy",
  "failingStreak": 0,
  "lastCheck": {
    "exitCode": 0,
    "output": "...",
    "timestamp": "2025-10-13T15:00:00Z"
  }
}
```

### 3. Volume Backup and Restore

**Updated File:** `backend/src/workspaces/docker-volume.service.ts`

**New Methods:**

#### `backupProjectVolume(projectId, backupPath?)`
Creates a compressed tar backup of a project volume.

**Process:**
1. Creates temporary Alpine container
2. Mounts volume as read-only
3. Creates tar.gz archive
4. Stores backup at specified path or `/tmp/agentdb9-backup-{projectId}-{timestamp}.tar`

**Usage:**
```typescript
const backupPath = await volumeService.backupProjectVolume('project-123');
// Returns: /tmp/agentdb9-backup-project-123-2025-10-13T15-00-00.tar
```

#### `restoreProjectVolume(projectId, backupPath)`
Restores a project volume from a backup archive.

**Process:**
1. Ensures target volume exists
2. Creates temporary Alpine container
3. Extracts tar.gz archive to volume
4. Cleans up temporary container

#### `cloneProjectVolume(sourceProjectId, targetProjectId)`
Clones a project volume to create a duplicate.

**Process:**
1. Creates target volume
2. Copies all data from source to target
3. Returns new volume name

**Use Cases:**
- Project templates
- Workspace duplication
- Testing with production data

#### `getVolumeSize(projectId)`
Calculates the size of a project volume in bytes.

**Returns:**
```json
{
  "sizeBytes": 1234567890,
  "sizeMB": 1177.38,
  "sizeGB": 1.15
}
```

### 4. Automatic Container Cleanup

**New File:** `backend/src/workspaces/workspace-cleanup.service.ts`

Automated cleanup service with scheduled tasks using `@nestjs/schedule`.

**Cleanup Tasks:**

#### 1. Inactive Container Cleanup
**Schedule:** Every hour  
**Action:** Stops containers inactive for >24 hours

```typescript
@Cron(CronExpression.EVERY_HOUR)
async cleanupInactiveContainers()
```

**Logic:**
- Finds workspaces with status=RUNNING and updatedAt >24h ago
- Verifies container is actually running
- Stops container to free resources

#### 2. Orphaned Container Cleanup
**Schedule:** Every 6 hours  
**Action:** Removes containers not associated with any workspace

```typescript
@Cron(CronExpression.EVERY_6_HOURS)
async cleanupOrphanedContainers()
```

**Logic:**
- Lists all containers with label `agentdb9.managed=true`
- Compares with workspace database records
- Removes containers without matching workspace

#### 3. Orphaned Volume Cleanup
**Schedule:** Daily at 2 AM  
**Action:** Removes volumes for deleted projects

```typescript
@Cron(CronExpression.EVERY_DAY_AT_2AM)
async cleanupOrphanedVolumes()
```

**Logic:**
- Lists all volumes with label `agentdb9.managed=true`
- Checks if associated project exists
- Removes volumes for non-existent projects

#### 4. Error Workspace Recovery
**Schedule:** Every 30 minutes  
**Action:** Attempts to recover or clean up workspaces in error state

```typescript
@Cron(CronExpression.EVERY_30_MINUTES)
async cleanupErrorWorkspaces()
```

**Logic:**
- Finds workspaces with status=ERROR
- Checks actual container status
- Recovers if container is running
- Cleans up if container is stopped

**Manual Trigger:**
```bash
POST /api/workspaces/cleanup
```

Returns cleanup statistics:
```json
{
  "inactiveContainers": 2,
  "orphanedContainers": 1,
  "orphanedVolumes": 3,
  "errorWorkspaces": 0
}
```

### 5. Container Logs Streaming

**Updated File:** `backend/src/workspaces/workspace-container.service.ts`

**New Methods:**

#### `getContainerLogs(workspaceId, options)`
Retrieves container logs with flexible options.

**Options:**
```typescript
{
  tail?: number;        // Number of lines from end (default: 100)
  since?: number;       // Unix timestamp to start from
  timestamps?: boolean; // Include timestamps (default: false)
  follow?: boolean;     // Stream logs in real-time (default: false)
}
```

**Returns:** NodeJS.ReadableStream

#### `getContainerStats(workspaceId)`
Gets real-time container resource usage statistics.

**Returns:**
```json
{
  "cpu": {
    "percent": 15.5,
    "usage": 1234567890,
    "systemUsage": 9876543210
  },
  "memory": {
    "percent": 45.2,
    "usage": 924,
    "limit": 2048,
    "cache": 128
  },
  "network": { /* network stats */ },
  "blockIO": { /* disk I/O stats */ }
}
```

**New API Endpoints:**

#### GET `/api/workspaces/:id/logs`
Get recent container logs.

**Query Parameters:**
- `tail` - Number of lines (default: 100)
- `since` - Unix timestamp
- `timestamps` - Include timestamps (true/false)

**Response:** Plain text log output

#### GET `/api/workspaces/:id/logs/stream`
Stream container logs in real-time.

**Query Parameters:**
- `timestamps` - Include timestamps (true/false)

**Response:** Server-Sent Events (SSE) stream

**Usage:**
```javascript
const eventSource = new EventSource('/api/workspaces/123/logs/stream');
eventSource.onmessage = (event) => {
  console.log(event.data);
};
```

#### GET `/api/workspaces/:id/stats`
Get real-time container resource statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "cpu": { "percent": 15.5, ... },
    "memory": { "percent": 45.2, ... },
    "network": { ... },
    "blockIO": { ... }
  }
}
```

### 6. Enhanced Status Monitoring

**Updated:** `getWorkspaceStatus()` method

Now includes comprehensive status information:

```json
{
  "status": "running",
  "containerRunning": true,
  "containerInfo": { /* Docker inspect info */ },
  "health": {
    "status": "healthy",
    "failingStreak": 0,
    "log": [ /* last 3 health checks */ ]
  },
  "resources": {
    "cpuUsage": 15.5,
    "memoryUsage": 924,
    "memoryLimit": 2048
  }
}
```

## API Endpoints Summary

### Phase 3 New Endpoints (10)

**Health Monitoring:**
- GET `/api/workspaces/:id/health` - Get container health status

**Logs & Stats:**
- GET `/api/workspaces/:id/logs` - Get container logs
- GET `/api/workspaces/:id/logs/stream` - Stream logs in real-time
- GET `/api/workspaces/:id/stats` - Get resource statistics

**Volume Management:**
- POST `/api/workspaces/projects/:projectId/backup` - Backup volume
- POST `/api/workspaces/projects/:projectId/restore` - Restore volume
- POST `/api/workspaces/projects/:projectId/clone` - Clone volume
- GET `/api/workspaces/projects/:projectId/volume-size` - Get volume size

**Cleanup:**
- POST `/api/workspaces/cleanup` - Trigger manual cleanup

**Total Workspace API:** 30 endpoints (20 from Phase 1-2 + 10 from Phase 3)

## Dependencies Added

```json
{
  "dependencies": {
    "@nestjs/schedule": "^4.0.0"
  }
}
```

## Configuration Updates

### Docker Compose
Added documentation for dynamic workspace containers in `docker-compose.yml`:

```yaml
# Dynamic workspace containers are created by the backend service
# Example configuration:
# agentdb9-workspace-{id}:
#   image: codercom/code-server:latest
#   deploy:
#     resources:
#       limits:
#         cpus: '2.0'
#         memory: 2G
#   healthcheck:
#     test: ["CMD-SHELL", "curl -f http://localhost:8080/healthz || exit 1"]
#     interval: 30s
#     timeout: 10s
#     retries: 3
```

## Testing

### Integration Tests
**File:** `backend/test/workspaces-phase3.e2e-spec.ts`

**Test Coverage:**
- Container resource limits configuration
- Health check monitoring
- Volume backup and restore
- Container logs retrieval
- Container stats monitoring
- Automatic cleanup triggers
- Enhanced status information

**Test Cases:** 10+ scenarios with Docker availability checks

## Architecture Decisions

### 1. Resource Limits
**Decision:** Apply resource limits at container creation time.

**Rationale:**
- Prevents resource exhaustion
- Ensures fair resource allocation
- Protects host system stability
- Configurable per workspace type

### 2. Health Checks
**Decision:** Use HTTP-based health checks with curl.

**Rationale:**
- Standard Docker health check mechanism
- Works with most web-based workspaces
- Configurable per workspace type
- Automatic container restart on failure

### 3. Volume Backup Strategy
**Decision:** Use tar.gz compression with temporary containers.

**Rationale:**
- Portable backup format
- Good compression ratio
- No external dependencies
- Works with any volume driver

### 4. Automatic Cleanup
**Decision:** Use scheduled cron jobs with configurable intervals.

**Rationale:**
- Automatic resource management
- Prevents resource leaks
- Configurable cleanup policies
- Manual trigger available for immediate cleanup

### 5. Log Streaming
**Decision:** Use Docker logs API with streaming support.

**Rationale:**
- Real-time log access
- No additional logging infrastructure
- Supports both batch and streaming modes
- Efficient for debugging

## Performance Considerations

### 1. Resource Limits
- CPU limits prevent CPU starvation
- Memory limits prevent OOM kills
- Soft limits allow burst capacity
- Configurable per workspace type

### 2. Health Checks
- 30-second interval balances responsiveness and overhead
- 60-second start period allows container initialization
- 3 retries prevent false positives

### 3. Cleanup Operations
- Scheduled during low-usage periods
- Incremental cleanup prevents system overload
- Manual trigger for immediate needs

### 4. Log Streaming
- Tail parameter limits data transfer
- Streaming mode for real-time monitoring
- Automatic cleanup of old logs

## Security Considerations

### 1. Resource Isolation
- CPU and memory limits prevent resource abuse
- Container-level isolation
- Network isolation through Docker networks

### 2. Volume Backups
- Backups stored in secure location
- Read-only volume mounts during backup
- Automatic cleanup of temporary containers

### 3. Log Access
- Authentication required for log access
- User ownership validation
- No sensitive data in logs (responsibility of workspace)

## Operational Benefits

### 1. Resource Management
- Automatic resource limit enforcement
- Prevents runaway containers
- Fair resource allocation

### 2. Health Monitoring
- Automatic detection of unhealthy containers
- Proactive issue identification
- Automatic recovery attempts

### 3. Data Protection
- Volume backup and restore capabilities
- Volume cloning for templates
- Disaster recovery support

### 4. System Maintenance
- Automatic cleanup of unused resources
- Orphaned resource detection
- Error state recovery

### 5. Debugging Support
- Real-time log streaming
- Historical log access
- Resource usage monitoring

## Known Limitations

### 1. Backup Storage
- Backups stored locally on host
- No automatic backup rotation
- Manual backup management required

**Future:** Implement backup rotation and remote storage

### 2. Health Check Customization
- Fixed HTTP-based health check
- Not customizable per workspace instance

**Future:** Allow custom health check commands

### 3. Resource Limit Updates
- Requires container recreation to change limits
- No hot-reload of resource limits

**Future:** Implement dynamic resource limit updates

## Troubleshooting

### Health Check Failures
**Symptoms:** Container marked as unhealthy

**Solutions:**
1. Check container logs: `GET /api/workspaces/{id}/logs`
2. Verify health endpoint exists in container
3. Check network connectivity
4. Review health check configuration

### Backup Failures
**Symptoms:** Backup operation fails

**Solutions:**
1. Verify Docker socket access
2. Check disk space for backup storage
3. Ensure volume exists and is accessible
4. Review Docker logs for errors

### Cleanup Not Running
**Symptoms:** Orphaned resources accumulating

**Solutions:**
1. Check scheduler is enabled
2. Verify cron expressions are correct
3. Review cleanup service logs
4. Trigger manual cleanup: `POST /api/workspaces/cleanup`

### Log Streaming Issues
**Symptoms:** Logs not streaming or incomplete

**Solutions:**
1. Verify container is running
2. Check network connectivity
3. Ensure proper authentication
4. Review container log configuration

## Future Enhancements (Phase 4+)

### Phase 4: Frontend UI
- Resource usage visualization
- Real-time log viewer component
- Health status indicators
- Backup/restore UI

### Phase 5: Advanced Features
- Remote backup storage (S3, Azure Blob)
- Backup scheduling and rotation
- Custom health check commands
- Dynamic resource limit updates
- Multi-host container orchestration

### Phase 6: Monitoring & Alerts
- Prometheus metrics export
- Alert rules for unhealthy containers
- Resource usage alerts
- Automated incident response

## Conclusion

Phase 3 successfully implements advanced container and volume management features, providing:
- ✅ Container resource limits (CPU, memory)
- ✅ Health check monitoring with automatic recovery
- ✅ Volume backup, restore, and cloning
- ✅ Automatic cleanup of inactive/orphaned resources
- ✅ Real-time log streaming and statistics
- ✅ 10 new API endpoints
- ✅ Comprehensive integration tests
- ✅ Production-ready operational capabilities

The workspace orchestration system now has enterprise-grade operational features including resource management, health monitoring, data protection, and automated maintenance.

**Next Steps:**
1. Build frontend UI components for Phase 4
2. Implement remote backup storage
3. Add Prometheus metrics export
4. Create monitoring dashboards
5. Implement alert rules and notifications
