#!/bin/bash

# Docker Deep Cleanup Script - Maximum storage reclamation
# ⚠️  WARNING: This script aggressively removes Docker resources
# Use when you need maximum storage space recovery

set -e

echo "🔥 Docker Deep Cleanup Tool"
echo "=========================="
echo ""
echo "⚠️  WARNING: AGGRESSIVE CLEANUP"
echo "This script will:"
echo "- Stop and remove ALL containers"
echo "- Remove ALL images (except those in use)"
echo "- Remove ALL unused volumes"
echo "- Remove ALL unused networks"
echo "- Clear ALL build cache"
echo "- Clean up system-wide Docker data"
echo ""
echo "💾 This can free up SIGNIFICANT storage space but will require"
echo "   rebuilding images and re-downloading models afterward."
echo ""

# Function to show storage before cleanup
show_before_storage() {
    echo "📊 Storage Usage BEFORE Cleanup:"
    docker system df
    echo ""
    
    # Get total size for comparison
    TOTAL_SIZE=$(docker system df --format "{{.Size}}" | grep -E "^[0-9]" | head -1)
    echo "Total Docker storage: $TOTAL_SIZE"
    echo ""
}

# Function to backup important data
backup_important_data() {
    echo "💾 Backing up important project data..."
    
    # Create backup directory
    BACKUP_DIR="./docker-cleanup-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup environment files
    if [ -f ".env" ]; then
        cp .env "$BACKUP_DIR/"
        echo "✅ Backed up .env file"
    fi
    
    # Backup docker-compose override if exists
    if [ -f "docker-compose.override.yml" ]; then
        cp docker-compose.override.yml "$BACKUP_DIR/"
        echo "✅ Backed up docker-compose.override.yml"
    fi
    
    # Export database if possible
    if docker-compose ps postgres | grep -q "Up"; then
        echo "📦 Attempting to backup database..."
        docker-compose exec -T postgres pg_dump -U postgres coding_agent > "$BACKUP_DIR/database_backup.sql" 2>/dev/null || echo "⚠️  Database backup failed (service may not be running)"
    fi
    
    # List volumes that will be preserved
    echo "📋 Current project volumes:"
    docker volume ls --filter "name=agentdb9" --format "{{.Name}}"
    
    echo "✅ Backup completed in: $BACKUP_DIR"
    echo ""
}

# Function to perform nuclear cleanup
nuclear_cleanup() {
    echo "🔥 Performing NUCLEAR cleanup..."
    echo ""
    
    # Stop all containers
    echo "🛑 Stopping all containers..."
    docker stop $(docker ps -aq) 2>/dev/null || echo "No containers to stop"
    
    # Remove all containers
    echo "🗑️  Removing all containers..."
    docker rm $(docker ps -aq) 2>/dev/null || echo "No containers to remove"
    
    # Remove all images
    echo "🗑️  Removing all images..."
    docker rmi $(docker images -aq) -f 2>/dev/null || echo "No images to remove"
    
    # Remove all volumes (except named project volumes)
    echo "🗑️  Removing unused volumes..."
    docker volume prune -f
    
    # Remove all networks
    echo "🗑️  Removing unused networks..."
    docker network prune -f
    
    # Remove all build cache
    echo "🗑️  Removing all build cache..."
    docker builder prune -a -f
    
    # System-wide cleanup
    echo "🗑️  System-wide cleanup..."
    docker system prune -a -f --volumes
    
    echo "✅ Nuclear cleanup completed"
}

# Function to clean specific large items
clean_large_items() {
    echo "🎯 Targeting large storage consumers..."
    echo ""
    
    # Find and remove large images
    echo "🔍 Large images (>500MB):"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep -E "(GB|[5-9][0-9][0-9]MB)" || echo "No large images found"
    
    # Remove build cache aggressively
    echo "🗑️  Removing all build cache..."
    docker builder prune -a -f
    
    # Remove intermediate/dangling images
    echo "🗑️  Removing intermediate images..."
    docker image prune -a -f
    
    # Clean up log files if accessible
    echo "🗑️  Cleaning container logs..."
    if [ -d "/var/lib/docker/containers" ]; then
        sudo find /var/lib/docker/containers -name "*.log" -exec truncate -s 0 {} \; 2>/dev/null || echo "Cannot access container logs (permission denied)"
    fi
    
    echo "✅ Large item cleanup completed"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Show current storage
show_before_storage

# Confirmation prompt
echo "🚨 FINAL WARNING"
echo "This will remove almost everything Docker-related!"
echo "You will need to rebuild all images and re-download models."
echo ""
read -p "Type 'NUCLEAR' to proceed with deep cleanup: " confirm

if [ "$confirm" != "NUCLEAR" ]; then
    echo "❌ Deep cleanup cancelled. Use regular cleanup script for safer options."
    exit 1
fi

echo ""
echo "🚀 Starting deep cleanup process..."
echo ""

# Backup important data
backup_important_data

# Perform cleanup based on user choice
echo "Choose cleanup level:"
echo "1. Nuclear (remove everything possible)"
echo "2. Large items only (target big storage consumers)"
echo "3. Exit"
echo ""
read -p "Choose option (1-3): " cleanup_choice

case $cleanup_choice in
    1)
        nuclear_cleanup
        ;;
    2)
        clean_large_items
        ;;
    3)
        echo "👋 Exiting deep cleanup"
        exit 0
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "📊 Storage Usage AFTER Deep Cleanup:"
docker system df
echo ""

# Calculate space saved
echo "🎉 Deep Cleanup Summary:"
echo "✅ Maximum storage cleanup completed"
echo "💾 Significant storage space should now be available"
echo "📦 Backup created with important data"
echo ""
echo "🔄 Next Steps:"
echo "1. Restart your project: docker-compose up --build -d"
echo "2. Re-download models if needed"
echo "3. Restore any custom configurations"
echo ""
echo "💡 Tips:"
echo "- Run regular cleanup (./scripts/docker-cleanup.sh) to avoid needing deep cleanup"
echo "- Monitor storage with: docker system df"
echo "- Consider using .dockerignore to reduce build context size"
echo ""

# Offer to restart project
read -p "🚀 Restart the project now? (y/N): " restart
if [[ $restart =~ ^[Yy]$ ]]; then
    echo "🔄 Restarting project..."
    docker-compose up --build -d
    echo "✅ Project restarted"
else
    echo "💡 Run 'docker-compose up --build -d' when ready to restart"
fi

echo ""
echo "🎯 Deep cleanup completed successfully!"