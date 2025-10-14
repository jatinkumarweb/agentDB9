import { NextRequest, NextResponse } from 'next/server';
import { backendPost } from '@/lib/backend-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Frontend API: Login attempt for:', body.email);
    
    const response = await backendPost('/api/auth/login', body);
    
    const data = await response.json();
    
    // Set auth cookie if login was successful
    const nextResponse = NextResponse.json(data, { status: response.status });
    if (response.ok && data.accessToken) {
      console.log('Frontend API: Setting auth-token cookie');
      
      // Use different cookie settings for development vs production
      const isProduction = process.env.NODE_ENV === 'production';
      nextResponse.cookies.set('auth-token', data.accessToken, {
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        httpOnly: false, // Allow client-side access for auth store
        secure: isProduction, // Only secure in production (requires HTTPS)
        sameSite: isProduction ? 'none' : 'lax' // 'lax' for localhost, 'none' for production
      });
    } else {
      console.log('Frontend API: Not setting cookie - response.ok:', response.ok, 'has accessToken:', !!data.accessToken);
    }
    
    return nextResponse;
  } catch (error) {
    console.error('Frontend API: Failed to login:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to login' },
      { status: 500 }
    );
  }
}