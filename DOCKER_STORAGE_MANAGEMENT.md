# Docker Storage Management Guide

Docker can consume significant storage space over time. This guide provides comprehensive tools and strategies to manage Docker storage efficiently.

## 🚨 Quick Storage Check

```bash
# Check current Docker storage usage
docker system df

# Quick cleanup if needed
./scripts/docker-cleanup.sh
```

## 📊 Storage Management Tools

### 1. Storage Monitor
**Purpose**: Analyze current storage usage and get recommendations
```bash
./scripts/docker-storage-monitor.sh
```

**Features**:
- Complete storage analysis
- Real-time monitoring
- Cleanup recommendations
- Export detailed reports

### 2. Standard Cleanup
**Purpose**: Safe cleanup of unused Docker resources
```bash
./scripts/docker-cleanup.sh
```

**What it cleans**:
- ✅ Dangling images
- ✅ Stopped containers
- ✅ Unused networks
- ✅ Build cache
- ❌ Does NOT remove: Running containers, tagged images, named volumes

### 3. Deep Cleanup
**Purpose**: Aggressive cleanup for maximum space recovery
```bash
./scripts/docker-deep-cleanup.sh
```

**⚠️ WARNING**: This removes almost everything Docker-related!
- Stops and removes ALL containers
- Removes ALL images
- Removes unused volumes
- Clears ALL build cache

### 4. Auto-Cleanup Setup
**Purpose**: Schedule automatic cleanup to prevent storage bloat
```bash
./scripts/setup-auto-cleanup.sh
```

**Options**:
- Daily light cleanup
- Weekly standard cleanup
- Monthly deep cleanup
- Custom schedules

## 📋 Storage Usage Patterns

### Typical Storage Consumers

| Component | Typical Size | Growth Rate | Cleanup Frequency |
|-----------|-------------|-------------|-------------------|
| **Images** | 500MB - 2GB each | Slow | Weekly |
| **Containers** | 10MB - 100MB each | Medium | Daily |
| **Volumes** | 100MB - 10GB | Fast | Monthly |
| **Build Cache** | 100MB - 1GB | Fast | Daily |
| **Logs** | 1MB - 100MB | Fast | Weekly |

### AgentDB9 Specific Usage

| Service | Image Size | Volume Usage | Notes |
|---------|------------|--------------|-------|
| **Frontend** | ~200MB | None | Node.js app |
| **Backend** | ~300MB | None | NestJS app |
| **LLM Service** | ~250MB | None | Node.js service |
| **Ollama** | ~500MB | 5-20GB | Models storage |
| **PostgreSQL** | ~100MB | 100MB-1GB | Database data |
| **Redis** | ~50MB | 10-100MB | Cache data |

## 🛠️ Manual Cleanup Commands

### Quick Cleanup (Safe)
```bash
# Remove dangling images
docker image prune -f

# Remove stopped containers
docker container prune -f

# Remove unused networks
docker network prune -f

# Remove build cache
docker builder prune -f
```

### Targeted Cleanup
```bash
# Remove specific project containers
docker ps -a --filter "name=agentdb9" --format "{{.ID}}" | xargs docker rm -f

# Remove specific project images
docker images --filter "reference=agentdb9*" --format "{{.ID}}" | xargs docker rmi -f

# Remove unused volumes (be careful!)
docker volume prune -f
```

### Nuclear Cleanup (Dangerous)
```bash
# ⚠️ REMOVES EVERYTHING - Use with extreme caution
docker system prune -a -f --volumes
```

## 📈 Monitoring and Alerts

### Regular Monitoring
```bash
# Check storage weekly
./scripts/docker-storage-monitor.sh

# Quick status check
docker system df

# Check reclaimable space
docker system df --format "{{.Reclaimable}}"
```

### Storage Thresholds
- **Green**: < 5GB total usage
- **Yellow**: 5-15GB total usage
- **Red**: > 15GB total usage

### When to Clean Up
- **Reclaimable space > 1GB**: Run standard cleanup
- **Reclaimable space > 5GB**: Consider deep cleanup
- **Total usage > 20GB**: Immediate cleanup needed

## ⏰ Automated Cleanup Strategies

### Recommended Schedules

#### Development Environment
```bash
# Daily light cleanup at 2 AM
0 2 * * * /path/to/scripts/docker-cleanup.sh

# Weekly deeper cleanup on Sunday at 3 AM
0 3 * * 0 /path/to/scripts/docker-cleanup.sh
```

#### Production Environment
```bash
# Weekly cleanup on Sunday at 4 AM
0 4 * * 0 /path/to/scripts/docker-cleanup.sh

# Monthly deep cleanup (with caution)
0 5 1 * * /path/to/scripts/docker-deep-cleanup.sh
```

### Setup Automation
```bash
# Interactive setup
./scripts/setup-auto-cleanup.sh

# Manual cron setup
crontab -e
# Add: 0 2 * * * /path/to/agentDB9/scripts/docker-cleanup.sh >> /tmp/docker-cleanup.log 2>&1
```

## 🔧 Optimization Tips

### Reduce Image Sizes
1. **Use multi-stage builds**
2. **Minimize layers**
3. **Use .dockerignore**
4. **Choose smaller base images**

### Manage Build Cache
```bash
# Check build cache usage
docker builder du

# Clean build cache regularly
docker builder prune -f

# Aggressive build cache cleanup
docker builder prune -a -f
```

### Volume Management
```bash
# List volumes by size (if possible)
docker volume ls

# Backup important volumes before cleanup
docker run --rm -v volume_name:/data -v $(pwd):/backup alpine tar czf /backup/volume_backup.tar.gz -C /data .

# Restore volume from backup
docker run --rm -v volume_name:/data -v $(pwd):/backup alpine tar xzf /backup/volume_backup.tar.gz -C /data
```

## 🚨 Emergency Storage Recovery

### When Disk is Almost Full

1. **Immediate Actions**:
   ```bash
   # Stop all containers
   docker stop $(docker ps -aq)
   
   # Remove stopped containers
   docker container prune -f
   
   # Remove dangling images
   docker image prune -f
   ```

2. **Aggressive Cleanup**:
   ```bash
   # Run deep cleanup script
   ./scripts/docker-deep-cleanup.sh
   ```

3. **System-Level Cleanup**:
   ```bash
   # Clean Docker logs (requires sudo)
   sudo find /var/lib/docker/containers -name "*.log" -exec truncate -s 0 {} \;
   
   # Clean system logs
   sudo journalctl --vacuum-time=7d
   ```

## 📊 Storage Monitoring Dashboard

### Create a Simple Dashboard
```bash
#!/bin/bash
# Save as monitor-dashboard.sh

while true; do
    clear
    echo "🐳 Docker Storage Dashboard - $(date)"
    echo "=================================="
    echo ""
    
    # Storage summary
    docker system df
    echo ""
    
    # Top 5 largest images
    echo "📦 Largest Images:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -6
    echo ""
    
    # Running containers
    echo "🏃 Running Containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
    echo ""
    
    # Reclaimable space
    RECLAIMABLE=$(docker system df --format "{{.Reclaimable}}" | head -1)
    echo "💾 Reclaimable: $RECLAIMABLE"
    echo ""
    
    sleep 30
done
```

## 🔍 Troubleshooting Storage Issues

### Common Problems

#### "No space left on device"
```bash
# Emergency cleanup
docker system prune -a -f --volumes

# Check what's using space
df -h
du -sh /var/lib/docker/*
```

#### "Cannot remove container"
```bash
# Force remove
docker rm -f container_name

# Check for mount issues
docker inspect container_name | grep -i mount
```

#### "Image removal failed"
```bash
# Check what's using the image
docker ps -a --filter ancestor=image_name

# Force remove (dangerous)
docker rmi -f image_name
```

### Log Analysis
```bash
# Check Docker daemon logs
sudo journalctl -u docker.service

# Check container logs
docker logs container_name

# Check cleanup script logs
tail -f /tmp/docker-cleanup.log
```

## 📚 Best Practices

### Development Workflow
1. **Daily**: Check `docker system df`
2. **Weekly**: Run `./scripts/docker-cleanup.sh`
3. **Monthly**: Run `./scripts/docker-storage-monitor.sh`
4. **As needed**: Use `./scripts/docker-deep-cleanup.sh`

### CI/CD Integration
```yaml
# Example GitHub Actions cleanup
- name: Docker Cleanup
  run: |
    docker system prune -f
    docker builder prune -f
```

### Team Guidelines
- **Before leaving**: Run cleanup if reclaimable > 1GB
- **Before major changes**: Backup important volumes
- **Weekly team sync**: Review storage usage
- **Document**: Keep track of large model downloads

## 🆘 Emergency Contacts

If you encounter storage issues that these tools can't resolve:

1. **Check system disk space**: `df -h`
2. **Check Docker root**: `du -sh /var/lib/docker`
3. **Stop all containers**: `docker stop $(docker ps -aq)`
4. **Run nuclear cleanup**: `./scripts/docker-deep-cleanup.sh`
5. **Restart Docker service**: `sudo systemctl restart docker`

## 📖 Additional Resources

- [Docker System Prune Documentation](https://docs.docker.com/engine/reference/commandline/system_prune/)
- [Docker Storage Drivers](https://docs.docker.com/storage/storagedriver/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

**Remember**: Regular maintenance prevents emergency situations. Set up automated cleanup and monitor storage usage regularly!