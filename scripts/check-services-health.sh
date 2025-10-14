#!/bin/bash
# check-services-health.sh - Monitor health of all services

set -e

SERVICES=("frontend:3000" "backend:8000" "llm-service:9000" "postgres:5432" "redis:6379" "qdrant:6333")
ALL_HEALTHY=true

echo "=== Service Health Check ==="
echo "Timestamp: $(date)"
echo ""

for service_port in "${SERVICES[@]}"; do
  IFS=':' read -r service port <<< "$service_port"
  
  echo -n "Checking $service (port $port)... "
  
  # Check if container is running
  if ! docker-compose ps "$service" 2>/dev/null | grep -q "Up"; then
    echo "❌ NOT RUNNING"
    ALL_HEALTHY=false
    continue
  fi
  
  # Check health status
  health=$(docker-compose ps "$service" --format json 2>/dev/null | jq -r '.[0].Health // "no-healthcheck"')
  
  case "$health" in
    "healthy")
      echo "✅ HEALTHY"
      ;;
    "starting")
      echo "⏳ STARTING"
      ALL_HEALTHY=false
      ;;
    "unhealthy")
      echo "❌ UNHEALTHY"
      ALL_HEALTHY=false
      ;;
    "no-healthcheck")
      # Fallback: check if port is listening
      if docker-compose exec -T "$service" sh -c "command -v nc >/dev/null && nc -z localhost $port" 2>/dev/null; then
        echo "✅ RUNNING (no healthcheck)"
      else
        echo "⚠️  UNKNOWN (no healthcheck)"
      fi
      ;;
    *)
      echo "⚠️  UNKNOWN ($health)"
      ;;
  esac
done

echo ""
if [ "$ALL_HEALTHY" = true ]; then
  echo "✅ All services are healthy"
  exit 0
else
  echo "❌ Some services are not healthy"
  exit 1
fi
