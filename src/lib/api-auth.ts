/**
 * Shared authentication and authorization utilities for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

/**
 * Verify authentication token from request
 * Returns userId if valid, null otherwise
 */
export async function verifyAuthToken(request: NextRequest): Promise<{ userId: string; email?: string } | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    
    return {
      userId: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}

/**
 * Verify that the authenticated user is an admin
 * Returns admin info if valid, null otherwise
 */
export async function verifyAdminAuth(request: NextRequest): Promise<{ userId: string; email?: string } | null> {
  const authResult = await verifyAuthToken(request);
  if (!authResult) {
    return null;
  }

  const db = getFirestore();
  const adminRoleDoc = await db.collection('roles_admin').doc(authResult.userId).get();
  
  if (!adminRoleDoc.exists) {
    return null;
  }

  return authResult;
}

/**
 * Helper to return unauthorized response
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}

/**
 * Helper to return forbidden response (not admin)
 */
export function forbiddenResponse() {
  return NextResponse.json(
    { success: false, error: 'Forbidden: Admin access required' },
    { status: 403 }
  );
}

/**
 * Sanitize error message for client
 * Removes sensitive information and stack traces
 */
export function sanitizeErrorMessage(error: any): string {
  // Don't expose internal errors to client
  if (error instanceof Error) {
    // Only return safe, generic messages
    const safeMessages: Record<string, string> = {
      'auth/email-already-exists': 'Email already exists',
      'auth/invalid-email': 'Invalid email format',
      'auth/user-not-found': 'User not found',
      'auth/invalid-credential': 'Invalid credentials',
    };

    if (error.message && safeMessages[error.message]) {
      return safeMessages[error.message];
    }

    // For Firebase errors with code
    if ((error as any).code && safeMessages[(error as any).code]) {
      return safeMessages[(error as any).code];
    }

    // Generic fallback
    return 'An error occurred. Please try again.';
  }

  return 'An error occurred. Please try again.';
}

