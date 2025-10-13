import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    
    const url = new URL(`${BACKEND_URL}/memory/${agentId}`);
    if (type) {
      url.searchParams.set('type', type);
    }
    
    const response = await fetch(url.toString(), {
      headers: createBackendHeaders(request),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Memory API: Failed to fetch memories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/memory/${agentId}`, {
      method: 'POST',
      headers: createBackendHeaders(request),
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Memory API: Failed to create memory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create memory' },
      { status: 500 }
    );
  }
}
