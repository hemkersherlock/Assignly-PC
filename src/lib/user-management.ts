'use server';

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { firestore } from '@/firebase';

/**
 * Initialize a new user with 40 credits
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} email - The user's email
 * @param {string} name - The user's display name
 */
export async function initializeUser(userId: string, email: string, name?: string) {
  try {
    console.log(`[User Management] Initializing user: ${email} (${userId})`);
    
    // Check if user already exists
    const userRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      console.log(`[User Management] User ${email} already exists`);
      return { success: true, message: 'User already exists' };
    }
    
    // Create new user document with 40 credits
    const userData = {
      id: userId,
      email: email,
      role: 'student',
      isActive: true,
      creditsRemaining: 40,
      totalOrders: 0,
      totalPages: 0,
      createdAt: new Date(),
      lastOrderAt: null,
    };
    
    await setDoc(userRef, userData);
    
    console.log(`[User Management] User ${email} created with 40 credits`);
    return { success: true, message: 'User created successfully with 40 credits' };
    
  } catch (error: any) {
    console.error(`[User Management] Failed to initialize user ${email}:`, error);
    throw new Error(`Failed to initialize user: ${error.message}`);
  }
}

/**
 * Get user credits
 * @param {string} userId - The user's Firebase Auth UID
 */
export async function getUserCredits(userId: string) {
  try {
    const userRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    return {
      creditsRemaining: userData.creditsRemaining || 0,
      totalPages: userData.totalPages || userData.totalPagesUsed || 0,
      totalOrders: userData.totalOrders || userData.totalOrdersPlaced || 0,
    };
    
  } catch (error: any) {
    console.error(`[User Management] Failed to get user credits:`, error);
    throw new Error(`Failed to get user credits: ${error.message}`);
  }
}
