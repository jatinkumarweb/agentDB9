import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/conversations/${params.id}/messages/${params.messageId}/stop`, {
      method: 'POST',
      headers: createBackendHeaders(request),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to stop generation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stop generation' },
      { status: 500 }
    );
  }
}