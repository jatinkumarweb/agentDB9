import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // Get all cookies for debugging
    const allCookies = request.cookies.getAll();
    const authCookie = request.cookies.get('auth-token');
    
    console.log('Agents API: Incoming request cookies:', {
      hasCookies: allCookies.length > 0,
      cookieCount: allCookies.length,
      cookieNames: allCookies.map(c => c.name),
      hasAuthCookie: !!authCookie,
      authCookieValue: authCookie?.value?.substring(0, 30) + '...'
    });
    
    const headers = createBackendHeaders(request);
    console.log('Agents API: Headers being sent to backend:', {
      hasAuth: !!headers['Authorization'],
      authHeader: headers['Authorization']?.substring(0, 50) + '...',
      backendUrl: `${BACKEND_URL}/api/agents`,
      allHeaderKeys: Object.keys(headers)
    });
    
    const response = await fetch(`${BACKEND_URL}/api/agents`, {
      headers,
    });
    const data = await response.json();
    
    console.log('Agents API: Backend response:', {
      status: response.status,
      ok: response.ok,
      success: data.success,
      error: data.error || 'none'
    });
    
    if (!response.ok) {
      console.error('Agents API: Backend returned error:', data);
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Agents API: Exception:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/agents`, {
      method: 'POST',
      headers: createBackendHeaders(request),
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to create agent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}