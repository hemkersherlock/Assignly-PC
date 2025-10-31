import { NextResponse } from 'next/server';

/**
 * API route to clear auth cookie on logout
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear auth cookie
  response.cookies.delete('auth_token');
  
  return response;
}

