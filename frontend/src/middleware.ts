import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/chat',
  '/agents',
  '/projects',
  '/models',
  '/settings',
];

// Define auth routes that should redirect if already authenticated
const authRoutes = [
  '/auth/login',
  '/auth/signup',
];

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/forgot-password',
  '/test/env',
  '/test-login',
  '/api',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get token from cookies or headers
  const token = request.cookies.get('auth-token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');

  // Debug logging
  console.log('Middleware debug:', {
    pathname,
    hasAuthTokenCookie: !!request.cookies.get('auth-token'),
    authTokenValue: request.cookies.get('auth-token')?.value?.substring(0, 20) + '...',
    hasAuthHeader: !!request.headers.get('authorization'),
    allCookies: Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value.substring(0, 20) + '...'])),
    userAgent: request.headers.get('user-agent')?.substring(0, 50)
  });

  // Check if user is authenticated (simplified check)
  const isAuthenticated = !!token;

  // Handle protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Handle auth routes (redirect if already authenticated)
  if (authRoutes.some(route => pathname.startsWith(route))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/chat', request.url));
    }
  }

  // Handle API routes - add CORS headers
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};