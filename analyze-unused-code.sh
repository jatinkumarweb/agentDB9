#!/bin/bash

echo "=== ANALYZING UNUSED CODE IN AGENTDB9 ==="
echo ""

# Function to check if a component is imported anywhere
check_component_usage() {
    local component=$1
    local dir=$2
    local file=$3
    
    # Search for imports of this component (excluding the component file itself)
    local usage=$(grep -r "import.*${component}" "$dir" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "$file" | wc -l)
    
    if [ "$usage" -eq 0 ]; then
        echo "UNUSED: $component (in $file)"
    fi
}

echo "1. CHECKING FRONTEND COMPONENTS..."
echo "-----------------------------------"
cd /workspaces/agentDB9/frontend

for file in src/components/*.tsx; do
    if [ -f "$file" ]; then
        component=$(basename "$file" .tsx)
        check_component_usage "$component" "src" "$file"
    fi
done

echo ""
echo "2. CHECKING FRONTEND HOOKS..."
echo "-----------------------------------"
for file in src/hooks/*.ts; do
    if [ -f "$file" ]; then
        hook=$(basename "$file" .ts)
        check_component_usage "$hook" "src" "$file"
    fi
done

echo ""
echo "3. CHECKING FRONTEND CONTEXTS..."
echo "-----------------------------------"
for file in src/contexts/*.tsx; do
    if [ -f "$file" ]; then
        context=$(basename "$file" .tsx)
        check_component_usage "$context" "src" "$file"
    fi
done

echo ""
echo "4. CHECKING FRONTEND UTILS..."
echo "-----------------------------------"
for file in src/utils/*.ts; do
    if [ -f "$file" ]; then
        util=$(basename "$file" .ts)
        # Check for both default and named imports
        usage=$(grep -r "from.*['\"].*utils/${util}" src --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "$file" | wc -l)
        if [ "$usage" -eq 0 ]; then
            echo "UNUSED: $util (in $file)"
        fi
    fi
done

echo ""
echo "5. CHECKING BACKEND MODULES..."
echo "-----------------------------------"
cd /workspaces/agentDB9/backend

for dir in src/*/; do
    if [ -d "$dir" ]; then
        module=$(basename "$dir")
        # Check if module is imported in app.module.ts
        usage=$(grep -r "${module}" src/app.module.ts 2>/dev/null | wc -l)
        if [ "$usage" -eq 0 ] && [ "$module" != "common" ] && [ "$module" != "config" ]; then
            echo "POTENTIALLY UNUSED MODULE: $module"
        fi
    fi
done

echo ""
echo "6. CHECKING FOR UNUSED IMPORTS IN FILES..."
echo "-----------------------------------"
cd /workspaces/agentDB9

# Check for common unused import patterns
echo "Checking frontend files for unused imports..."
find frontend/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec grep -l "^import.*from" {} \; | head -10 | while read file; do
    echo "  Analyzing: $file"
done

echo ""
echo "7. CHECKING BACKEND-OLD REFERENCES..."
echo "-----------------------------------"
cd /workspaces/agentDB9

# Check if backend-old is referenced anywhere
refs=$(grep -r "backend-old" . --include="*.json" --include="*.js" --include="*.ts" --include="*.yml" --include="*.yaml" --include="*.md" --include="*.sh" 2>/dev/null | grep -v node_modules | grep -v ".git" | wc -l)
echo "References to 'backend-old': $refs"

echo ""
echo "8. CHECKING SIMPLE-BACKEND.JS REFERENCES..."
echo "-----------------------------------"
refs=$(grep -r "simple-backend" . --include="*.json" --include="*.js" --include="*.ts" --include="*.yml" --include="*.yaml" --include="*.md" --include="*.sh" 2>/dev/null | grep -v node_modules | grep -v ".git" | wc -l)
echo "References to 'simple-backend': $refs"

echo ""
echo "9. CHECKING FOR DUPLICATE FUNCTIONALITY..."
echo "-----------------------------------"

# Check for duplicate route definitions
echo "Checking for duplicate API routes..."
echo "  Backend routes:"
find backend/src -name "*.controller.ts" -exec grep -h "@Get\|@Post\|@Put\|@Delete" {} \; 2>/dev/null | sort | uniq -c | sort -rn | head -10

echo ""
echo "10. CHECKING FOR OLD/DEPRECATED CODE PATTERNS..."
echo "-----------------------------------"

# Check for TODO, FIXME, DEPRECATED comments
echo "TODO comments:"
grep -r "TODO" backend/src frontend/src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l

echo "FIXME comments:"
grep -r "FIXME" backend/src frontend/src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l

echo "DEPRECATED comments:"
grep -r "DEPRECATED\|@deprecated" backend/src frontend/src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l

echo ""
echo "=== ANALYSIS COMPLETE ==="
