#!/bin/sh
# wait-for-backend.sh - Wait for backend to be ready before starting frontend

set -e

BACKEND_URL="${BACKEND_URL:-http://backend:8000}"
MAX_ATTEMPTS=30
ATTEMPT=0

echo "Waiting for backend at $BACKEND_URL to be ready..."

until curl -f "$BACKEND_URL/health" > /dev/null 2>&1; do
  ATTEMPT=$((ATTEMPT + 1))
  if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    echo "ERROR: Backend did not become ready after $MAX_ATTEMPTS attempts"
    exit 1
  fi
  echo "Backend not ready yet (attempt $ATTEMPT/$MAX_ATTEMPTS)... waiting 2s"
  sleep 2
done

echo "Backend is ready! Starting frontend..."
exec "$@"
