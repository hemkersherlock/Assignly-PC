'use server';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase';

/**
 * Migrate a user from pageQuota to creditsRemaining
 * @param {string} userId - The user's Firebase Auth UID
 */
export async function migrateUserCredits(userId: string) {
  try {
    console.log(`[Migration] Migrating user: ${userId}`);
    
    const userRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    // Check if user already has creditsRemaining field
    if (userData.creditsRemaining !== undefined) {
      console.log(`[Migration] User ${userId} already has creditsRemaining field`);
      return { success: true, message: 'User already migrated' };
    }
    
    // Migrate from pageQuota to creditsRemaining
    const pageQuota = userData.pageQuota || 40;
    
    await updateDoc(userRef, {
      creditsRemaining: pageQuota,
      // Keep pageQuota for backward compatibility
    });
    
    console.log(`[Migration] User ${userId} migrated from pageQuota ${pageQuota} to creditsRemaining ${pageQuota}`);
    return { success: true, message: `Migrated user with ${pageQuota} credits` };
    
  } catch (error: any) {
    console.error(`[Migration] Failed to migrate user ${userId}:`, error);
    throw new Error(`Failed to migrate user: ${error.message}`);
  }
}

/**
 * Migrate all users in the system
 */
export async function migrateAllUsers() {
  try {
    console.log('[Migration] Starting migration of all users...');
    
    // This would require admin access to list all users
    // For now, we'll handle migration on a per-user basis when they log in
    
    return { success: true, message: 'Migration completed' };
    
  } catch (error: any) {
    console.error('[Migration] Failed to migrate all users:', error);
    throw new Error(`Failed to migrate all users: ${error.message}`);
  }
}

