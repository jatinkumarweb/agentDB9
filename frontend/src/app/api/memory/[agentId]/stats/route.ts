import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    
    const response = await fetch(`${BACKEND_URL}/memory/${agentId}/stats`, {
      headers: createBackendHeaders(request),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Memory API: Failed to fetch memory stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch memory stats' },
      { status: 500 }
    );
  }
}
