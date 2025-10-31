import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to handle authentication BEFORE page renders
 * This prevents flickering by checking auth on the server BEFORE React hydrates
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get auth token from cookie
  const authToken = request.cookies.get('auth_token')?.value;
  
  // Define protected routes
  const protectedPaths = ['/dashboard', '/orders', '/admin', '/profile'];
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));
  
  // Define auth page
  const isAuthPage = pathname === '/login';
  
  // Get root path
  const isRoot = pathname === '/';
  
  // If accessing protected route without auth → redirect to login
  if (isProtected && !authToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // If accessing login page with auth → redirect to dashboard
  if (isAuthPage && authToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // If accessing root → redirect based on auth
  if (isRoot) {
    if (authToken) {
      // Has auth → redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      // No auth → redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // Allow request to continue
  return NextResponse.next();
}

// Configure which routes should run this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',
  ],
};

