#!/bin/bash

# Docker Storage Monitor - Analyze and track storage usage
# This script provides detailed insights into Docker storage consumption

set -e

echo "📊 Docker Storage Monitor"
echo "========================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to format bytes to human readable
format_bytes() {
    local bytes=$1
    if [ $bytes -gt 1073741824 ]; then
        echo "$(echo "scale=2; $bytes/1073741824" | bc)GB"
    elif [ $bytes -gt 1048576 ]; then
        echo "$(echo "scale=2; $bytes/1048576" | bc)MB"
    elif [ $bytes -gt 1024 ]; then
        echo "$(echo "scale=2; $bytes/1024" | bc)KB"
    else
        echo "${bytes}B"
    fi
}

# Function to show overall storage summary
show_storage_summary() {
    echo -e "${BLUE}📊 Docker Storage Summary${NC}"
    echo "=========================="
    docker system df
    echo ""
    
    # Get reclaimable space
    RECLAIMABLE=$(docker system df --format "{{.Reclaimable}}" | head -1)
    if [ -n "$RECLAIMABLE" ] && [ "$RECLAIMABLE" != "0B" ]; then
        echo -e "${YELLOW}💾 Reclaimable space: $RECLAIMABLE${NC}"
        echo "   Run cleanup scripts to reclaim this space"
    else
        echo -e "${GREEN}✅ No reclaimable space found${NC}"
    fi
    echo ""
}

# Function to analyze images
analyze_images() {
    echo -e "${BLUE}🖼️  Image Analysis${NC}"
    echo "=================="
    
    # Total images
    TOTAL_IMAGES=$(docker images -q | wc -l)
    echo "Total images: $TOTAL_IMAGES"
    
    # Dangling images
    DANGLING_IMAGES=$(docker images -f "dangling=true" -q | wc -l)
    if [ $DANGLING_IMAGES -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Dangling images: $DANGLING_IMAGES${NC}"
    else
        echo -e "${GREEN}✅ No dangling images${NC}"
    fi
    
    echo ""
    echo "Largest images:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -10
    echo ""
    
    # Project-specific images
    echo "Project images (agentdb9):"
    docker images --filter "reference=agentdb9*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" || echo "No project images found"
    echo ""
}

# Function to analyze containers
analyze_containers() {
    echo -e "${BLUE}📦 Container Analysis${NC}"
    echo "===================="
    
    # Running containers
    RUNNING=$(docker ps -q | wc -l)
    echo "Running containers: $RUNNING"
    
    # Stopped containers
    STOPPED=$(docker ps -aq --filter "status=exited" | wc -l)
    if [ $STOPPED -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Stopped containers: $STOPPED${NC}"
    else
        echo -e "${GREEN}✅ No stopped containers${NC}"
    fi
    
    echo ""
    echo "Container sizes:"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Size}}" | head -10
    echo ""
}

# Function to analyze volumes
analyze_volumes() {
    echo -e "${BLUE}💾 Volume Analysis${NC}"
    echo "=================="
    
    # Total volumes
    TOTAL_VOLUMES=$(docker volume ls -q | wc -l)
    echo "Total volumes: $TOTAL_VOLUMES"
    
    # Unused volumes
    UNUSED_VOLUMES=$(docker volume ls -f "dangling=true" -q | wc -l)
    if [ $UNUSED_VOLUMES -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Unused volumes: $UNUSED_VOLUMES${NC}"
    else
        echo -e "${GREEN}✅ No unused volumes${NC}"
    fi
    
    echo ""
    echo "Project volumes:"
    docker volume ls --filter "name=agentdb9" --format "table {{.Name}}\t{{.Driver}}" || echo "No project volumes found"
    echo ""
    
    # Volume sizes (if possible to determine)
    echo "Volume locations:"
    docker volume ls -q | head -5 | xargs -I {} docker volume inspect {} --format "{{.Name}}: {{.Mountpoint}}" 2>/dev/null || echo "Cannot access volume details"
    echo ""
}

# Function to analyze build cache
analyze_build_cache() {
    echo -e "${BLUE}🔨 Build Cache Analysis${NC}"
    echo "======================="
    
    # Build cache usage
    docker builder du 2>/dev/null || echo "Build cache information not available"
    echo ""
}

# Function to analyze networks
analyze_networks() {
    echo -e "${BLUE}🌐 Network Analysis${NC}"
    echo "==================="
    
    # Total networks
    TOTAL_NETWORKS=$(docker network ls -q | wc -l)
    echo "Total networks: $TOTAL_NETWORKS"
    
    # Custom networks
    CUSTOM_NETWORKS=$(docker network ls --filter "type=custom" -q | wc -l)
    echo "Custom networks: $CUSTOM_NETWORKS"
    
    echo ""
    echo "Networks:"
    docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}"
    echo ""
}

# Function to show cleanup recommendations
show_recommendations() {
    echo -e "${BLUE}💡 Cleanup Recommendations${NC}"
    echo "=========================="
    
    # Check for reclaimable space
    RECLAIMABLE=$(docker system df --format "{{.Reclaimable}}" | head -1)
    if [ -n "$RECLAIMABLE" ] && [ "$RECLAIMABLE" != "0B" ]; then
        echo -e "${YELLOW}🧹 You can reclaim $RECLAIMABLE of space${NC}"
        echo "   Recommended actions:"
        
        # Check specific issues
        DANGLING_IMAGES=$(docker images -f "dangling=true" -q | wc -l)
        if [ $DANGLING_IMAGES -gt 0 ]; then
            echo "   - Remove $DANGLING_IMAGES dangling images: docker image prune -f"
        fi
        
        STOPPED_CONTAINERS=$(docker ps -aq --filter "status=exited" | wc -l)
        if [ $STOPPED_CONTAINERS -gt 0 ]; then
            echo "   - Remove $STOPPED_CONTAINERS stopped containers: docker container prune -f"
        fi
        
        UNUSED_VOLUMES=$(docker volume ls -f "dangling=true" -q | wc -l)
        if [ $UNUSED_VOLUMES -gt 0 ]; then
            echo "   - Remove $UNUSED_VOLUMES unused volumes: docker volume prune -f"
        fi
        
        echo ""
        echo "   Quick cleanup: ./scripts/docker-cleanup.sh"
        echo "   Deep cleanup: ./scripts/docker-deep-cleanup.sh"
    else
        echo -e "${GREEN}✅ Your Docker storage is well optimized!${NC}"
    fi
    echo ""
}

# Function to monitor in real-time
monitor_realtime() {
    echo -e "${BLUE}📈 Real-time Storage Monitor${NC}"
    echo "============================"
    echo "Press Ctrl+C to stop monitoring"
    echo ""
    
    while true; do
        clear
        echo "🕐 $(date)"
        echo ""
        docker system df
        echo ""
        echo "Top 5 largest images:"
        docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -6
        echo ""
        echo "Running containers:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
        echo ""
        sleep 5
    done
}

# Function to export storage report
export_report() {
    local report_file="docker-storage-report-$(date +%Y%m%d-%H%M%S).txt"
    
    echo "📄 Generating storage report..."
    
    {
        echo "Docker Storage Report"
        echo "Generated: $(date)"
        echo "===================="
        echo ""
        
        echo "STORAGE SUMMARY:"
        docker system df
        echo ""
        
        echo "IMAGES:"
        docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
        echo ""
        
        echo "CONTAINERS:"
        docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
        echo ""
        
        echo "VOLUMES:"
        docker volume ls
        echo ""
        
        echo "NETWORKS:"
        docker network ls
        echo ""
        
        echo "BUILD CACHE:"
        docker builder du 2>/dev/null || echo "Build cache info not available"
        echo ""
        
    } > "$report_file"
    
    echo "✅ Report saved to: $report_file"
    echo ""
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Main menu
echo "🛠️  Storage Analysis Options:"
echo "1. Complete storage analysis"
echo "2. Quick summary only"
echo "3. Real-time monitoring"
echo "4. Export detailed report"
echo "5. Show cleanup recommendations"
echo "6. Exit"
echo ""

read -p "Choose an option (1-6): " choice

case $choice in
    1)
        echo ""
        show_storage_summary
        analyze_images
        analyze_containers
        analyze_volumes
        analyze_build_cache
        analyze_networks
        show_recommendations
        ;;
    2)
        echo ""
        show_storage_summary
        show_recommendations
        ;;
    3)
        echo ""
        monitor_realtime
        ;;
    4)
        echo ""
        export_report
        ;;
    5)
        echo ""
        show_recommendations
        ;;
    6)
        echo "👋 Exiting storage monitor"
        exit 0
        ;;
    *)
        echo "❌ Invalid option. Please choose 1-6."
        exit 1
        ;;
esac

echo "📊 Storage monitoring completed!"
echo ""
echo "💡 Tips for ongoing storage management:"
echo "- Run this monitor weekly to track usage trends"
echo "- Use cleanup scripts when reclaimable space > 1GB"
echo "- Monitor build cache growth during development"
echo "- Consider using multi-stage builds to reduce image sizes"
echo ""