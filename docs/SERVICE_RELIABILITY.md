# Service Reliability & Connection Handling

This document explains how we ensure reliable service-to-service communication and prevent connection failures.

## Problem Statement

In Docker environments, services can experience connection failures due to:
1. **Startup timing issues**: Frontend starting before backend is ready
2. **Temporary network issues**: Brief connection failures
3. **Service restarts**: Services restarting and temporarily unavailable

## Multi-Layer Solution

We implement **defense in depth** with multiple layers of protection:

### Layer 1: Health Checks

All critical services have health checks that verify they're actually ready:

```yaml
backend:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
    interval: 10s      # Check every 10 seconds
    timeout: 5s        # Fail if check takes > 5s
    retries: 5         # Try 5 times before marking unhealthy
    start_period: 30s  # Grace period during startup
```

**Services with health checks:**
- ✅ Backend (HTTP /health endpoint)
- ✅ LLM Service (HTTP /health endpoint)
- ✅ PostgreSQL (pg_isready command)
- ✅ Redis (redis-cli ping)
- ✅ Qdrant (HTTP /health endpoint)

### Layer 2: Service Dependencies

Services wait for their dependencies to be **healthy** before starting:

```yaml
frontend:
  depends_on:
    backend:
      condition: service_healthy  # Wait for backend to be healthy

backend:
  depends_on:
    postgres:
      condition: service_healthy  # Wait for DB to be healthy
    redis:
      condition: service_healthy
    qdrant:
      condition: service_healthy
```

**Dependency chain:**
```
postgres, redis, qdrant (start first)
    ↓
backend (waits for all 3 to be healthy)
    ↓
frontend (waits for backend to be healthy)
```

### Layer 3: Startup Wait Scripts

Frontend has a wait script that actively checks backend availability:

```bash
# frontend/wait-for-backend.sh
until curl -f "$BACKEND_URL/health" > /dev/null 2>&1; do
  echo "Backend not ready yet... waiting"
  sleep 2
done
echo "Backend is ready! Starting frontend..."
```

**Benefits:**
- Extra safety layer beyond Docker health checks
- Provides clear logging of startup sequence
- Fails fast if backend never becomes available

### Layer 4: Retry Logic with Exponential Backoff

The backend client automatically retries failed requests:

```typescript
// frontend/src/lib/backend-client.ts
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;  // 1 second
const RETRY_BACKOFF_MULTIPLIER = 2;

// Retries: 1s, 2s, 4s (total ~7s of retries)
```

**Retryable errors:**
- Connection refused (ECONNREFUSED)
- Connection timeout (ETIMEDOUT)
- DNS resolution failures (ENOTFOUND)
- 5xx server errors (except 501)

**Example flow:**
```
Request 1: ECONNREFUSED → wait 1s → retry
Request 2: ECONNREFUSED → wait 2s → retry
Request 3: ECONNREFUSED → wait 4s → retry
Request 4: Success! ✅
```

### Layer 5: Restart Policies

All services automatically restart on failure:

```yaml
restart: unless-stopped
```

**Behavior:**
- Service crashes → Docker automatically restarts it
- Manual stop → Service stays stopped
- System reboot → Services auto-start

### Layer 6: Health Monitoring

Script to check all services:

```bash
./scripts/check-services-health.sh
```

**Output:**
```
=== Service Health Check ===
Checking frontend (port 3000)... ✅ HEALTHY
Checking backend (port 8000)... ✅ HEALTHY
Checking llm-service (port 9000)... ✅ HEALTHY
Checking postgres (port 5432)... ✅ HEALTHY
Checking redis (port 6379)... ✅ HEALTHY
Checking qdrant (port 6333)... ✅ HEALTHY

✅ All services are healthy
```

## How It Prevents Issues

### Scenario 1: Cold Start (All Services Starting)

```
1. Docker starts postgres, redis, qdrant
2. Health checks run every 10s
3. After ~10-20s, all 3 are healthy
4. Backend starts, connects to DB/Redis/Qdrant
5. Backend health check passes after ~20-30s
6. Frontend wait script checks backend
7. Backend is healthy, frontend starts
8. Frontend makes API call
9. If it fails, retry logic kicks in
10. Success! ✅
```

**Total time:** ~30-60 seconds for full stack startup

### Scenario 2: Backend Restarts During Operation

```
1. Backend crashes or restarts
2. Frontend makes API call
3. Connection refused (ECONNREFUSED)
4. Retry logic: wait 1s, retry
5. Still down, wait 2s, retry
6. Backend is back up, request succeeds ✅
```

**User impact:** 3-7 second delay (transparent retry)

### Scenario 3: Database Temporarily Unavailable

```
1. PostgreSQL restarts
2. Backend loses DB connection
3. Backend health check fails
4. Docker marks backend as unhealthy
5. Frontend requests fail with 5xx
6. Retry logic kicks in
7. PostgreSQL comes back
8. Backend reconnects
9. Health check passes
10. Retry succeeds ✅
```

**User impact:** Automatic recovery within seconds

## Testing the Solution

### Test 1: Restart Backend

```bash
docker-compose restart backend
# Frontend should continue working after brief delay
curl http://localhost:3000/api/auth/login
```

### Test 2: Restart All Services

```bash
docker-compose restart
# All services should come up in correct order
./scripts/check-services-health.sh
```

### Test 3: Simulate Network Issue

```bash
# Stop backend
docker-compose stop backend

# Try API call (should fail after retries)
curl http://localhost:3000/api/auth/login

# Start backend
docker-compose start backend

# Try again (should succeed)
curl http://localhost:3000/api/auth/login
```

## Monitoring in Production

### Check Service Health

```bash
# Quick check
docker-compose ps

# Detailed health check
./scripts/check-services-health.sh

# Watch health status
watch -n 5 './scripts/check-services-health.sh'
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Health check failures
docker-compose logs | grep -i "unhealthy\|health"
```

### Metrics to Monitor

1. **Service uptime**: How long services stay healthy
2. **Restart count**: How often services restart
3. **Health check failures**: Frequency of health check failures
4. **API retry rate**: How often requests need retries
5. **Startup time**: Time from start to healthy

## Best Practices

### When Adding New Services

1. **Add health check**:
   ```yaml
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:PORT/health"]
     interval: 10s
     timeout: 5s
     retries: 5
     start_period: 30s
   ```

2. **Add dependencies**:
   ```yaml
   depends_on:
     dependency-service:
       condition: service_healthy
   ```

3. **Add restart policy**:
   ```yaml
   restart: unless-stopped
   ```

4. **Implement /health endpoint** in your service

### When Adding New API Routes

Use the centralized backend client:

```typescript
import { backendGet, backendPost } from '@/lib/backend-client';

// Automatic retries included!
const response = await backendPost('/api/your-endpoint', data, token);
```

## Troubleshooting

### Frontend Can't Connect to Backend

1. Check backend health:
   ```bash
   docker-compose ps backend
   curl http://localhost:8000/health
   ```

2. Check logs:
   ```bash
   docker-compose logs backend | tail -50
   docker-compose logs frontend | tail -50
   ```

3. Check network:
   ```bash
   docker network inspect coding-agent-network
   ```

### Services Keep Restarting

1. Check resource limits:
   ```bash
   docker stats
   ```

2. Check health check logs:
   ```bash
   docker inspect agentdb9-backend-1 | jq '.[0].State.Health'
   ```

3. Increase health check grace period:
   ```yaml
   start_period: 60s  # Give more time to start
   ```

## Summary

This multi-layer approach ensures:
- ✅ Services start in correct order
- ✅ Temporary failures are automatically retried
- ✅ Services auto-restart on crashes
- ✅ Clear visibility into service health
- ✅ Graceful degradation under load
- ✅ Fast recovery from failures

**Result:** Robust, production-ready service communication that handles real-world failure scenarios.
