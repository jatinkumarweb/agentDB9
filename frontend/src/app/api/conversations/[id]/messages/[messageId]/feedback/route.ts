import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const body = await request.json();
    
    const response = await fetch(
      `${BACKEND_URL}/api/conversations/${params.id}/messages/${params.messageId}/feedback`,
      {
        method: 'PATCH',
        headers: createBackendHeaders(request),
        body: JSON.stringify(body),
      }
    );
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to update feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
}
