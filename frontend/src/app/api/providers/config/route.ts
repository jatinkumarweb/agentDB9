import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // Forward Authorization header from client request
    const authHeader = request.headers.get('authorization');
    const headers = {
      ...createBackendHeaders(request),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    };
    
    // Ensure Authorization header is included if present
    if (authHeader && !headers['Authorization']) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(`${BACKEND_URL}/api/providers/config`, {
      cache: 'no-store',
      headers,
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Failed to fetch provider configs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch provider configs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward Authorization header from client request
    const authHeader = request.headers.get('authorization');
    const headers = createBackendHeaders(request);
    
    // Ensure Authorization header is included if present
    if (authHeader && !headers['Authorization']) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(`${BACKEND_URL}/api/providers/config`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to update provider config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update provider config' },
      { status: 500 }
    );
  }
}