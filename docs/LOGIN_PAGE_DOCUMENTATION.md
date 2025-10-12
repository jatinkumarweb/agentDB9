# Login Page Documentation

## Overview

The login page is the entry point for user authentication in AgentDB9. It handles user credentials, validates input, communicates with the backend API, and manages authentication state.

## File Locations

### Frontend
- **Page Component**: `frontend/src/app/auth/login/page.tsx`
- **Auth Store**: `frontend/src/stores/authStore.ts`
- **Auth Utilities**: `frontend/src/utils/auth.ts`
- **Auth Hook**: `frontend/src/hooks/useAuth.ts`

### Backend
- **Auth Controller**: `backend/src/auth/auth.controller.ts`
- **Auth Service**: `backend/src/auth/auth.service.ts`
- **JWT Strategy**: `backend/src/auth/strategies/jwt.strategy.ts`

## Current Functionality

### 1. Form Fields

#### Email Input
- **Type**: Email
- **Validation**: 
  - Required field
  - Must be valid email format (`/\S+@\S+\.\S+/`)
- **Icon**: Mail icon (lucide-react)
- **Autocomplete**: `email`

#### Password Input
- **Type**: Password (toggleable to text)
- **Validation**:
  - Required field
  - Minimum 6 characters
- **Icon**: Lock icon (lucide-react)
- **Features**:
  - Show/hide password toggle (Eye/EyeOff icons)
  - Autocomplete: `current-password`

#### Remember Me
- **Type**: Checkbox
- **Current Status**: UI only (not implemented in auth logic)

### 2. Form Validation

**Client-Side Validation:**
```typescript
const validateForm = () => {
  const newErrors: Record<string, string> = {};

  // Email validation
  if (!formData.email) {
    newErrors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    newErrors.email = 'Please enter a valid email address';
  }

  // Password validation
  if (!formData.password) {
    newErrors.password = 'Password is required';
  } else if (formData.password.length < 6) {
    newErrors.password = 'Password must be at least 6 characters';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Error Display:**
- Errors appear below respective fields
- Fields show red border when invalid
- Errors clear when user starts typing

### 3. Form Submission Flow

```
User clicks "Sign in"
    ↓
Validate form (client-side)
    ↓
Call authStore.login(email, password)
    ↓
POST /api/auth/login
    ↓
Backend validates credentials
    ↓
Success: Return { user, accessToken }
    ↓
Store token in:
  - localStorage (auth-storage)
  - Cookie (auth-token)
  - Axios header (Authorization: Bearer)
    ↓
Update auth store state
    ↓
Show success toast
    ↓
Redirect to /chat
```

### 4. API Integration

#### Login Endpoint

**Request:**
```http
POST /api/auth/login
Content-Type: application/json
Credentials: include

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "username": "username",
    "email": "user@example.com",
    "role": "user",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid credentials",
  "statusCode": 401,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/auth/login",
  "method": "POST"
}
```

### 5. Authentication State Management

**Auth Store (Zustand):**
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}
```

**Persistence:**
- Uses `zustand/middleware/persist`
- Storage: localStorage
- Key: `auth-storage`
- Persisted fields: `user`, `token`, `isAuthenticated`

**Cookie Management:**
- Cookie name: `auth-token`
- Path: `/`
- Max-age: 7 days (604800 seconds)
- Development: `SameSite=lax`
- Production: `SameSite=none; Secure`

### 6. Redirect Logic

**On Mount:**
```typescript
useEffect(() => {
  checkAuth(); // Verify token is still valid
}, [checkAuth]);

useEffect(() => {
  if (!isLoading && isAuthenticated) {
    router.push('/chat'); // Redirect authenticated users
  }
}, [isAuthenticated, isLoading, router]);
```

**After Login:**
```typescript
await login(formData.email, formData.password);
toast.success('Login successful!');
setTimeout(() => {
  router.push('/chat');
}, 100);
```

### 7. Error Handling

**Network Errors:**
- Caught in try-catch block
- Display error toast
- Keep user on login page
- Clear password field

**Validation Errors:**
- Display inline below fields
- Prevent form submission
- Clear on user input

**API Errors:**
- Parse error message from response
- Display in toast notification
- Clear password field
- Log error to console

### 8. Loading States

**During Submission:**
- Button shows spinner
- Button text: "Signing in..."
- Button is disabled
- Form inputs remain enabled

**During Auth Check:**
- `isLoading` state prevents premature redirects
- No UI indication (happens in background)

### 9. Navigation Links

**Sign Up:**
- Link text: "Sign up here"
- Destination: `/auth/signup`

**Forgot Password:**
- Link text: "Forgot your password?"
- Destination: `/auth/forgot-password`

### 10. Demo Credentials

**Displayed on Page:**
```
Email: demo@agentdb9.com
Password: demo123
```

**Purpose:**
- Quick testing
- Demo environment
- Development convenience

## Current UI Structure

```tsx
<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
  <div className="max-w-md w-full">
    {/* Header */}
    <div className="text-center">
      <LogIn icon />
      <h2>Welcome back</h2>
      <p>Sign in to your AgentDB9 account</p>
    </div>

    {/* Form */}
    <form>
      {/* Email Field */}
      <input type="email" />
      
      {/* Password Field */}
      <input type="password" />
      <button type="button">Show/Hide</button>
      
      {/* Remember Me & Forgot Password */}
      <input type="checkbox" /> Remember me
      <Link>Forgot your password?</Link>
      
      {/* Submit Button */}
      <button type="submit">Sign in</button>
      
      {/* Sign Up Link */}
      <Link>Sign up here</Link>
    </form>

    {/* Demo Credentials */}
    <div>Demo credentials...</div>
  </div>
</div>
```

## Dependencies

### Frontend
- **React**: 18.x
- **Next.js**: 14.x
- **Zustand**: State management
- **lucide-react**: Icons
- **react-hot-toast**: Notifications
- **axios**: HTTP client

### Backend
- **NestJS**: Framework
- **Passport**: Authentication
- **JWT**: Token generation
- **bcrypt**: Password hashing
- **TypeORM**: Database ORM

## Security Features

### Current Implementation

1. **Password Hashing**: Passwords are hashed with bcrypt before storage
2. **JWT Tokens**: Secure token-based authentication
3. **HTTPS**: Enforced in production (Secure cookie flag)
4. **CORS**: Configured for allowed origins
5. **Rate Limiting**: Applied to auth endpoints
6. **Input Validation**: Both client and server side
7. **SQL Injection Protection**: Parameterized queries via TypeORM
8. **XSS Protection**: React's built-in escaping

### Not Implemented

1. **CSRF Protection**: No CSRF tokens (relies on SameSite cookies)
2. **2FA**: Two-factor authentication not available
3. **Account Lockout**: No brute force protection
4. **Password Strength Meter**: Only basic length validation
5. **Remember Me**: Checkbox present but not functional

## Testing

### Test Files
- **Test Cases**: `tests/frontend/login-page.test.md`
- **Automated Tests**: `tests/frontend/test-login-functionality.sh`

### Running Tests

```bash
# Backend tests
cd backend
npm test -- auth

# Frontend functionality tests
./tests/frontend/test-login-functionality.sh

# Manual testing
# 1. Start backend: cd backend && npm run start:dev
# 2. Start frontend: cd frontend && npm run dev
# 3. Navigate to http://localhost:3000/auth/login
# 4. Test with demo credentials
```

## Known Issues

1. **Remember Me**: Checkbox is non-functional
2. **Social Login**: Google/Apple buttons not implemented
3. **Password Reset**: Link exists but flow incomplete
4. **Session Timeout**: No automatic logout on token expiry
5. **Concurrent Sessions**: Multiple sessions allowed

## Future Enhancements

1. **Biometric Authentication**: Face ID, Touch ID
2. **Social Login**: Google, GitHub, Apple
3. **Magic Link**: Passwordless login via email
4. **2FA**: TOTP, SMS codes
5. **Remember Device**: Trusted device management
6. **Session Management**: View and revoke active sessions
7. **Login History**: Track login attempts and locations
8. **Progressive Enhancement**: Work without JavaScript

## API Endpoints Reference

### Login
- **Endpoint**: `POST /api/auth/login`
- **Public**: Yes
- **Rate Limit**: 10 requests/minute
- **Body**: `{ email, password }`
- **Response**: `{ user, accessToken }`

### Profile
- **Endpoint**: `GET /api/auth/profile`
- **Public**: No (requires Bearer token)
- **Response**: `{ data: user }`

### Logout
- **Endpoint**: `POST /api/auth/logout`
- **Public**: No (requires Bearer token)
- **Response**: `{ success: true }`

### Refresh Token
- **Endpoint**: `POST /api/auth/refresh`
- **Public**: No (requires Bearer token)
- **Response**: `{ token, user }`

## Environment Variables

### Frontend
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NODE_ENV=development|production
```

### Backend
```env
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d
BCRYPT_ROUNDS=10
```

## Troubleshooting

### Issue: "Invalid credentials" on correct password
**Solution**: Check if user exists in database, verify password hash

### Issue: Redirect loop after login
**Solution**: Check `checkAuth()` logic, verify token validity

### Issue: Token not persisting
**Solution**: Check localStorage, verify cookie settings

### Issue: CORS errors
**Solution**: Verify backend CORS configuration, check allowed origins

### Issue: 401 on authenticated requests
**Solution**: Verify token in Authorization header, check token expiry

## Change Log

### Current Version (v2.0.0)
- Basic email/password authentication
- JWT token management
- Client-side validation
- Toast notifications
- Auto-redirect for authenticated users
- Demo credentials display

### Planned Changes
- New glassmorphic UI design
- Animated background
- Enhanced visual feedback
- Improved accessibility
- Better mobile responsiveness
