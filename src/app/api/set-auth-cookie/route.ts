import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to set auth cookie after successful Firebase login
 * This allows server-side middleware to check auth before page renders
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json(
        { success: false, error: 'Token required' },
        { status: 400 }
      );
    }
    
    // Create response
    const response = NextResponse.json({ success: true });
    
    // Set HTTP-only cookie with Firebase token
    // httpOnly: true prevents XSS attacks
    // secure: true requires HTTPS (set in production)
    // sameSite: 'lax' prevents CSRF attacks
    // maxAge: 30 days (Firebase tokens are valid for 1 hour, we refresh on client)
    response.cookies.set('auth_token', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    
    return response;
  } catch (error: any) {
    console.error('Error setting auth cookie:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to set auth cookie' },
      { status: 500 }
    );
  }
}

