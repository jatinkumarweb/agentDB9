import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const authCookie = request.cookies.get('auth-token');
    console.log('Profile API: Request received', {
      hasAuthCookie: !!authCookie,
      cookiePreview: authCookie?.value?.substring(0, 30) + '...'
    });
    
    const headers = createBackendHeaders(request);
    console.log('Profile API: Headers to backend', {
      hasAuth: !!headers['Authorization'],
      authPreview: headers['Authorization']?.substring(0, 50) + '...'
    });
    
    const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    console.log('Profile API: Backend response', {
      status: response.status,
      ok: response.ok,
      hasData: !!data.data
    });
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Profile API: Exception:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}