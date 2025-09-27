#!/bin/bash

# Docker Cleanup Script - Reclaim storage space
# This script safely cleans up Docker resources while preserving project data

set -e

echo "🧹 Docker Storage Cleanup Tool"
echo "=============================="
echo ""

# Function to show storage usage
show_storage() {
    echo "📊 Current Docker Storage Usage:"
    docker system df
    echo ""
}

# Function to show detailed breakdown
show_detailed_storage() {
    echo "📋 Detailed Storage Breakdown:"
    echo ""
    echo "Images:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -20
    echo ""
    echo "Containers:"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Size}}" | head -20
    echo ""
    echo "Volumes:"
    docker volume ls -q | xargs docker volume inspect --format '{{.Name}}: {{.Mountpoint}}' 2>/dev/null | head -10
    echo ""
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Show current usage
show_storage

# Menu for cleanup options
echo "🛠️  Cleanup Options:"
echo "1. Quick cleanup (safe - removes unused resources)"
echo "2. Standard cleanup (removes stopped containers, unused networks, dangling images)"
echo "3. Aggressive cleanup (removes all unused images, containers, networks)"
echo "4. Show detailed storage breakdown"
echo "5. Clean project-specific resources only"
echo "6. Exit"
echo ""

read -p "Choose an option (1-6): " choice

case $choice in
    1)
        echo ""
        echo "🧹 Running Quick Cleanup..."
        echo "- Removing dangling images"
        echo "- Removing unused networks"
        echo "- Removing build cache"
        
        # Remove dangling images
        DANGLING=$(docker images -f "dangling=true" -q)
        if [ -n "$DANGLING" ]; then
            echo "Removing dangling images..."
            docker rmi $DANGLING
        else
            echo "No dangling images found"
        fi
        
        # Remove unused networks
        echo "Removing unused networks..."
        docker network prune -f
        
        # Remove build cache
        echo "Removing build cache..."
        docker builder prune -f
        
        echo "✅ Quick cleanup completed"
        ;;
        
    2)
        echo ""
        echo "🧹 Running Standard Cleanup..."
        echo "- Removing stopped containers"
        echo "- Removing unused networks"
        echo "- Removing dangling images"
        echo "- Removing unused build cache"
        
        # Remove stopped containers
        echo "Removing stopped containers..."
        docker container prune -f
        
        # Remove unused networks
        echo "Removing unused networks..."
        docker network prune -f
        
        # Remove dangling images
        echo "Removing dangling images..."
        docker image prune -f
        
        # Remove build cache
        echo "Removing build cache..."
        docker builder prune -f
        
        echo "✅ Standard cleanup completed"
        ;;
        
    3)
        echo ""
        echo "⚠️  AGGRESSIVE CLEANUP WARNING"
        echo "This will remove:"
        echo "- All stopped containers"
        echo "- All unused networks"
        echo "- All unused images (not just dangling)"
        echo "- All unused volumes"
        echo "- All build cache"
        echo ""
        echo "This may require rebuilding images later!"
        echo ""
        read -p "Are you sure? (y/N): " confirm
        
        if [[ $confirm =~ ^[Yy]$ ]]; then
            echo ""
            echo "🧹 Running Aggressive Cleanup..."
            
            # Remove all unused resources
            echo "Removing all unused Docker resources..."
            docker system prune -a -f --volumes
            
            echo "✅ Aggressive cleanup completed"
        else
            echo "❌ Aggressive cleanup cancelled"
        fi
        ;;
        
    4)
        echo ""
        show_detailed_storage
        ;;
        
    5)
        echo ""
        echo "🧹 Cleaning Project-Specific Resources..."
        echo "- Stopping agentDB9 services"
        echo "- Removing agentDB9 containers"
        echo "- Removing agentDB9 images"
        echo "- Keeping volumes for data persistence"
        
        # Stop project services
        echo "Stopping services..."
        docker-compose down
        
        # Remove project containers
        echo "Removing project containers..."
        docker ps -a --filter "name=agentdb9" --format "{{.ID}}" | xargs -r docker rm -f
        
        # Remove project images
        echo "Removing project images..."
        docker images --filter "reference=agentdb9*" --format "{{.ID}}" | xargs -r docker rmi -f
        
        # Remove dangling images
        echo "Removing dangling images..."
        docker image prune -f
        
        echo "✅ Project cleanup completed"
        echo "💡 Run 'docker-compose up --build -d' to rebuild and restart"
        ;;
        
    6)
        echo "👋 Exiting cleanup tool"
        exit 0
        ;;
        
    *)
        echo "❌ Invalid option. Please choose 1-6."
        exit 1
        ;;
esac

echo ""
echo "📊 Storage Usage After Cleanup:"
docker system df
echo ""

# Calculate space saved
echo "💾 Cleanup Summary:"
echo "- Cleanup completed successfully"
echo "- Run this script regularly to maintain optimal storage usage"
echo "- For automated cleanup, consider setting up a cron job"
echo ""
echo "🔧 Additional Tips:"
echo "- Use 'docker-compose down -v' to remove volumes when resetting completely"
echo "- Use 'docker system df' to monitor storage usage"
echo "- Use 'docker images --format \"table {{.Repository}}\\t{{.Tag}}\\t{{.Size}}\"' to see image sizes"
echo ""