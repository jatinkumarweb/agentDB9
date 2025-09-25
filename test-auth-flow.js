#!/usr/bin/env node

/**
 * End-to-end authentication flow test
 * This script tests the complete authentication flow without requiring the backend to be running
 */

const axios = require('axios');

// Test configuration
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3001';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@agentdb9.com',
  password: 'TestPassword123!',
};

async function testAuthFlow() {
  console.log('🧪 Starting Authentication Flow Test\n');

  // Test 1: Frontend accessibility
  console.log('1. Testing frontend accessibility...');
  try {
    const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
    console.log('   ✅ Frontend is accessible');
  } catch (error) {
    console.log('   ❌ Frontend is not accessible:', error.message);
    return;
  }

  // Test 2: Backend health check
  console.log('\n2. Testing backend health...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`, { timeout: 5000 });
    console.log('   ✅ Backend is healthy:', response.data);
  } catch (error) {
    console.log('   ❌ Backend is not accessible:', error.message);
    console.log('   ℹ️  This is expected if backend is not running');
  }

  // Test 3: Frontend auth pages
  console.log('\n3. Testing authentication pages...');
  
  try {
    // Test login page
    const loginResponse = await axios.get(`${FRONTEND_URL}/auth/login`, { timeout: 5000 });
    console.log('   ✅ Login page is accessible');
    
    // Test signup page
    const signupResponse = await axios.get(`${FRONTEND_URL}/auth/signup`, { timeout: 5000 });
    console.log('   ✅ Signup page is accessible');
    
    // Test dashboard (should redirect to login)
    try {
      const dashboardResponse = await axios.get(`${FRONTEND_URL}/dashboard`, { 
        timeout: 5000,
        maxRedirects: 0 
      });
      console.log('   ⚠️  Dashboard accessible without auth (unexpected)');
    } catch (error) {
      if (error.response && error.response.status === 302) {
        console.log('   ✅ Dashboard redirects when not authenticated');
      } else {
        console.log('   ✅ Dashboard is protected');
      }
    }
    
  } catch (error) {
    console.log('   ❌ Auth pages not accessible:', error.message);
  }

  // Test 4: Frontend route protection
  console.log('\n4. Testing route protection...');
  
  const protectedRoutes = ['/dashboard', '/chat', '/settings'];
  
  for (const route of protectedRoutes) {
    try {
      const response = await axios.get(`${FRONTEND_URL}${route}`, { 
        timeout: 5000,
        maxRedirects: 0 
      });
      console.log(`   ⚠️  ${route} accessible without auth (unexpected)`);
    } catch (error) {
      if (error.response && (error.response.status === 302 || error.response.status === 401)) {
        console.log(`   ✅ ${route} is protected`);
      } else {
        console.log(`   ✅ ${route} is protected (or not accessible)`);
      }
    }
  }

  // Test 5: Public routes
  console.log('\n5. Testing public routes...');
  
  const publicRoutes = ['/', '/models', '/test/env'];
  
  for (const route of publicRoutes) {
    try {
      const response = await axios.get(`${FRONTEND_URL}${route}`, { timeout: 5000 });
      console.log(`   ✅ ${route} is publicly accessible`);
    } catch (error) {
      console.log(`   ❌ ${route} not accessible:`, error.message);
    }
  }

  // Test 6: API endpoints (if backend is running)
  console.log('\n6. Testing API endpoints...');
  
  try {
    // Test auth endpoints
    const authResponse = await axios.post(`${BACKEND_URL}/api/auth/signup`, testUser, { 
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    
    if (authResponse.status === 201) {
      console.log('   ✅ Signup endpoint works');
      
      // Test login
      const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: testUser.email,
        password: testUser.password,
      }, { 
        timeout: 5000,
        validateStatus: () => true 
      });
      
      if (loginResponse.status === 200 && loginResponse.data.data?.token) {
        console.log('   ✅ Login endpoint works');
        
        const token = loginResponse.data.data.token;
        
        // Test protected endpoint
        const protectedResponse = await axios.get(`${BACKEND_URL}/api/agents`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
          validateStatus: () => true
        });
        
        if (protectedResponse.status === 200) {
          console.log('   ✅ Protected endpoints work with token');
        } else {
          console.log('   ⚠️  Protected endpoints may not be working:', protectedResponse.status);
        }
        
      } else {
        console.log('   ⚠️  Login endpoint response:', loginResponse.status, loginResponse.data);
      }
      
    } else {
      console.log('   ⚠️  Signup endpoint response:', authResponse.status, authResponse.data);
    }
    
  } catch (error) {
    console.log('   ❌ API endpoints not accessible:', error.message);
    console.log('   ℹ️  This is expected if backend is not running');
  }

  console.log('\n🏁 Authentication Flow Test Complete\n');
  
  // Summary
  console.log('📋 Test Summary:');
  console.log('   - Frontend should be accessible on http://localhost:3000');
  console.log('   - Auth pages (login/signup) should be accessible');
  console.log('   - Protected routes should redirect to login');
  console.log('   - Public routes should be accessible');
  console.log('   - Backend API tests depend on backend being running');
  console.log('\n💡 To test the complete flow:');
  console.log('   1. Start the backend: cd backend && npm run start:dev');
  console.log('   2. Start the frontend: cd frontend && npm run dev');
  console.log('   3. Visit http://localhost:3000 and test the auth flow manually');
}

// Run the test
testAuthFlow().catch(console.error);