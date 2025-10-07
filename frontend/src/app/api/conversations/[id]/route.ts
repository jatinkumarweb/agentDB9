import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const headers = createBackendHeaders(request);
    console.log('Conversation [id] API: Request headers:', {
      hasAuth: !!headers['Authorization'],
      authPreview: headers['Authorization']?.substring(0, 20) + '...',
      cookie: request.cookies.get('auth-token')?.value?.substring(0, 20) + '...',
      conversationId: params.id
    });
    
    const response = await fetch(`${BACKEND_URL}/api/conversations/${params.id}`, {
      headers,
    });
    const data = await response.json();
    
    console.log('Conversation [id] API: Backend response status:', response.status);
    if (!response.ok) {
      console.error('Conversation [id] API: Backend error:', data);
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}