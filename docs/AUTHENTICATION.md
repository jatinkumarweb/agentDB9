# Authentication Flow

This document describes the standardized authentication approach used throughout the application.

## Overview

The application uses JWT (JSON Web Token) based authentication with a three-tier architecture:

```
Client (Browser) → Next.js API Routes → NestJS Backend
```

## Authentication Flow

### 1. Login Process

1. User submits credentials via the login form
2. `authStore.login()` sends credentials to `/api/auth/login` (Next.js API route)
3. Next.js API route forwards to backend `/api/auth/login`
4. Backend validates credentials and returns JWT token
5. Frontend stores token in:
   - Zustand store (persisted to localStorage via `zustand/persist`)
   - Axios default headers for axios-based requests
   - Cookie (for middleware compatibility)

### 2. Authenticated Requests

#### Client-Side Pattern

**Standard Approach**: Use `fetchWithAuth()` utility

```typescript
import { fetchWithAuth } from '@/utils/fetch-with-auth';

// GET request
const response = await fetchWithAuth('/api/models');

// POST request
const response = await fetchWithAuth('/api/providers/config', {
  method: 'POST',
  body: JSON.stringify(data),
});
```

**What `fetchWithAuth` does:**
- Automatically reads JWT token from localStorage (`auth-storage` key)
- Adds `Authorization: Bearer <token>` header to all requests
- Includes credentials (cookies) for backward compatibility
- Provides consistent error handling

#### Next.js API Route Pattern

**Standard Approach**: Use `createBackendHeaders()` utility

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const response = await fetch(`${BACKEND_URL}/api/models`, {
    headers: createBackendHeaders(request),
  });
  
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
```

**What `createBackendHeaders` does:**
- Extracts `Authorization` header from incoming client request
- Falls back to `auth-token` cookie if Authorization header is missing
- Adds `Content-Type: application/json` header
- Allows additional headers to be merged in

#### Backend Pattern

The NestJS backend uses Passport JWT strategy:

```typescript
@UseGuards(JwtAuthGuard)
@Get('models')
async getModels(@Request() req) {
  const userId = req.user.userId;
  // ... implementation
}
```

**What happens:**
- `JwtAuthGuard` validates the JWT token from `Authorization` header
- Extracts user information from token payload
- Attaches user data to `req.user`
- Returns 401 Unauthorized if token is invalid/missing

## File Structure

### Client-Side Utilities

- **`/frontend/src/utils/fetch-with-auth.ts`**: Client-side fetch wrapper
  - Reads token from localStorage
  - Adds Authorization header
  - Includes credentials

- **`/frontend/src/stores/authStore.ts`**: Authentication state management
  - Manages user session
  - Persists token to localStorage
  - Handles login/logout/signup

### API Route Utilities

- **`/frontend/src/utils/api-helpers.ts`**: Next.js API route helpers
  - `getAuthHeaders()`: Extracts auth headers from request
  - `createBackendHeaders()`: Creates headers for backend requests

### Backend Authentication

- **`/backend/src/auth/`**: Authentication module
  - `auth.service.ts`: Login/register logic
  - `jwt.strategy.ts`: JWT validation strategy
  - `jwt-auth.guard.ts`: Route protection guard

## Common Patterns

### ✅ Correct: Using fetchWithAuth

```typescript
// In a React component or hook
const response = await fetchWithAuth('/api/models');
```

### ❌ Incorrect: Manual token handling

```typescript
// DON'T DO THIS - fetchWithAuth already handles it
const token = localStorage.getItem('auth-storage');
const response = await fetch('/api/models', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

### ✅ Correct: Using createBackendHeaders

```typescript
// In a Next.js API route
const response = await fetch(`${BACKEND_URL}/api/models`, {
  headers: createBackendHeaders(request),
});
```

### ❌ Incorrect: Manual header forwarding

```typescript
// DON'T DO THIS - createBackendHeaders already handles it
const authHeader = request.headers.get('authorization');
const response = await fetch(`${BACKEND_URL}/api/models`, {
  headers: {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
  },
});
```

## Troubleshooting

### Models showing as unavailable after API key configuration

**Root Cause**: The backend endpoint was not protected by `@UseGuards(JwtAuthGuard)`, so:
1. Requests returned 200 OK (endpoint was accessible without auth)
2. But `req.user` was undefined, so `userId` was not available
3. LLM service couldn't check user's API keys
4. Models showed as unavailable

**Solution**: 
1. Add `@UseGuards(JwtAuthGuard)` to all protected endpoints
2. Ensure all client-side API calls use `fetchWithAuth()`
3. Ensure all Next.js API routes use `createBackendHeaders(request)`

### 401 Unauthorized errors

**Possible causes:**
1. Token expired (default: 24 hours)
2. Token not in localStorage (user needs to log in again)
3. API route not forwarding Authorization header
4. Backend JWT secret mismatch

**Debug steps:**
1. Check browser console for `fetchWithAuth` logs
2. Check if token exists: `localStorage.getItem('auth-storage')`
3. Verify API route uses `createBackendHeaders(request)`
4. Check backend logs for JWT validation errors

### Token not persisting across page refreshes

**Cause**: Zustand persist middleware not configured correctly

**Solution**: Verify `authStore.ts` uses `persist()` middleware with `localStorage` storage

## Security Considerations

1. **Token Storage**: Tokens are stored in localStorage, which is vulnerable to XSS attacks. Ensure all user input is properly sanitized.

2. **Token Expiration**: Tokens expire after 24 hours (configurable via `JWT_EXPIRES_IN` env var)

3. **HTTPS**: Always use HTTPS in production to prevent token interception

4. **Cookie Settings**: Cookies use `SameSite=Strict` and `Secure` flag in production

5. **CORS**: Backend validates origin for cross-origin requests

## Environment Variables

### Frontend
- None required (uses relative URLs to Next.js API routes)

### Backend
- `JWT_SECRET`: Secret key for signing JWT tokens (required)
- `JWT_EXPIRES_IN`: Token expiration time (default: "24h")
- `BACKEND_URL`: Backend API URL (default: "http://localhost:8000")

## Migration Guide

If you have existing code that doesn't follow this pattern:

### Step 1: Update client-side fetch calls

```typescript
// Before
const response = await fetch('/api/models', {
  credentials: 'include',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

// After
import { fetchWithAuth } from '@/utils/fetch-with-auth';
const response = await fetchWithAuth('/api/models');
```

### Step 2: Update Next.js API routes

```typescript
// Before
const authHeader = request.headers.get('authorization');
const response = await fetch(`${BACKEND_URL}/api/models`, {
  headers: {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
  },
});

// After
import { createBackendHeaders } from '@/utils/api-helpers';
const response = await fetch(`${BACKEND_URL}/api/models`, {
  headers: createBackendHeaders(request),
});
```

### Step 3: Test thoroughly

1. Log in to the application
2. Verify token is stored in localStorage
3. Make authenticated requests
4. Verify requests include Authorization header
5. Verify backend receives and validates token
