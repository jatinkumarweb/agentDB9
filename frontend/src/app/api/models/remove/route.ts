import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Model remove: Forwarding request to backend with auth headers');
    
    const response = await fetch(`${BACKEND_URL}/api/models/remove`, {
      method: 'DELETE',
      headers: createBackendHeaders(request),
      body: JSON.stringify(body),
    });
    
    console.log('Model remove: Backend response status:', response.status);
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to remove model:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove model' },
      { status: 500 }
    );
  }
}