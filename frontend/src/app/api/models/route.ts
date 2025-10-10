import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders } from '@/utils/api-helpers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('[Next.js API] /api/models called, BACKEND_URL:', BACKEND_URL);
    
    // Check if client requests fresh data
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
    
    const url = `${BACKEND_URL}/api/models`;
    console.log('[Next.js API] Fetching from:', url);
    
    const response = await fetch(url, {
      cache: forceRefresh ? 'no-store' : 'default',
      headers: createBackendHeaders(request, {
        ...(forceRefresh && { 'Cache-Control': 'no-cache' }),
      }),
    });
    const data = await response.json();
    
    // Allow client-side caching for 5 minutes unless refresh is requested
    const cacheHeaders: Record<string, string> = forceRefresh ? {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    } : {
      'Cache-Control': 'public, max-age=300', // 5 minutes
      'ETag': `"models-${Date.now()}"`,
    };
    
    return NextResponse.json(data, { 
      status: response.status,
      headers: cacheHeaders,
    });
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}