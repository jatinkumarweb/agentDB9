import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  
  // Clear the auth cookie
  response.cookies.set('auth-token', '', {
    path: '/',
    expires: new Date(0), // Expire immediately
  });
  
  return response;
}