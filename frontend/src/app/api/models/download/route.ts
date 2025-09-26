import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Model download: Forwarding request to backend with auth headers');
    
    const response = await fetch(`${BACKEND_URL}/api/models/download`, {
      method: 'POST',
      headers: createBackendHeaders(request),
      body: JSON.stringify(body),
    });
    
    console.log('Model download: Backend response status:', response.status);
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to download model:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download model' },
      { status: 500 }
    );
  }
}