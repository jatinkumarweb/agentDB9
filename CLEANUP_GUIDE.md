# Code Cleanup Quick Reference Guide

## 🚀 Quick Actions

### Immediate Safe Deletions (Do First)

```bash
# 1. Delete backend-old directory (452KB)
rm -rf backend-old/

# 2. Delete simple-backend.js (8KB)
rm simple-backend.js

# 3. Delete unused AuthContext
rm frontend/src/contexts/AuthContext.tsx

# 4. Verify and delete CreateMessageDto if unused
# First check for any dynamic imports:
grep -r "CreateMessageDto" backend/src/
# If no results, delete:
rm backend/src/dto/create-message.dto.ts
```

**Total Space Saved:** ~460KB + reduced cognitive load

---

## 🔧 Integration Tasks (Do Second)

### 1. Add SessionTimeout to Layout

**File:** `frontend/src/app/layout.tsx`

```tsx
// Add import at top
import SessionTimeout from '@/components/SessionTimeout';

// Add inside body, before {children}
<SessionTimeout 
  autoRefresh={true} 
  warningTime={300}  // 5 minutes warning
  showCountdown={true}
/>
```

**Priority:** HIGH - Security feature

---

### 2. Apply Rate Limiting to API Endpoints

**File:** `backend/src/auth/auth.controller.ts`

```typescript
// Add imports
import { UseGuards } from '@nestjs/common';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { RateLimit } from '../common/guards/rate-limit.guard';

// Apply to login endpoint
@UseGuards(RateLimitGuard)
@RateLimit({ windowMs: 60000, maxRequests: 10 })
@Post('login')
async login(@Body() loginDto: LoginDto) {
  // existing code
}

// Apply to register endpoint
@UseGuards(RateLimitGuard)
@RateLimit({ windowMs: 60000, maxRequests: 5 })
@Post('register')
async register(@Body() createUserDto: CreateUserDto) {
  // existing code
}
```

**Also apply to:**
- `agents.controller.ts` - chat endpoints
- `conversations.controller.ts` - message endpoints

**Priority:** HIGH - Security feature

---

### 3. Create Admin Monitoring Page (Future)

**File:** `frontend/src/app/admin/monitoring/page.tsx`

```tsx
'use client';

import EnvironmentMonitor from '@/components/EnvironmentMonitor';
import { useAuth } from '@/hooks/useAuth';

export default function MonitoringPage() {
  const { user } = useAuth();
  
  // Check if user is admin
  if (user?.role !== 'admin') {
    return <div>Access Denied</div>;
  }
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">System Monitoring</h1>
      <EnvironmentMonitor 
        autoRefresh={true}
        refreshInterval={30}
      />
    </div>
  );
}
```

**Priority:** LOW - Nice to have

---

## 📝 Package.json Updates

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test:integration": "./scripts/test-integration.sh",
    "test:local": "./scripts/test-local-setup.sh",
    "fix:docker": "./scripts/fix-docker-corruption.sh",
    "fix:sqlite": "./scripts/fix-sqlite.sh",
    "fix:chat": "./scripts/fix-local-chat.sh"
  }
}
```

---

## 📚 Documentation Cleanup

### Move Old Status Reports to Archive

```bash
# Create archive directory
mkdir -p docs/archive/status-reports

# Move old reports
mv CHANGES_SUMMARY.md docs/archive/status-reports/
mv FINAL_STATUS.md docs/archive/status-reports/
mv INTEGRATION_SUMMARY.md docs/archive/status-reports/
mv TEST_RESULTS_DEMO.md docs/archive/status-reports/
mv TOOL_EXECUTION_TEST_RESULTS.md docs/archive/status-reports/
mv AUTHENTICATION_TEST_REPORT.md docs/archive/status-reports/

# Keep these in root (actively used):
# - README.md
# - QUICK_START.md
# - SETUP_MODELS.md
# - TESTING.md
# - DATABASE_USAGE.md
# - DOCKER_SETUP.md
```

---

## ✅ Verification Checklist

After cleanup, verify everything still works:

```bash
# 1. Install dependencies
npm install

# 2. Build all services
npm run build

# 3. Run tests
npm test

# 4. Start services
npm run dev

# 5. Test key functionality
# - Login/logout
# - Create agent
# - Send message
# - Check monitoring
```

---

## 🎯 Priority Order

### Phase 1: Safe Deletions (30 minutes)
1. ✅ Delete backend-old/
2. ✅ Delete simple-backend.js
3. ✅ Delete AuthContext.tsx
4. ✅ Verify and delete CreateMessageDto

### Phase 2: Security Improvements (1 hour)
1. ✅ Add SessionTimeout to layout
2. ✅ Apply rate limiting to auth endpoints
3. ✅ Apply rate limiting to chat endpoints
4. ✅ Test rate limiting

### Phase 3: Code Quality (30 minutes)
1. ✅ Consolidate api-helpers.ts
2. ✅ Update package.json scripts
3. ✅ Run linter and fix issues

### Phase 4: Documentation (30 minutes)
1. ✅ Move old reports to archive
2. ✅ Update README
3. ✅ Document test pages
4. ✅ Document scripts

**Total Time:** ~2.5 hours

---

## 🔍 Files to Review (Not Delete Yet)

These files need review before any action:

1. **frontend/src/utils/api-helpers.ts**
   - Check if `getAuthHeaders` is needed
   - Consolidate with fetch-with-auth.ts if duplicate

2. **backend/src/mcp/mcp.service.ts**
   - `MCPToolCall` and `MCPToolResult` types
   - May be used internally

3. **All scripts in /scripts/**
   - All are potentially useful
   - Just need to be added to package.json

---

## 🚫 DO NOT DELETE

These are intentionally kept:

1. **Test/Debug Pages**
   - `/frontend/src/app/test-cookies/page.tsx`
   - `/frontend/src/app/test/env/page.tsx`
   - Useful for debugging

2. **Debug API Routes**
   - `/frontend/src/app/api/debug/auth/route.ts`
   - `/frontend/src/app/api/debug/cookies/route.ts`
   - Useful for debugging

3. **Emergency Scripts**
   - `fix-docker-corruption.sh`
   - `fix-sqlite.sh`
   - `fix-local-chat.sh`
   - Useful for troubleshooting

4. **vscode-proxy/**
   - Commented out but useful for production
   - Keep for future use

5. **Docker Compose Variants**
   - `docker-compose.arm64.yml`
   - `docker-compose.healthcheck.yml`
   - `docker-compose.override.yml.*`
   - All serve specific purposes

---

## 📊 Expected Results

### Before Cleanup
- Files: ~500+ files
- Size: ~50MB (excluding node_modules)
- Unused code: ~460KB
- Cognitive load: HIGH (duplicate code, unclear structure)

### After Cleanup
- Files: ~490 files
- Size: ~49.5MB (excluding node_modules)
- Unused code: ~0KB
- Cognitive load: LOW (clear structure, no duplicates)

### Benefits
- ✅ Faster navigation
- ✅ Clearer architecture
- ✅ Better security (rate limiting, session timeout)
- ✅ Improved maintainability
- ✅ Reduced confusion

---

## 🆘 Rollback Plan

If something breaks after cleanup:

```bash
# 1. Check git status
git status

# 2. See what was deleted
git diff

# 3. Restore specific file
git checkout HEAD -- path/to/file

# 4. Restore everything
git reset --hard HEAD

# 5. Check if services start
npm run dev
```

---

## 📞 Support

If you encounter issues:

1. Check the main analysis report: `UNUSED_CODE_ANALYSIS.md`
2. Review git history: `git log --oneline`
3. Check service logs: `npm run logs`
4. Run health checks: `npm run health`

---

**Last Updated:** $(date)
**Related Documents:**
- UNUSED_CODE_ANALYSIS.md (detailed analysis)
- README.md (project overview)
- TESTING.md (testing guide)
