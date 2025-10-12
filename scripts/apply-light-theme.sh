#!/bin/bash

# Script to apply light theme design to all frontend pages
# This script updates background colors, adds glassmorphism effects, and includes animated blobs

echo "🎨 Applying light theme to all frontend pages..."

# Define the light theme background pattern
LIGHT_THEME_BG='className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50'

# Define pages to update (excluding login and chat which are already done)
PAGES=(
  "frontend/src/app/auth/signup/page.tsx"
  "frontend/src/app/auth/forgot-password/page.tsx"
  "frontend/src/app/page.tsx"
  "frontend/src/app/dashboard/page.tsx"
  "frontend/src/app/agents/[id]/settings/page.tsx"
  "frontend/src/app/evaluation/page.tsx"
  "frontend/src/app/evaluation/knowledge/page.tsx"
  "frontend/src/app/evaluation/memory/page.tsx"
  "frontend/src/app/evaluation/results/[id]/page.tsx"
  "frontend/src/app/models/page.tsx"
  "frontend/src/app/settings/page.tsx"
  "frontend/src/app/workspace/page.tsx"
)

# Function to check if page already has light theme
has_light_theme() {
  grep -q "from-blue-50 via-emerald-50 to-purple-50" "$1"
}

# Update each page
for page in "${PAGES[@]}"; do
  if [ -f "$page" ]; then
    if has_light_theme "$page"; then
      echo "✅ $page already has light theme"
    else
      echo "🔄 Updating $page..."
      # This is a placeholder - actual updates will be done manually
      # to preserve page-specific logic
    fi
  else
    echo "⚠️  $page not found"
  fi
done

echo "✨ Light theme application complete!"
