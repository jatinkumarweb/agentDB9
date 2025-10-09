#!/bin/bash

set -e

echo "🧹 Docker Cache Clearing Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Docker is running"
echo ""

# Display current Docker disk usage
echo "📊 Current Docker Disk Usage:"
docker system df
echo ""

# Ask for confirmation
read -p "Do you want to proceed with cache clearing? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Operation cancelled"
    exit 0
fi

echo ""
echo "🔄 Starting cache clearing process..."
echo ""

# 1. Clear build cache
echo "1️⃣  Clearing Docker build cache..."
if docker builder prune -af --filter "until=1h" 2>/dev/null; then
    print_status "Build cache cleared (older than 1 hour)"
else
    print_warning "Could not clear build cache (may not exist)"
fi
echo ""

# 2. Remove stopped containers
echo "2️⃣  Removing stopped containers..."
STOPPED_CONTAINERS=$(docker ps -aq -f status=exited -f status=created 2>/dev/null | wc -l)
if [ "$STOPPED_CONTAINERS" -gt 0 ]; then
    docker container prune -f
    print_status "Removed $STOPPED_CONTAINERS stopped container(s)"
else
    print_warning "No stopped containers to remove"
fi
echo ""

# 3. Remove dangling images
echo "3️⃣  Removing dangling images..."
DANGLING_IMAGES=$(docker images -f "dangling=true" -q 2>/dev/null | wc -l)
if [ "$DANGLING_IMAGES" -gt 0 ]; then
    docker image prune -f
    print_status "Removed $DANGLING_IMAGES dangling image(s)"
else
    print_warning "No dangling images to remove"
fi
echo ""

# 4. Remove unused volumes
echo "4️⃣  Removing unused volumes..."
UNUSED_VOLUMES=$(docker volume ls -qf dangling=true 2>/dev/null | wc -l)
if [ "$UNUSED_VOLUMES" -gt 0 ]; then
    docker volume prune -f
    print_status "Removed $UNUSED_VOLUMES unused volume(s)"
else
    print_warning "No unused volumes to remove"
fi
echo ""

# 5. Remove unused networks
echo "5️⃣  Removing unused networks..."
docker network prune -f
print_status "Unused networks removed"
echo ""

# 6. Clear cache in running containers (if any)
echo "6️⃣  Clearing cache in running containers..."
RUNNING_CONTAINERS=$(docker ps -q)
if [ -n "$RUNNING_CONTAINERS" ]; then
    for container in $RUNNING_CONTAINERS; do
        CONTAINER_NAME=$(docker inspect --format='{{.Name}}' "$container" | sed 's/\///')
        echo "   Clearing cache in: $CONTAINER_NAME"
        
        # Try common cache locations
        docker exec "$container" sh -c 'rm -rf /tmp/* 2>/dev/null || true' 2>/dev/null || true
        docker exec "$container" sh -c 'rm -rf /var/cache/* 2>/dev/null || true' 2>/dev/null || true
        docker exec "$container" sh -c 'rm -rf /root/.cache/* 2>/dev/null || true' 2>/dev/null || true
        docker exec "$container" sh -c 'rm -rf /home/*/.cache/* 2>/dev/null || true' 2>/dev/null || true
        
        # Node.js specific cache
        docker exec "$container" sh -c 'rm -rf /root/.npm 2>/dev/null || true' 2>/dev/null || true
        docker exec "$container" sh -c 'rm -rf /home/*/.npm 2>/dev/null || true' 2>/dev/null || true
        
        # Python specific cache
        docker exec "$container" sh -c 'find / -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true' 2>/dev/null || true
        docker exec "$container" sh -c 'rm -rf /root/.cache/pip 2>/dev/null || true' 2>/dev/null || true
        
        print_status "Cache cleared in $CONTAINER_NAME"
    done
else
    print_warning "No running containers found"
fi
echo ""

# 7. Optional: Full system prune (commented out by default for safety)
echo "7️⃣  Full system prune (optional)..."
read -p "Do you want to perform a FULL system prune? This will remove ALL unused data (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker system prune -af --volumes
    print_status "Full system prune completed"
else
    print_warning "Skipped full system prune"
fi
echo ""

# Display final Docker disk usage
echo "📊 Final Docker Disk Usage:"
docker system df
echo ""

print_status "Docker cache clearing completed!"
echo ""
echo "💡 Tips:"
echo "   - Run this script periodically to keep Docker clean"
echo "   - Use 'docker system df' to check disk usage anytime"
echo "   - Use 'docker system prune -af --volumes' for aggressive cleanup"
echo ""
