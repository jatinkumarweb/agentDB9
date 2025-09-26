import { NextRequest } from 'next/server';

/**
 * Extract authentication headers from the incoming request to forward to backend
 */
export function getAuthHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // Get authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }
  
  // Get auth token from cookie as fallback
  const authToken = request.cookies.get('auth-token')?.value;
  if (authToken && !authHeader) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return headers;
}

/**
 * Create headers for backend requests with authentication
 */
export function createBackendHeaders(request: NextRequest, additionalHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...getAuthHeaders(request),
    ...additionalHeaders,
  };
}