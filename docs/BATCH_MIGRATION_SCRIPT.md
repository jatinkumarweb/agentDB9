# Batch Migration Script for Light Theme

## Overview

This document provides automated patterns and scripts to efficiently migrate the remaining 12 pages to the light theme design.

## Progress Tracker

**Completed**: 4/16 pages (25%)
- ✅ `/auth/login`
- ✅ `/auth/signup`
- ✅ `/auth/forgot-password`
- ✅ `/chat`

**Remaining**: 12/16 pages (75%)

## Automated Migration Pattern

### Step 1: Add Imports

Add to the top of each page file:

```typescript
import GradientColorPicker from '@/components/dev/GradientColorPicker';
```

### Step 2: Add State

Add to component state:

```typescript
const [showGradientPicker, setShowGradientPicker] = useState(false);
```

### Step 3: Wrap with Light Theme Container

Replace the main container div with:

```tsx
<div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 flex items-center justify-center p-4 overflow-hidden relative font-['Inter',sans-serif]" data-gradient-bg>
  {/* Animated liquid blobs */}
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-300 to-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" style={{ animation: 'blob1 25s ease-in-out infinite' }} data-blob="1"></div>
    <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-300 to-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" style={{ animation: 'blob2 30s ease-in-out infinite' }} data-blob="2"></div>
    <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-gradient-to-br from-emerald-300 to-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" style={{ animation: 'blob3 28s ease-in-out infinite' }} data-blob="3"></div>
    <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-indigo-200 to-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" style={{ animation: 'blob4 32s ease-in-out infinite' }} data-blob="4"></div>
  </div>

  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat' }}></div>

  <style>{`
    @keyframes blob1 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
    @keyframes blob2 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(-40px, 30px) scale(1.15); } 66% { transform: translate(30px, -30px) scale(0.95); } }
    @keyframes blob3 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(50px, 20px) scale(0.9); } 66% { transform: translate(-30px, -40px) scale(1.1); } }
    @keyframes blob4 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(-25px, -35px) scale(1.05); } 66% { transform: translate(40px, 25px) scale(0.95); } }
  `}</style>

  <div className="relative z-10">
    {/* Your page content here */}
  </div>

  {/* Gradient Color Picker */}
  {process.env.NODE_ENV === 'development' && !showGradientPicker && (
    <button
      onClick={() => setShowGradientPicker(true)}
      className="fixed bottom-4 left-4 z-50 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all text-sm font-medium text-gray-700"
    >
      🎨 Gradient Picker
    </button>
  )}

  {showGradientPicker && (
    <GradientColorPicker onClose={() => setShowGradientPicker(false)} />
  )}
</div>
```

### Step 4: Update Class Names with sed

Run these sed commands to batch update class names:

```bash
# Update background colors
sed -i 's/bg-white /bg-white\/40 backdrop-blur-2xl /g' page.tsx
sed -i 's/bg-gray-50/bg-white\/30/g' page.tsx
sed -i 's/bg-gray-100/bg-white\/40/g' page.tsx

# Update borders
sed -i 's/border-gray-300/border-white\/80/g' page.tsx
sed -i 's/border-gray-200/border-white\/60/g' page.tsx
sed -i 's/rounded-lg/rounded-xl/g' page.tsx
sed -i 's/rounded-md/rounded-xl/g' page.tsx

# Update text colors
sed -i 's/text-gray-700/text-gray-900/g' page.tsx
sed -i 's/text-gray-600/text-gray-700/g' page.tsx
sed -i 's/text-gray-500/text-gray-600/g' page.tsx

# Update button colors
sed -i 's/bg-blue-600/bg-gradient-to-r from-indigo-600 to-purple-600/g' page.tsx
sed -i 's/hover:bg-blue-700/hover:from-indigo-700 hover:to-purple-700/g' page.tsx
sed -i 's/bg-green-600/bg-gradient-to-r from-indigo-600 to-purple-600/g' page.tsx
sed -i 's/hover:bg-green-700/hover:from-indigo-700 hover:to-purple-700/g' page.tsx

# Update focus rings
sed -i 's/focus:ring-blue-500/focus:ring-indigo-500/g' page.tsx
sed -i 's/focus:border-blue-500/focus:border-indigo-200/g' page.tsx
sed -i 's/focus:ring-green-500/focus:ring-indigo-500/g' page.tsx
sed -i 's/focus:border-green-500/focus:border-indigo-200/g' page.tsx

# Update input styling
sed -i 's/py-2 /py-3 /g' page.tsx
```

## Page-Specific Migration Instructions

### 1. Home Page (`/`)

**Complexity**: Medium
**Estimated Time**: 2 hours

**Special Considerations**:
- Landing page with hero section
- Feature cards
- Call-to-action buttons
- Navigation menu

**Steps**:
1. Apply base light theme wrapper
2. Update hero section with glassmorphic card
3. Update feature cards with glass effect
4. Update CTA buttons with gradient
5. Test responsive design

### 2. Dashboard (`/dashboard`)

**Complexity**: High
**Estimated Time**: 3 hours

**Special Considerations**:
- Multiple data cards
- Charts and graphs
- Statistics displays
- Navigation sidebar

**Steps**:
1. Apply base light theme wrapper
2. Update all stat cards with glass effect
3. Ensure charts have proper contrast
4. Update sidebar with glass effect
5. Test data visualization readability

### 3. Agent Settings (`/agents/[id]/settings`)

**Complexity**: High
**Estimated Time**: 3 hours

**Special Considerations**:
- Form inputs
- Tabs or sections
- Save/cancel buttons
- Delete confirmation

**Steps**:
1. Apply base light theme wrapper
2. Update all form inputs with glass effect
3. Update tabs with glass button styling
4. Update action buttons with gradients
5. Test form validation styling

### 4. Models Page (`/models`)

**Complexity**: Medium
**Estimated Time**: 2 hours

**Special Considerations**:
- Model cards
- Selection interface
- Configuration options

**Steps**:
1. Apply base light theme wrapper
2. Update model cards with glass effect
3. Update selection UI
4. Test model switching

### 5. Settings Page (`/settings`)

**Complexity**: Medium
**Estimated Time**: 2 hours

**Special Considerations**:
- Multiple settings sections
- Toggle switches
- Form inputs

**Steps**:
1. Apply base light theme wrapper
2. Update all sections with glass cards
3. Update form inputs
4. Test toggle switches visibility

### 6. Workspace Page (`/workspace`)

**Complexity**: High
**Estimated Time**: 3 hours

**Special Considerations**:
- VS Code integration
- File browser
- Terminal interface

**Steps**:
1. Apply base light theme wrapper
2. Ensure VS Code iframe has proper styling
3. Update file browser with glass effect
4. Test terminal visibility

### 7-10. Evaluation Pages

**Complexity**: Medium each
**Estimated Time**: 2 hours each (8 hours total)

**Pages**:
- `/evaluation` - Dashboard
- `/evaluation/knowledge` - Knowledge tests
- `/evaluation/memory` - Memory tests
- `/evaluation/results/[id]` - Results detail

**Common Steps**:
1. Apply base light theme wrapper
2. Update data tables with glass effect
3. Update charts for readability
4. Update action buttons
5. Test data visualization

### 11-12. Test Pages

**Complexity**: Low each
**Estimated Time**: 1 hour each (2 hours total)

**Pages**:
- `/test/env` - Environment test
- `/test-cookies` - Cookie test

**Steps**:
1. Apply base light theme wrapper
2. Update test result displays
3. Update buttons
4. Simple verification

## Batch Migration Script

Create a file `migrate-page.sh`:

```bash
#!/bin/bash

# Usage: ./migrate-page.sh <page-path>
# Example: ./migrate-page.sh frontend/src/app/dashboard/page.tsx

PAGE=$1

if [ ! -f "$PAGE" ]; then
  echo "Error: Page not found: $PAGE"
  exit 1
fi

echo "Migrating $PAGE to light theme..."

# Backup original
cp "$PAGE" "$PAGE.backup"

# Add import if not exists
if ! grep -q "GradientColorPicker" "$PAGE"; then
  sed -i "1a import GradientColorPicker from '@/components/dev/GradientColorPicker';" "$PAGE"
fi

# Apply class name updates
sed -i 's/bg-white /bg-white\/40 backdrop-blur-2xl /g' "$PAGE"
sed -i 's/bg-gray-50/bg-white\/30/g' "$PAGE"
sed -i 's/bg-gray-100/bg-white\/40/g' "$PAGE"
sed -i 's/border-gray-300/border-white\/80/g' "$PAGE"
sed -i 's/border-gray-200/border-white\/60/g' "$PAGE"
sed -i 's/rounded-lg/rounded-xl/g' "$PAGE"
sed -i 's/rounded-md/rounded-xl/g' "$PAGE"
sed -i 's/text-gray-700/text-gray-900/g' "$PAGE"
sed -i 's/text-gray-600/text-gray-700/g' "$PAGE"
sed -i 's/text-gray-500/text-gray-600/g' "$PAGE"
sed -i 's/py-2 /py-3 /g' "$PAGE"

echo "✅ Basic migration complete for $PAGE"
echo "⚠️  Manual steps required:"
echo "  1. Add light theme wrapper with blobs"
echo "  2. Add gradient color picker state"
echo "  3. Update button gradients"
echo "  4. Test and verify"
echo ""
echo "Backup saved to: $PAGE.backup"
```

## Testing Checklist

After migrating each page, verify:

- [ ] Background gradient displays correctly
- [ ] All 4 blobs are visible and animating
- [ ] Noise texture overlay is present
- [ ] Cards have glassmorphism effect
- [ ] Input fields have glass effect and focus states
- [ ] Buttons have gradient backgrounds
- [ ] Text is readable (high contrast)
- [ ] Gradient picker button appears in dev mode
- [ ] Responsive design works
- [ ] No console errors
- [ ] Page loads within 3 seconds

## Estimated Timeline

| Phase | Pages | Time | Status |
|-------|-------|------|--------|
| Auth Pages | 3 | 6h | ✅ Complete |
| Core Pages | 2 | 5h | ⏳ Pending |
| Feature Pages | 4 | 10h | ⏳ Pending |
| Evaluation Pages | 4 | 8h | ⏳ Pending |
| Test Pages | 2 | 2h | ⏳ Pending |
| **Total** | **15** | **31h** | **25% Complete** |

## Next Steps

1. Run migration script on home page
2. Manually add light theme wrapper
3. Test and verify
4. Commit changes
5. Repeat for remaining pages

## Resources

- Migration Guide: `docs/LIGHT_THEME_MIGRATION_GUIDE.md`
- Design System: `docs/LIGHT_THEME_DESIGN.md`
- Reference Pages: `/auth/login`, `/chat`
- Gradient Picker: `frontend/src/components/dev/GradientColorPicker.tsx`
