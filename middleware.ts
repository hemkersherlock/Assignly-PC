import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * SIMPLE Middleware - Just checks cookie existence (NO slow Firestore calls)
 * Fast redirect based on cookie presence, client handles actual auth verification
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Just check if cookie exists (fast - no database calls)
  const hasAuthCookie = request.cookies.has('auth_token');
  
  // Define protected routes
  const protectedPaths = ['/dashboard', '/orders', '/admin', '/profile'];
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));
  
  // Define auth page
  const isAuthPage = pathname === '/login';
  
  // Get root path
  const isRoot = pathname === '/';
  
  // If accessing protected route without cookie → redirect to login
  if (isProtected && !hasAuthCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If accessing login page with cookie → redirect to dashboard
  if (isAuthPage && hasAuthCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // If accessing root → redirect based on cookie
  if (isRoot) {
    return NextResponse.redirect(
      new URL(hasAuthCookie ? '/dashboard' : '/login', request.url)
    );
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

