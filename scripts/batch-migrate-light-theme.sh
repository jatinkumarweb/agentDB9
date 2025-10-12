#!/bin/bash

# Batch Light Theme Migration Script
# Applies light theme to all remaining pages

set -e

echo "🎨 Starting batch light theme migration..."

# Define pages to migrate
PAGES=(
  "frontend/src/app/dashboard/page.tsx"
  "frontend/src/app/agents/[id]/settings/page.tsx"
  "frontend/src/app/models/page.tsx"
  "frontend/src/app/settings/page.tsx"
  "frontend/src/app/workspace/page.tsx"
  "frontend/src/app/evaluation/page.tsx"
  "frontend/src/app/evaluation/knowledge/page.tsx"
  "frontend/src/app/evaluation/memory/page.tsx"
  "frontend/src/app/evaluation/results/[id]/page.tsx"
  "frontend/src/app/test/env/page.tsx"
  "frontend/src/app/test-cookies/page.tsx"
)

# Light theme wrapper template
LIGHT_THEME_WRAPPER='className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50'

# Function to apply light theme to a page
migrate_page() {
  local page=$1
  
  if [ ! -f "$page" ]; then
    echo "⚠️  Skipping $page (not found)"
    return
  fi
  
  echo "🔄 Migrating $page..."
  
  # Backup
  cp "$page" "$page.backup"
  
  # Apply sed transformations
  sed -i 's/bg-gray-100/bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50/g' "$page"
  sed -i 's/bg-white /bg-white\/40 backdrop-blur-2xl /g' "$page"
  sed -i 's/bg-gray-50/bg-white\/30/g' "$page"
  sed -i 's/border-gray-300/border-white\/80/g' "$page"
  sed -i 's/border-gray-200/border-white\/60/g' "$page"
  sed -i 's/rounded-lg/rounded-xl/g' "$page"
  sed -i 's/rounded-md/rounded-xl/g' "$page"
  sed -i 's/text-gray-800/text-gray-900/g' "$page"
  sed -i 's/text-gray-700/text-gray-900/g' "$page"
  sed -i 's/text-gray-600/text-gray-700/g' "$page"
  sed -i 's/text-gray-500/text-gray-600/g' "$page"
  sed -i 's/py-2 /py-3 /g' "$page"
  sed -i 's/shadow-md/shadow-\[0_8px_32px_rgba(0,0,0,0.08)\]/g' "$page"
  sed -i 's/shadow-lg/shadow-\[0_8px_32px_rgba(0,0,0,0.08)\]/g' "$page"
  
  echo "✅ Migrated $page"
}

# Migrate all pages
for page in "${PAGES[@]}"; do
  migrate_page "$page"
done

echo ""
echo "✨ Batch migration complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Review changes in each file"
echo "  2. Add light theme wrapper with blobs manually"
echo "  3. Add GradientColorPicker import and state"
echo "  4. Test each page"
echo "  5. Commit changes"
echo ""
echo "Backups saved with .backup extension"
