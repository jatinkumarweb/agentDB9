# Login Page Test Cases

## Test Suite: Login Page UI and Functionality

### Test Environment
- **Page**: `/auth/login`
- **Backend API**: `/api/auth/login`
- **Auth Store**: `useAuthStore`

---

## Frontend Tests

### 1. Page Rendering Tests

#### TC-LOGIN-001: Page loads successfully
**Steps:**
1. Navigate to `/auth/login`
2. Wait for page to load

**Expected:**
- Page renders without errors
- All UI elements are visible
- No console errors

#### TC-LOGIN-002: All form elements are present
**Steps:**
1. Navigate to `/auth/login`

**Expected:**
- Email input field is visible
- Password input field is visible
- "Show/Hide Password" button is visible
- "Remember me" checkbox is visible
- "Forgot password?" link is visible
- "Sign in" button is visible
- "Sign up" link is visible

#### TC-LOGIN-003: Icons render correctly
**Steps:**
1. Navigate to `/auth/login`

**Expected:**
- Mail icon appears in email field
- Lock icon appears in password field
- Eye/EyeOff icon appears for password toggle
- LogIn icon appears on submit button

---

### 2. Form Validation Tests

#### TC-LOGIN-004: Email validation - empty field
**Steps:**
1. Navigate to `/auth/login`
2. Leave email field empty
3. Enter password
4. Click "Sign in"

**Expected:**
- Error message: "Email is required"
- Form does not submit
- Email field shows error state (red border)

#### TC-LOGIN-005: Email validation - invalid format
**Steps:**
1. Navigate to `/auth/login`
2. Enter invalid email: "notanemail"
3. Enter password
4. Click "Sign in"

**Expected:**
- Error message: "Please enter a valid email address"
- Form does not submit
- Email field shows error state

#### TC-LOGIN-006: Password validation - empty field
**Steps:**
1. Navigate to `/auth/login`
2. Enter valid email
3. Leave password field empty
4. Click "Sign in"

**Expected:**
- Error message: "Password is required"
- Form does not submit
- Password field shows error state

#### TC-LOGIN-007: Password validation - too short
**Steps:**
1. Navigate to `/auth/login`
2. Enter valid email
3. Enter password: "12345" (5 characters)
4. Click "Sign in"

**Expected:**
- Error message: "Password must be at least 6 characters"
- Form does not submit
- Password field shows error state

#### TC-LOGIN-008: Error clears on input
**Steps:**
1. Trigger validation error (e.g., empty email)
2. Start typing in the email field

**Expected:**
- Error message disappears
- Error state (red border) is removed

---

### 3. Password Visibility Toggle Tests

#### TC-LOGIN-009: Toggle password visibility
**Steps:**
1. Navigate to `/auth/login`
2. Enter password
3. Click eye icon

**Expected:**
- Password becomes visible (text type)
- Eye icon changes to EyeOff icon

#### TC-LOGIN-010: Toggle password back to hidden
**Steps:**
1. Navigate to `/auth/login`
2. Enter password
3. Click eye icon (show password)
4. Click eye icon again

**Expected:**
- Password becomes hidden (password type)
- EyeOff icon changes back to Eye icon

---

### 4. Form Submission Tests

#### TC-LOGIN-011: Successful login
**Steps:**
1. Navigate to `/auth/login`
2. Enter valid email: "demo@agentdb9.com"
3. Enter valid password: "demo123"
4. Click "Sign in"

**Expected:**
- Loading state shows (spinner + "Signing in...")
- Success toast appears: "Login successful!"
- User is redirected to `/chat`
- Auth token is stored in localStorage
- Auth token is set in cookie
- User data is stored in auth store

#### TC-LOGIN-012: Failed login - invalid credentials
**Steps:**
1. Navigate to `/auth/login`
2. Enter email: "wrong@example.com"
3. Enter password: "wrongpassword"
4. Click "Sign in"

**Expected:**
- Error toast appears: "Invalid credentials. Please try again."
- Password field is cleared
- User remains on login page
- No token is stored

#### TC-LOGIN-013: Loading state during submission
**Steps:**
1. Navigate to `/auth/login`
2. Enter valid credentials
3. Click "Sign in"
4. Observe button state

**Expected:**
- Button shows loading spinner
- Button text changes to "Signing in..."
- Button is disabled during loading
- User cannot submit form again

---

### 5. Navigation Tests

#### TC-LOGIN-014: Navigate to signup page
**Steps:**
1. Navigate to `/auth/login`
2. Click "Sign up here" link

**Expected:**
- User is redirected to `/auth/signup`

#### TC-LOGIN-015: Navigate to forgot password page
**Steps:**
1. Navigate to `/auth/login`
2. Click "Forgot your password?" link

**Expected:**
- User is redirected to `/auth/forgot-password`

#### TC-LOGIN-016: Redirect authenticated user
**Steps:**
1. Login successfully
2. Navigate to `/auth/login` directly

**Expected:**
- User is automatically redirected to `/chat`
- Login page does not render

---

### 6. Remember Me Tests

#### TC-LOGIN-017: Remember me checkbox interaction
**Steps:**
1. Navigate to `/auth/login`
2. Click "Remember me" checkbox

**Expected:**
- Checkbox becomes checked
- Checkbox can be unchecked

**Note:** Current implementation doesn't use this value, but UI should work

---

### 7. Accessibility Tests

#### TC-LOGIN-018: Keyboard navigation
**Steps:**
1. Navigate to `/auth/login`
2. Press Tab key repeatedly

**Expected:**
- Focus moves through all interactive elements in order:
  - Email field
  - Password field
  - Show/Hide password button
  - Remember me checkbox
  - Forgot password link
  - Sign in button
  - Sign up link

#### TC-LOGIN-019: Form submission with Enter key
**Steps:**
1. Navigate to `/auth/login`
2. Enter valid credentials
3. Press Enter key

**Expected:**
- Form submits
- Same behavior as clicking "Sign in" button

---

## Backend Integration Tests

### 8. API Integration Tests

#### TC-LOGIN-020: Login API call structure
**Steps:**
1. Monitor network requests
2. Submit login form with valid credentials

**Expected:**
- POST request to `/api/auth/login`
- Request body contains: `{ email, password }`
- Content-Type header: `application/json`
- Credentials: `include`

#### TC-LOGIN-021: Successful API response handling
**Steps:**
1. Submit valid credentials
2. Observe API response

**Expected:**
- Response status: 200
- Response contains: `{ user, accessToken }`
- User object has: `id, username, email, role, createdAt, updatedAt`
- Token is stored in auth store
- Token is set in Authorization header
- Token is set in cookie

#### TC-LOGIN-022: Failed API response handling
**Steps:**
1. Submit invalid credentials
2. Observe API response

**Expected:**
- Response status: 401
- Response contains error message
- Error is displayed to user
- No token is stored
- User remains on login page

#### TC-LOGIN-023: Network error handling
**Steps:**
1. Disconnect network
2. Submit login form

**Expected:**
- Error toast appears
- User-friendly error message
- Form remains interactive
- No crash or freeze

---

### 9. Auth Store Tests

#### TC-LOGIN-024: Auth store state after login
**Steps:**
1. Login successfully
2. Check auth store state

**Expected:**
- `user` is populated with user data
- `token` contains access token
- `isAuthenticated` is true
- `isLoading` is false

#### TC-LOGIN-025: Auth store persistence
**Steps:**
1. Login successfully
2. Refresh the page
3. Check auth store state

**Expected:**
- User data persists in localStorage
- Token persists in localStorage
- `isAuthenticated` remains true
- User is not logged out

#### TC-LOGIN-026: Auth check on mount
**Steps:**
1. Login successfully
2. Navigate away
3. Return to login page

**Expected:**
- `checkAuth()` is called on mount
- User is redirected to `/chat` if authenticated
- Login page does not render for authenticated users

---

### 10. Cookie Management Tests

#### TC-LOGIN-027: Auth token cookie is set
**Steps:**
1. Login successfully
2. Check browser cookies

**Expected:**
- Cookie named `auth-token` exists
- Cookie value matches the access token
- Cookie has correct path: `/`
- Cookie has max-age: 7 days (604800 seconds)

#### TC-LOGIN-028: Cookie settings for development
**Steps:**
1. Login in development environment
2. Check cookie attributes

**Expected:**
- SameSite: `lax`
- Secure: not set (HTTP allowed)

#### TC-LOGIN-029: Cookie settings for production
**Steps:**
1. Login in production environment
2. Check cookie attributes

**Expected:**
- SameSite: `none`
- Secure: set (HTTPS only)

---

## Visual Regression Tests

### 11. UI Consistency Tests

#### TC-LOGIN-030: Desktop layout
**Steps:**
1. Open login page on desktop (1920x1080)

**Expected:**
- Form is centered
- All elements are properly aligned
- No overflow or scrolling needed
- Proper spacing between elements

#### TC-LOGIN-031: Mobile layout
**Steps:**
1. Open login page on mobile (375x667)

**Expected:**
- Form is responsive
- All elements are visible
- Touch targets are adequate size
- No horizontal scrolling

#### TC-LOGIN-032: Tablet layout
**Steps:**
1. Open login page on tablet (768x1024)

**Expected:**
- Form adapts to screen size
- Proper spacing maintained
- All elements accessible

---

## Performance Tests

### 12. Performance Tests

#### TC-LOGIN-033: Page load time
**Steps:**
1. Navigate to `/auth/login`
2. Measure load time

**Expected:**
- Page loads in < 2 seconds
- No blocking resources
- Smooth rendering

#### TC-LOGIN-034: Form submission response time
**Steps:**
1. Submit login form
2. Measure time to redirect

**Expected:**
- API response in < 1 second
- Redirect happens within 100ms after success
- No noticeable delay

---

## Security Tests

### 13. Security Tests

#### TC-LOGIN-035: Password is masked by default
**Steps:**
1. Navigate to `/auth/login`
2. Enter password

**Expected:**
- Password characters are hidden (dots/asterisks)
- Password is not visible in plain text

#### TC-LOGIN-036: No credentials in URL
**Steps:**
1. Submit login form
2. Check URL

**Expected:**
- Email and password are not in URL
- No sensitive data in query parameters

#### TC-LOGIN-037: Token not exposed in console
**Steps:**
1. Login successfully
2. Check browser console

**Expected:**
- Access token is not logged to console
- No sensitive data in console logs

---

## Edge Cases

### 14. Edge Case Tests

#### TC-LOGIN-038: Very long email
**Steps:**
1. Enter email with 100+ characters
2. Submit form

**Expected:**
- Form handles long input gracefully
- No UI breaking
- Validation works correctly

#### TC-LOGIN-039: Special characters in password
**Steps:**
1. Enter password with special characters: `!@#$%^&*()`
2. Submit form

**Expected:**
- Special characters are accepted
- Login works if credentials are valid

#### TC-LOGIN-040: Rapid form submissions
**Steps:**
1. Enter valid credentials
2. Click submit button multiple times rapidly

**Expected:**
- Only one API call is made
- Button is disabled after first click
- No duplicate submissions

#### TC-LOGIN-041: Browser back button after login
**Steps:**
1. Login successfully
2. Navigate to chat page
3. Click browser back button

**Expected:**
- User is redirected back to `/chat`
- Login page does not render
- User remains authenticated

---

## Test Execution Checklist

### Before Making UI Changes:
- [ ] Run all 41 test cases
- [ ] Document any failures
- [ ] Take screenshots of current UI
- [ ] Record current behavior

### After Making UI Changes:
- [ ] Run all 41 test cases again
- [ ] Compare with before results
- [ ] Verify no functionality is broken
- [ ] Take screenshots of new UI
- [ ] Document any differences

### Critical Tests (Must Pass):
- [ ] TC-LOGIN-011: Successful login
- [ ] TC-LOGIN-012: Failed login handling
- [ ] TC-LOGIN-016: Redirect authenticated user
- [ ] TC-LOGIN-021: API response handling
- [ ] TC-LOGIN-024: Auth store state
- [ ] TC-LOGIN-027: Cookie management

---

## Test Data

### Valid Test Credentials:
```
Email: demo@agentdb9.com
Password: demo123
```

### Invalid Test Credentials:
```
Email: invalid@example.com
Password: wrongpassword
```

### Test Emails for Validation:
```
Valid: user@example.com, test.user@domain.co.uk
Invalid: notanemail, @example.com, user@, user@.com
```

### Test Passwords for Validation:
```
Valid: password123, Test@123, MyP@ssw0rd!
Invalid: 12345 (too short), "" (empty)
```
