# Test Suite Update - VS Code Proxy Path Handling

## Summary

Updated the VS Code proxy test suite to catch the path handling bug that was just fixed.

## What Was Added

### 1. Automated Test Script Updates (`tests/vscode-proxy-test.sh`)

**New Test Functions:**
- `test_path_handling()` - Tests path handling with detailed logging
- `verify_no_double_prefix()` - Catches the double prefix bug

**New Test Suite 3: Path Handling (6 tests)**
- ✅ VS Code path stripping verification
- ✅ Query parameter preservation
- ✅ Complex path handling
- ✅ Dev server path preservation
- ✅ Path stripping logic in code
- ✅ No double prefix regression test

**Total Tests:** Increased from 12 to 18+ tests

### 2. Manual Test Documentation Updates (`tests/vscode-proxy.test.md`)

**New Test Suite 3: Path Handling (REGRESSION TESTS)**

Added 6 critical regression tests:

#### Test 3.1: VS Code Path Stripping ⚠️ CRITICAL
- Verifies backend strips `/proxy/8080` prefix
- Checks logs for "stripped prefix" message
- Ensures no double prefix

#### Test 3.2: Dev Server Path Preservation ⚠️ CRITICAL
- Verifies backend preserves full path for non-8080 ports
- Checks logs for "keeping full path" message

#### Test 3.3: No Double Prefix Bug ⚠️ CRITICAL REGRESSION
- Ensures original bug doesn't return
- Searches logs for `/proxy/8080/proxy/8080` pattern
- Fails if double prefix detected

#### Test 3.4: Query Parameter Preservation
- Verifies query params survive path stripping
- Tests: `/?folder=/test&param=value`

#### Test 3.5: Complex Path Handling
- Tests nested paths like `/static/out/vs/code/...`
- Ensures stripping works for all path types

#### Test 3.6: Code Verification
- Verifies fix is present in codebase
- Checks for specific code patterns

## Bug Context

### Original Bug (Fixed in commit 5ea81c8)

**Problem:**
```typescript
// Backend was doing:
const path = req.url;  // /proxy/8080/?folder=...
const targetUrl = `http://vscode:8080${path}`;
// Result: http://vscode:8080/proxy/8080/?folder=... ❌
```

**Fix:**
```typescript
// Backend now does:
if (port === '8080' && path.startsWith('/proxy/8080')) {
  path = path.substring('/proxy/8080'.length);  // Strip prefix
}
const targetUrl = `http://vscode:8080${path}`;
// Result: http://vscode:8080/?folder=... ✅
```

### Why These Tests Matter

1. **Prevent Regression:** The bug was subtle and could easily return
2. **Different Behavior:** Port 8080 strips prefix, other ports don't
3. **Critical Path:** VS Code won't load if this breaks
4. **Complex Logic:** Path handling has edge cases (query params, nested paths)

## Test Coverage

### Before Update
- ✅ Service health checks
- ✅ CORS headers
- ✅ Basic proxy functionality
- ❌ Path handling logic
- ❌ Regression tests for bug fix

### After Update
- ✅ Service health checks
- ✅ CORS headers
- ✅ Basic proxy functionality
- ✅ **Path stripping for VS Code (port 8080)**
- ✅ **Path preservation for dev servers**
- ✅ **Double prefix bug detection**
- ✅ **Query parameter handling**
- ✅ **Complex path handling**
- ✅ **Code verification**

## Running the Tests

### Automated Tests
```bash
# Run all tests
./tests/vscode-proxy-test.sh

# Tests will check:
# - Service health
# - CORS functionality
# - Path handling (NEW)
# - Error handling
# - Configuration
```

### Manual Tests
```bash
# Follow the test cases in:
tests/vscode-proxy.test.md

# Focus on Suite 3 (Path Handling) for regression testing
```

## Success Criteria

**All tests must pass, especially:**
- ✅ Test 3.1: VS Code path stripping
- ✅ Test 3.2: Dev server path preservation
- ✅ Test 3.3: No double prefix bug

**If Test 3.3 fails:** ❌ BUG REGRESSION - The original bug has returned!

## Files Changed

- ✅ `tests/vscode-proxy-test.sh` - Added path handling tests
- ✅ `tests/vscode-proxy.test.md` - Added regression test documentation
- ✅ `TEST_SUITE_UPDATE.md` - This document

## Next Steps

1. **Rebuild backend:** `docker-compose build backend && docker-compose up -d`
2. **Run automated tests:** `./tests/vscode-proxy-test.sh`
3. **Verify critical tests pass:** Check Suite 3 results
4. **Manual verification:** Open `/workspace` page, verify VS Code loads
5. **Monitor logs:** Check for "stripped prefix" messages

## Maintenance

**When modifying proxy controller:**
1. Run test suite before committing
2. Ensure Suite 3 (Path Handling) passes
3. Add new tests for new functionality
4. Update test documentation

**Red Flags:**
- ❌ Test 3.3 fails → Double prefix bug has returned
- ❌ Logs show `/proxy/8080/proxy/8080` → Path stripping broken
- ❌ VS Code doesn't load → Check path handling logic

---

**Test Suite Version:** 2.0 (with path handling regression tests)
**Last Updated:** 2025-10-22
**Related Commits:** 5ea81c8 (bug fix), b506d22 (original test suite)
