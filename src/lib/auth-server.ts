import { cookies } from 'next/headers';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { AppUser } from '@/types';

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
 * Server-side function to get authenticated user
 * This runs on the SERVER before page renders, eliminating flicker
 */
export async function getServerUser(): Promise<AppUser | null> {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;
    
    if (!authToken) {
      return null;
    }
    
    // Verify Firebase token using Admin SDK
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(authToken);
    const userId = decodedToken.uid;
    
    // Get user data from Firestore
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    // Check if user is admin
    const adminDoc = await db.collection('roles_admin').doc(userId).get();
    const isAdmin = adminDoc.exists;
    
    const userData = userDoc.data()!;
    
    // Return formatted user object
    return {
      id: userId,
      email: decodedToken.email || userData.email || 'unknown@example.com',
      name: userData.name || '',
      role: isAdmin ? 'admin' : 'student',
      creditsRemaining: userData.creditsRemaining ?? userData.pageQuota ?? 40,
      totalOrders: userData.totalOrders ?? userData.totalOrdersPlaced ?? 0,
      totalPages: userData.totalPages ?? userData.totalPagesUsed ?? 0,
      isActive: userData.isActive ?? true,
      createdAt: userData.createdAt?.toDate?.() || new Date(),
      lastOrderAt: userData.lastOrderAt?.toDate?.() || null,
      whatsappNo: userData.whatsappNo || '',
      section: userData.section || '',
      year: userData.year || '1st Year',
      sem: userData.sem || '1st Sem',
      branch: userData.branch || 'CS',
      referralCode: userData.referralCode || null,
    };
  } catch (error) {
    console.error('Error getting server user:', error);
    return null;
  }
}

/**
 * Check if user is authenticated (quick check without fetching full user data)
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;
    
    if (!authToken) {
      return false;
    }
    
    const auth = getAuth();
    await auth.verifyIdToken(authToken);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if user is admin (for admin-only routes)
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await getServerUser();
    return user?.role === 'admin' || false;
  } catch {
    return false;
  }
}

