'use server';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase';

/**
 * Fix user credits for users who have negative or incorrect credits
 * This is a one-time migration script
 */
export async function fixUserCredits(userEmail: string) {
  try {
    console.log(`[Fix Credits] Starting credit fix for user: ${userEmail}`);
    
    // Find user by email (this is a simplified approach - in production you'd want a better search)
    // For now, we'll need to manually provide the user ID
    
    // You can get the user ID from Firebase Console or by checking the browser console
    // when the user is logged in - it will show the user ID in the logs
    
    console.log(`[Fix Credits] Please provide the user ID for ${userEmail} to fix their credits.`);
    console.log(`[Fix Credits] You can find the user ID in Firebase Console > Authentication > Users`);
    
    return { success: false, message: 'User ID needed for credit fix' };
    
  } catch (error: any) {
    console.error(`[Fix Credits] Failed to fix credits for ${userEmail}:`, error);
    throw new Error(`Failed to fix credits: ${error.message}`);
  }
}

/**
 * Fix credits for a specific user by their Firebase UID
 */
export async function fixUserCreditsByUID(userId: string, newCredits: number = 40) {
  try {
    console.log(`[Fix Credits] Fixing credits for user ID: ${userId} to ${newCredits}`);
    
    const userRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    console.log(`[Fix Credits] Current user data:`, userData);
    
    // Update the user's credits
    await updateDoc(userRef, {
      creditsRemaining: newCredits,
      // Also ensure other fields are correct
      totalOrders: userData.totalOrders || 0,
      totalPages: userData.totalPages || 0,
    });
    
    console.log(`[Fix Credits] Successfully updated credits for user ${userId} to ${newCredits}`);
    return { success: true, message: `Credits updated to ${newCredits}` };
    
  } catch (error: any) {
    console.error(`[Fix Credits] Failed to fix credits for user ${userId}:`, error);
    throw new Error(`Failed to fix credits: ${error.message}`);
  }
}

