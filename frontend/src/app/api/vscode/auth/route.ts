import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ 
        authenticated: false,
        error: 'No token provided' 
      }, { status: 401 });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    return NextResponse.json({ 
      authenticated: true,
      user: {
        id: decoded.sub,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role
      }
    });
  } catch (error) {
    console.error('VS Code auth verification failed:', error);
    return NextResponse.json({ 
      authenticated: false,
      error: 'Invalid token' 
    }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ 
        valid: false,
        error: 'No token provided' 
      }, { status: 400 });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    return NextResponse.json({ 
      valid: true,
      user: {
        id: decoded.sub,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role
      }
    });
  } catch (error) {
    console.error('Token validation failed:', error);
    return NextResponse.json({ 
      valid: false,
      error: 'Invalid token' 
    }, { status: 403 });
  }
}