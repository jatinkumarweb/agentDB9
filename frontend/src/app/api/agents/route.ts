import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const headers = createBackendHeaders(request);
    console.log('Agents API: Full request details:', {
      hasAuth: !!headers['Authorization'],
      authHeader: headers['Authorization'],
      cookieValue: request.cookies.get('auth-token')?.value,
      backendUrl: `${BACKEND_URL}/api/agents`,
      allHeaders: headers
    });
    
    const response = await fetch(`${BACKEND_URL}/api/agents`, {
      headers,
    });
    const data = await response.json();
    
    console.log('Agents API: Backend response:', {
      status: response.status,
      ok: response.ok,
      data: data
    });
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch agents:', error);
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