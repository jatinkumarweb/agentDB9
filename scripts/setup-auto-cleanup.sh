#!/bin/bash

# Setup Automated Docker Cleanup
# This script configures automatic cleanup schedules to prevent storage bloat

set -e

echo "⏰ Docker Auto-Cleanup Setup"
echo "============================"
echo ""

# Function to check if cron is available
check_cron() {
    if command -v crontab >/dev/null 2>&1; then
        echo "✅ Cron is available"
        return 0
    else
        echo "❌ Cron is not available on this system"
        return 1
    fi
}

# Function to setup cron job
setup_cron_job() {
    local schedule="$1"
    local script_path="$2"
    local description="$3"
    
    # Get current crontab
    crontab -l 2>/dev/null > /tmp/current_cron || touch /tmp/current_cron
    
    # Check if job already exists
    if grep -q "$script_path" /tmp/current_cron; then
        echo "⚠️  Cron job already exists for $script_path"
        echo "   Updating existing job..."
        # Remove existing job
        grep -v "$script_path" /tmp/current_cron > /tmp/new_cron || touch /tmp/new_cron
    else
        cp /tmp/current_cron /tmp/new_cron
    fi
    
    # Add new job
    echo "# $description" >> /tmp/new_cron
    echo "$schedule $script_path >> /tmp/docker-cleanup.log 2>&1" >> /tmp/new_cron
    
    # Install new crontab
    crontab /tmp/new_cron
    
    # Cleanup temp files
    rm -f /tmp/current_cron /tmp/new_cron
    
    echo "✅ Cron job added: $description"
    echo "   Schedule: $schedule"
    echo "   Logs: /tmp/docker-cleanup.log"
}

# Function to create systemd timer (alternative to cron)
setup_systemd_timer() {
    local interval="$1"
    local script_path="$2"
    local description="$3"
    
    # Create service file
    cat > /tmp/docker-cleanup.service << EOF
[Unit]
Description=$description
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=$script_path
User=$USER
WorkingDirectory=$(pwd)
StandardOutput=journal
StandardError=journal
EOF

    # Create timer file
    cat > /tmp/docker-cleanup.timer << EOF
[Unit]
Description=Run Docker cleanup $interval
Requires=docker-cleanup.service

[Timer]
OnCalendar=$interval
Persistent=true

[Install]
WantedBy=timers.target
EOF

    echo "📄 Systemd service and timer files created:"
    echo "   Service: /tmp/docker-cleanup.service"
    echo "   Timer: /tmp/docker-cleanup.timer"
    echo ""
    echo "To install (requires sudo):"
    echo "   sudo cp /tmp/docker-cleanup.service /etc/systemd/system/"
    echo "   sudo cp /tmp/docker-cleanup.timer /etc/systemd/system/"
    echo "   sudo systemctl daemon-reload"
    echo "   sudo systemctl enable docker-cleanup.timer"
    echo "   sudo systemctl start docker-cleanup.timer"
}

# Function to create manual cleanup reminder
create_reminder_script() {
    cat > ./scripts/cleanup-reminder.sh << 'EOF'
#!/bin/bash

# Docker Cleanup Reminder Script
# Run this manually when you notice storage issues

echo "🔔 Docker Storage Cleanup Reminder"
echo "=================================="
echo ""

# Check current storage
RECLAIMABLE=$(docker system df --format "{{.Reclaimable}}" | head -1)
echo "📊 Current reclaimable space: $RECLAIMABLE"

# Parse size to determine if cleanup is needed
if [[ "$RECLAIMABLE" =~ ([0-9.]+)GB ]]; then
    SIZE=${BASH_REMATCH[1]}
    if (( $(echo "$SIZE > 1" | bc -l) )); then
        echo "⚠️  Cleanup recommended! You can reclaim ${RECLAIMABLE}"
        echo ""
        echo "Quick actions:"
        echo "1. Run: ./scripts/docker-cleanup.sh"
        echo "2. For aggressive cleanup: ./scripts/docker-deep-cleanup.sh"
        echo "3. Monitor usage: ./scripts/docker-storage-monitor.sh"
    else
        echo "✅ Storage usage is acceptable"
    fi
elif [[ "$RECLAIMABLE" =~ ([0-9]+)MB ]]; then
    SIZE=${BASH_REMATCH[1]}
    if (( SIZE > 500 )); then
        echo "💡 Consider cleanup - you can reclaim ${RECLAIMABLE}"
        echo "   Run: ./scripts/docker-cleanup.sh"
    else
        echo "✅ Storage usage is good"
    fi
else
    echo "✅ Minimal reclaimable space"
fi

echo ""
echo "💾 Full storage breakdown:"
docker system df
EOF

    chmod +x ./scripts/cleanup-reminder.sh
    echo "✅ Manual reminder script created: ./scripts/cleanup-reminder.sh"
}

# Get absolute path to cleanup script
CLEANUP_SCRIPT="$(pwd)/scripts/docker-cleanup.sh"
DEEP_CLEANUP_SCRIPT="$(pwd)/scripts/docker-deep-cleanup.sh"

# Check if cleanup scripts exist
if [ ! -f "$CLEANUP_SCRIPT" ]; then
    echo "❌ Cleanup script not found: $CLEANUP_SCRIPT"
    echo "   Make sure you're running this from the project root"
    exit 1
fi

echo "🛠️  Auto-Cleanup Setup Options:"
echo "1. Daily light cleanup (recommended)"
echo "2. Weekly standard cleanup"
echo "3. Monthly deep cleanup"
echo "4. Custom schedule"
echo "5. Create manual reminder script only"
echo "6. Show current scheduled jobs"
echo "7. Remove auto-cleanup jobs"
echo "8. Exit"
echo ""

read -p "Choose an option (1-8): " choice

case $choice in
    1)
        echo ""
        echo "⏰ Setting up daily light cleanup..."
        if check_cron; then
            # Run at 2 AM daily
            setup_cron_job "0 2 * * *" "$CLEANUP_SCRIPT" "Daily Docker light cleanup"
        else
            setup_systemd_timer "daily" "$CLEANUP_SCRIPT" "Daily Docker light cleanup"
        fi
        ;;
        
    2)
        echo ""
        echo "⏰ Setting up weekly standard cleanup..."
        if check_cron; then
            # Run at 3 AM every Sunday
            setup_cron_job "0 3 * * 0" "$CLEANUP_SCRIPT" "Weekly Docker standard cleanup"
        else
            setup_systemd_timer "weekly" "$CLEANUP_SCRIPT" "Weekly Docker standard cleanup"
        fi
        ;;
        
    3)
        echo ""
        echo "⚠️  Monthly deep cleanup setup"
        echo "This will run aggressive cleanup monthly"
        read -p "Are you sure? (y/N): " confirm
        
        if [[ $confirm =~ ^[Yy]$ ]]; then
            if check_cron; then
                # Run at 4 AM on the 1st of each month
                setup_cron_job "0 4 1 * *" "$DEEP_CLEANUP_SCRIPT" "Monthly Docker deep cleanup"
            else
                setup_systemd_timer "monthly" "$DEEP_CLEANUP_SCRIPT" "Monthly Docker deep cleanup"
            fi
        else
            echo "❌ Monthly deep cleanup cancelled"
        fi
        ;;
        
    4)
        echo ""
        echo "⏰ Custom schedule setup"
        echo "Enter cron schedule (e.g., '0 2 * * *' for daily at 2 AM):"
        read -p "Schedule: " custom_schedule
        
        echo "Choose script:"
        echo "1. Light cleanup (docker-cleanup.sh)"
        echo "2. Deep cleanup (docker-deep-cleanup.sh)"
        read -p "Choice (1-2): " script_choice
        
        case $script_choice in
            1)
                SCRIPT_TO_USE="$CLEANUP_SCRIPT"
                DESC="Custom Docker light cleanup"
                ;;
            2)
                SCRIPT_TO_USE="$DEEP_CLEANUP_SCRIPT"
                DESC="Custom Docker deep cleanup"
                ;;
            *)
                echo "❌ Invalid choice"
                exit 1
                ;;
        esac
        
        if check_cron; then
            setup_cron_job "$custom_schedule" "$SCRIPT_TO_USE" "$DESC"
        else
            echo "⚠️  Custom systemd timers require manual setup"
            echo "   Use options 1-3 for predefined schedules"
        fi
        ;;
        
    5)
        echo ""
        echo "📝 Creating manual reminder script..."
        create_reminder_script
        echo ""
        echo "💡 Usage: ./scripts/cleanup-reminder.sh"
        echo "   Run this manually to check if cleanup is needed"
        ;;
        
    6)
        echo ""
        echo "📋 Current scheduled cleanup jobs:"
        if check_cron; then
            echo "Cron jobs:"
            crontab -l 2>/dev/null | grep -E "(docker-cleanup|docker-deep-cleanup)" || echo "No Docker cleanup cron jobs found"
        fi
        
        echo ""
        echo "Systemd timers:"
        systemctl list-timers docker-cleanup* 2>/dev/null || echo "No Docker cleanup systemd timers found"
        ;;
        
    7)
        echo ""
        echo "🗑️  Removing auto-cleanup jobs..."
        
        if check_cron; then
            # Remove from crontab
            crontab -l 2>/dev/null | grep -v -E "(docker-cleanup|docker-deep-cleanup)" | crontab - 2>/dev/null || true
            echo "✅ Removed cron jobs"
        fi
        
        # Remove systemd timers (if they exist)
        if systemctl list-timers docker-cleanup* >/dev/null 2>&1; then
            echo "⚠️  Systemd timers found. Remove manually with:"
            echo "   sudo systemctl stop docker-cleanup.timer"
            echo "   sudo systemctl disable docker-cleanup.timer"
            echo "   sudo rm /etc/systemd/system/docker-cleanup.*"
        fi
        ;;
        
    8)
        echo "👋 Exiting auto-cleanup setup"
        exit 0
        ;;
        
    *)
        echo "❌ Invalid option. Please choose 1-8."
        exit 1
        ;;
esac

echo ""
echo "✅ Auto-cleanup setup completed!"
echo ""
echo "📋 Summary:"
echo "- Automated cleanup helps prevent storage bloat"
echo "- Logs are saved to /tmp/docker-cleanup.log"
echo "- Monitor with: ./scripts/docker-storage-monitor.sh"
echo "- Manual cleanup: ./scripts/docker-cleanup.sh"
echo ""
echo "💡 Tips:"
echo "- Check logs regularly: tail -f /tmp/docker-cleanup.log"
echo "- Adjust schedules based on your development patterns"
echo "- Use manual reminder script for ad-hoc checks"
echo ""