import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    // Get all cookies for debugging
    const allCookies = request.cookies.getAll();
    const authCookie = request.cookies.get('auth-token');
    
    console.log('Conversations/agent API: Incoming request cookies:', {
      hasCookies: allCookies.length > 0,
      cookieCount: allCookies.length,
      hasAuthCookie: !!authCookie,
      authCookieValue: authCookie?.value?.substring(0, 30) + '...',
      agentId: params.agentId
    });
    
    const headers = createBackendHeaders(request);
    console.log('Conversations/agent API: Headers being sent:', {
      hasAuth: !!headers['Authorization'],
      authHeader: headers['Authorization']?.substring(0, 50) + '...'
    });
    
    const response = await fetch(`${BACKEND_URL}/api/conversations/agent/${params.agentId}`, {
      headers,
    });
    const data = await response.json();
    
    console.log('Conversations/agent API: Backend response:', {
      status: response.status,
      ok: response.ok
    });
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}