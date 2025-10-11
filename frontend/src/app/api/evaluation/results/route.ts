import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const batchId = searchParams.get('batchId');
    
    const url = new URL(`${BACKEND_URL}/evaluation/results`);
    if (agentId) {
      url.searchParams.set('agentId', agentId);
    }
    if (batchId) {
      url.searchParams.set('batchId', batchId);
    }

    const response = await fetch(url.toString(), {
      headers: createBackendHeaders(request),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}
