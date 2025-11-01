import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {HttpsError} from 'firebase-functions/v1/https';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// Cloud Function to automatically update order status from pending to writing after 2.5 hours
export const updateOrderStatus = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    console.log('Running order status update check...');
    
    try {
      const db = admin.firestore();
      const now = new Date();
      const twoAndHalfHoursAgo = new Date(now.getTime() - (2.5 * 60 * 60 * 1000));
      
      console.log(`Checking for orders created before: ${twoAndHalfHoursAgo.toISOString()}`);
      
      // Get all users
      const usersSnapshot = await db.collection('users').get();
      let updatedCount = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Get orders for this user that are still pending
        const ordersSnapshot = await db
          .collection(`users/${userId}/orders`)
          .where('status', '==', 'pending')
          .get();
        
        for (const orderDoc of ordersSnapshot.docs) {
          const orderData = orderDoc.data();
          const createdAt = orderData.createdAt;
          
          if (createdAt) {
            const orderDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
            
            // Check if order is older than 2.5 hours
            if (orderDate < twoAndHalfHoursAgo) {
              console.log(`Updating order ${orderDoc.id} from pending to writing`);
              
              await orderDoc.ref.update({
                status: 'writing',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              
              updatedCount++;
            }
          }
        }
      }
      
      console.log(`Updated ${updatedCount} orders from pending to writing`);
      return { success: true, updatedCount };
      
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  });

// Optional: Manual trigger function for testing
export const manualOrderStatusUpdate = functions.https.onCall(async (data, context) => {
  // Check if user is admin (optional security check)
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  try {
    const db = admin.firestore();
    const now = new Date();
    const twoAndHalfHoursAgo = new Date(now.getTime() - (2.5 * 60 * 60 * 1000));
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    let updatedCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      // Get orders for this user that are still pending
      const ordersSnapshot = await db
        .collection(`users/${userId}/orders`)
        .where('status', '==', 'pending')
        .get();
      
      for (const orderDoc of ordersSnapshot.docs) {
        const orderData = orderDoc.data();
        const createdAt = orderData.createdAt;
        
        if (createdAt) {
          const orderDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
          
          // Check if order is older than 2.5 hours
          if (orderDate < twoAndHalfHoursAgo) {
            await orderDoc.ref.update({
              status: 'writing',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            updatedCount++;
          }
        }
      }
    }
    
    return { success: true, updatedCount };
    
  } catch (error) {
    console.error('Error in manual order status update:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update order status');
  }
});

// ============================================================================
// 🔒 SECURE ORDER CREATION - Server-Side Credit Validation
// ============================================================================

/**
 * Secure order creation with server-side validation
 * This prevents students from:
 * - Manipulating credit deductions
 * - Creating orders without proper credits
 * - Exploiting race conditions
 * - Submitting spam orders
 */
export const createSecureOrder = functions.https.onCall(async (data, context) => {
  // ===== AUTHENTICATION CHECK =====
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to create orders');
  }

  const userId = context.auth.uid;
  const {
    orderId,
    assignmentTitle,
    orderType,
    pageCount,
    uploadedFiles,
    cloudinaryFolder,
  } = data;

  // ===== INPUT VALIDATION =====
  if (!orderId || !assignmentTitle || !orderType || !pageCount) {
    throw new HttpsError('invalid-argument', 'Missing required order fields');
  }

  if (pageCount <= 0 || pageCount > 1000) {
    throw new HttpsError('invalid-argument', 'Invalid page count (must be between 1 and 1000)');
  }

  if (!['assignment', 'practical'].includes(orderType)) {
    throw new HttpsError('invalid-argument', 'Invalid order type');
  }

  if (!Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
    throw new HttpsError('invalid-argument', 'At least one file must be uploaded');
  }

  // ===== RATE LIMITING CHECK =====
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User profile not found');
    }

    const userData = userDoc.data()!;

    // Check last order time (prevent spam)
    if (userData.lastOrderAt) {
      const lastOrderTime = userData.lastOrderAt.toDate();
      const timeSinceLastOrder = Date.now() - lastOrderTime.getTime();
      const COOLDOWN_MS = 30 * 1000; // 30 seconds cooldown

      if (timeSinceLastOrder < COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((COOLDOWN_MS - timeSinceLastOrder) / 1000);
        throw new HttpsError(
          'resource-exhausted',
          `Please wait ${remainingSeconds} seconds before submitting another order`
        );
      }
    }

    // ===== CREDIT VALIDATION (SERVER-SIDE) =====
    const currentCredits = userData.creditsRemaining || 0;

    if (currentCredits < pageCount) {
      throw new HttpsError(
        'failed-precondition',
        `Insufficient credits. You have ${currentCredits} credits but need ${pageCount}`
      );
    }

    // ===== CHECK REFERRAL LINK (before transaction) =====
    let referralLinkRef = null;
    if (userData.referralCode) {
      const referralLinksSnapshot = await db
        .collection('referral_links')
        .where('code', '==', userData.referralCode)
        .limit(1)
        .get();
      
      if (!referralLinksSnapshot.empty) {
        referralLinkRef = referralLinksSnapshot.docs[0].ref;
      }
    }

    // ===== ATOMIC TRANSACTION =====
    // Use transaction to prevent race conditions (double submission exploits)
    const result = await db.runTransaction(async (transaction) => {
      // Re-check credits inside transaction (prevents race condition)
      const freshUserDoc = await transaction.get(userRef);
      const freshData = freshUserDoc.data()!;
      const freshCredits = freshData.creditsRemaining || 0;

      if (freshCredits < pageCount) {
        throw new HttpsError(
          'failed-precondition',
          'Credits changed during submission. Please try again.'
        );
      }

      // Calculate new values
      const newCredits = freshCredits - pageCount;
      const newTotalOrders = (freshData.totalOrders || 0) + 1;
      const newTotalPages = (freshData.totalPages || 0) + pageCount;

      // Create order document
      const orderRef = db
        .collection('users')
        .doc(userId)
        .collection('orders')
        .doc(orderId);

      const orderData = {
        id: orderId,
        assignmentTitle,
        orderType,
        pageCount,
        originalFiles: uploadedFiles,
        cloudinaryFolder: cloudinaryFolder || '',
        status: 'pending',
        studentId: userId,
        studentEmail: context.auth?.token.email || 'unknown@example.com',
        studentName: userData.name || 'Unknown',
        studentBranch: userData.branch || 'Unknown',
        studentYear: userData.year || 'Unknown',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        startedAt: null,
        completedAt: null,
        turnaroundTimeHours: null,
        notes: null,
        // Security: Add server-validated timestamp
        serverValidated: true,
        serverValidatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Atomic operations
      transaction.set(orderRef, orderData);
      transaction.update(userRef, {
        creditsRemaining: newCredits,
        totalOrders: newTotalOrders,
        totalPages: newTotalPages,
        lastOrderAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ===== AUDIT LOGGING =====
      const auditRef = db.collection('audit_logs').doc();
      transaction.set(auditRef, {
        action: 'order_created',
        userId,
        orderId,
        pageCount,
        creditsDeducted: pageCount,
        creditsRemaining: newCredits,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ipAddress: context.rawRequest.ip || 'unknown',
        userAgent: context.rawRequest.headers['user-agent'] || 'unknown',
      });

      // ===== REFERRAL TRACKING =====
      // If user signed up with referral code, track order for that referral
      if (referralLinkRef) {
        transaction.update(referralLinkRef, {
          orders: admin.firestore.FieldValue.increment(1),
        });
        console.log(`✅ Tracked order for referral code: ${userData.referralCode}`);
      }

      return {
        success: true,
        orderId,
        creditsRemaining: newCredits,
        creditsDeducted: pageCount,
      };
    });

    console.log(`✅ Secure order created: ${orderId} for user ${userId}`);
    return result;

  } catch (error) {
    console.error('❌ Error creating secure order:', error);
    
    // Re-throw HttpsError as-is
    if (error instanceof HttpsError) {
      throw error;
    }

    // Log unexpected errors for monitoring
    await db.collection('error_logs').add({
      function: 'createSecureOrder',
      userId,
      error: error instanceof Error ? error.message : String(error),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    throw new HttpsError('internal', 'Failed to create order. Please try again.');
  }
});

// ============================================================================
// 🔒 ADMIN CREDIT ADJUSTMENT - With Audit Trail
// ============================================================================

export const adjustUserCredits = functions.https.onCall(async (data, context) => {
  // Check admin authentication
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const adminId = context.auth.uid;

  // Verify admin role
  const adminRoleDoc = await db.collection('roles_admin').doc(adminId).get();
  if (!adminRoleDoc.exists) {
    throw new HttpsError('permission-denied', 'Only admins can adjust credits');
  }

  const { userId, creditAmount, reason } = data;

  if (!userId || creditAmount === undefined) {
    throw new HttpsError('invalid-argument', 'Missing userId or creditAmount');
  }

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User not found');
    }

    const currentCredits = userDoc.data()!.creditsRemaining || 0;
    const newCredits = Math.max(0, currentCredits + creditAmount); // Prevent negative

    await userRef.update({
      creditsRemaining: newCredits,
    });

    // Audit log
    await db.collection('audit_logs').add({
      action: 'credits_adjusted',
      adminId,
      userId,
      creditChange: creditAmount,
      oldCredits: currentCredits,
      newCredits,
      reason: reason || 'No reason provided',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      newCredits,
      oldCredits: currentCredits,
    };

  } catch (error) {
    console.error('Error adjusting credits:', error);
    throw new HttpsError('internal', 'Failed to adjust credits');
  }
});

// ============================================================================
// 🔍 FRAUD DETECTION - Monitor Suspicious Activity
// ============================================================================

export const detectFraud = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    console.log('Running fraud detection...');

    try {
      // Check for suspicious patterns
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // 1. Multiple accounts from same IP
      const recentAudits = await db
        .collection('audit_logs')
        .where('action', '==', 'order_created')
        .where('timestamp', '>=', oneHourAgo)
        .get();

      const ipMap = new Map<string, Set<string>>();

      recentAudits.forEach((doc) => {
        const data = doc.data();
        const ip = data.ipAddress;
        const userId = data.userId;

        if (!ipMap.has(ip)) {
          ipMap.set(ip, new Set());
        }
        ipMap.get(ip)!.add(userId);
      });

      // Flag IPs with multiple users
      const suspiciousIPs: string[] = [];
      ipMap.forEach((users, ip) => {
        if (users.size >= 3) {
          suspiciousIPs.push(ip);
          console.warn(`⚠️ Suspicious IP detected: ${ip} (${users.size} different users)`);
        }
      });

      // 2. Users with abnormally high order volume
      const usersSnapshot = await db.collection('users').get();
      const suspiciousUsers: string[] = [];

      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        const totalOrders = data.totalOrders || 0;
        const accountAge = now.getTime() - data.createdAt.toDate().getTime();
        const daysOld = accountAge / (1000 * 60 * 60 * 24);

        // More than 10 orders per day on average
        if (daysOld > 0 && (totalOrders / daysOld) > 10) {
          suspiciousUsers.push(doc.id);
          console.warn(`⚠️ Suspicious user activity: ${doc.id} (${totalOrders} orders in ${Math.round(daysOld)} days)`);
        }
      });

      // Log fraud alerts
      if (suspiciousIPs.length > 0 || suspiciousUsers.length > 0) {
        await db.collection('fraud_alerts').add({
          suspiciousIPs,
          suspiciousUsers,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          reviewed: false,
        });
      }

      return {
        success: true,
        suspiciousIPs: suspiciousIPs.length,
        suspiciousUsers: suspiciousUsers.length,
      };

    } catch (error) {
      console.error('Error in fraud detection:', error);
      throw error;
    }
  });

// ============================================================================
// 💰 MONTHLY CREDIT ROLLOVER - Professional System with Transaction Protection
// ============================================================================

/**
 * Helper function to normalize dates to UTC and extract year/month/day
 */
function normalizeDate(date: Date): { year: number; month: number; day: number } {
  const utcDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  return {
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth(),
    day: utcDate.getUTCDate(),
  };
}

/**
 * Check if rollover should happen based on enrollment/last rollover date
 * Returns true if current date >= anniversary date AND hasn't rolled over this month
 */
function checkShouldRollover(
  enrollmentDate: admin.firestore.Timestamp | Date,
  lastRollover: admin.firestore.Timestamp | Date | null,
  now: Date
): { shouldRollover: boolean; reason: string } {
  // Normalize all dates to UTC
  const nowNormalized = normalizeDate(now);
  
  // Get base date (lastRollover if exists, otherwise enrollment)
  let baseDate: Date;
  if (lastRollover) {
    baseDate = (lastRollover as admin.firestore.Timestamp).toDate 
      ? (lastRollover as admin.firestore.Timestamp).toDate() 
      : new Date(lastRollover as Date);
  } else {
    baseDate = (enrollmentDate as admin.firestore.Timestamp).toDate 
      ? (enrollmentDate as admin.firestore.Timestamp).toDate() 
      : new Date(enrollmentDate as Date);
  }
  
  const baseNormalized = normalizeDate(baseDate);
  
  // Calculate next anniversary date (same day next month)
  let nextAnniversaryYear = baseNormalized.year;
  let nextAnniversaryMonth = baseNormalized.month + 1;
  if (nextAnniversaryMonth > 11) {
    nextAnniversaryMonth = 0;
    nextAnniversaryYear += 1;
  }
  
  // Check if we've reached or passed the anniversary
  const hasReachedAnniversary = 
    nowNormalized.year > nextAnniversaryYear ||
    (nowNormalized.year === nextAnniversaryYear && nowNormalized.month > nextAnniversaryMonth) ||
    (nowNormalized.year === nextAnniversaryYear && nowNormalized.month === nextAnniversaryMonth && nowNormalized.day >= baseNormalized.day);
  
  if (!hasReachedAnniversary) {
    return { shouldRollover: false, reason: 'Anniversary date not reached yet' };
  }
  
  // If we have a lastRollover, check if we already rolled over this month
  if (lastRollover) {
    const lastRolloverDate = (lastRollover as admin.firestore.Timestamp).toDate 
      ? (lastRollover as admin.firestore.Timestamp).toDate() 
      : new Date(lastRollover as Date);
    const lastNormalized = normalizeDate(lastRolloverDate);
    
    // Already rolled over this month?
    if (nowNormalized.year === lastNormalized.year && nowNormalized.month === lastNormalized.month) {
      return { shouldRollover: false, reason: 'Already rolled over this month' };
    }
  }
  
  return { shouldRollover: true, reason: 'Anniversary reached, rollover needed' };
}

/**
 * Monthly credit rollover function
 * Runs daily to check enrollment anniversaries
 * Preserves existing credits when it's been a month since enrollment/last rollover
 * Credits roll over on the enrollment date anniversary (e.g., enrolled Oct 29, rolls over Nov 29+)
 * NO automatic credit addition - admin adds credits manually based on payment status
 * 
 * FIXES:
 * - ✅ Proper UTC date normalization
 * - ✅ Transaction protection with idempotency checks
 * - ✅ Enhanced logging with user details
 * - ✅ Prevents duplicate rollovers in same month
 */
export const monthlyCreditRollover = functions.pubsub
  .schedule('every 24 hours') // Run daily to check enrollment anniversaries
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Running monthly credit rollover check...');
    
    try {
      const now = new Date();
      const usersSnapshot = await db.collection('users').where('role', '==', 'student').get();
      let processedCount = 0;
      let skippedCount = 0;
      const processedUsers: string[] = [];
      const skippedReasons: Record<string, number> = {};
      
      const BATCH_SIZE = 450; // Keep below 500 for safety
      
      // Process in transactions for atomicity
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        // Only process active students
        if (!userData.isActive) {
          skippedReasons['inactive'] = (skippedReasons['inactive'] || 0) + 1;
          continue;
        }
        
        const enrollmentDate = userData.createdAt;
        const lastRollover = userData.lastCreditRollover || null;
        
        // Validate required fields
        if (!enrollmentDate) {
          skippedReasons['no_enrollment_date'] = (skippedReasons['no_enrollment_date'] || 0) + 1;
          continue;
        }
        
        // Check if rollover should happen
        const { shouldRollover, reason } = checkShouldRollover(enrollmentDate, lastRollover, now);
        
        if (!shouldRollover) {
          skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
          continue;
        }
        
        // Use transaction to ensure atomicity and prevent duplicate rollovers
        try {
          await db.runTransaction(async (transaction) => {
            const userRef = db.collection('users').doc(userDoc.id);
            const freshDoc = await transaction.get(userRef);
            
            if (!freshDoc.exists) {
              throw new Error('User document not found');
            }
            
            const freshData = freshDoc.data()!;
            
            // Double-check rollover is still needed (idempotency check)
            const freshLastRollover = freshData.lastCreditRollover || null;
            const { shouldRollover: stillNeeded } = checkShouldRollover(
              freshData.createdAt,
              freshLastRollover,
              now
            );
            
            if (!stillNeeded) {
              throw new Error('Rollover already completed (idempotency check)');
            }
            
            // Update rollover date atomically (credits remain unchanged)
            transaction.update(userRef, {
              lastCreditRollover: admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          
          processedCount++;
          processedUsers.push(userDoc.id);
          
          // Log individual rollover (batch for efficiency)
          if (processedUsers.length >= 50) {
            await db.collection('credit_rollover_logs').add({
              batch: true,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              userIds: processedUsers.splice(0, 50),
              action: 'credit_rollover',
              note: 'Credits preserved, rollover date updated',
            });
          }
          
        } catch (error) {
          // Transaction conflict or validation failure - log but don't fail entire batch
          console.warn(`⚠️ Failed to rollover user ${userDoc.id}:`, error instanceof Error ? error.message : String(error));
          skippedReasons['transaction_failed'] = (skippedReasons['transaction_failed'] || 0) + 1;
        }
      }
      
      // Log remaining processed users
      if (processedUsers.length > 0) {
        await db.collection('credit_rollover_logs').add({
          batch: true,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          userIds: processedUsers,
          action: 'credit_rollover',
          note: 'Credits preserved, rollover date updated',
        });
      }
      
      // Log summary
      await db.collection('credit_rollover_logs').add({
        summary: true,
        date: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        usersProcessed: processedCount,
        usersSkipped: skippedCount,
        skipReasons: skippedReasons,
        note: 'Monthly credit rollover completed - credits preserved',
      });
      
      console.log(`✅ Monthly credit rollover completed: ${processedCount} users processed, ${Object.keys(skippedReasons).length} skip reasons`);
      
      return {
        success: true,
        usersProcessed: processedCount,
        usersSkipped: skippedCount,
        skipReasons: skippedReasons,
        message: 'Credits preserved based on enrollment anniversary',
      };
      
    } catch (error) {
      console.error('❌ Error in monthly credit rollover:', error);
      
      // Log error for monitoring
      await db.collection('error_logs').add({
        function: 'monthlyCreditRollover',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      throw error;
    }
  });

/**
 * Manual trigger for credit rollover check (for testing/admin use)
 * Uses same logic as scheduled function with proper validation
 */
export const manualCreditRollover = functions.https.onCall(async (data, context) => {
  // Check if user is admin
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  // Verify admin role
  const adminRoleDoc = await db.collection('roles_admin').doc(context.auth.uid).get();
  if (!adminRoleDoc.exists) {
    throw new HttpsError('permission-denied', 'Only admins can trigger manual rollover');
  }
  
  try {
    const now = new Date();
    const usersSnapshot = await db.collection('users').where('role', '==', 'student').get();
    let processedCount = 0;
    const processedUsers: string[] = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      if (!userData.isActive || !userData.createdAt) {
        continue;
      }
      
      const { shouldRollover } = checkShouldRollover(
        userData.createdAt,
        userData.lastCreditRollover || null,
        now
      );
      
      if (shouldRollover) {
        // Use transaction for atomicity
        await db.runTransaction(async (transaction) => {
          const userRef = db.collection('users').doc(userDoc.id);
          const freshDoc = await transaction.get(userRef);
          const freshData = freshDoc.data()!;
          
          // Idempotency check
          const { shouldRollover: stillNeeded } = checkShouldRollover(
            freshData.createdAt,
            freshData.lastCreditRollover || null,
            now
          );
          
          if (!stillNeeded) {
            throw new Error('Already rolled over');
          }
          
          transaction.update(userRef, {
            lastCreditRollover: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
        
        processedCount++;
        processedUsers.push(userDoc.id);
      }
    }
    
    // Audit log
    await db.collection('audit_logs').add({
      action: 'manual_credit_rollover',
      adminId: context.auth.uid,
      usersProcessed: processedCount,
      userIds: processedUsers,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return {
      success: true,
      usersProcessed: processedCount,
      message: 'Credits preserved based on enrollment anniversary - no automatic credit addition',
    };
    
  } catch (error) {
    console.error('Error in manual credit rollover:', error);
    throw new HttpsError('internal', 'Failed to rollover credits');
  }
});

// ============================================================================
// 🔒 BULK CREDIT ADDITION - Server-Side Only (Replaces Client-Side Admin Quota)
// ============================================================================

/**
 * Bulk add credits to all active students
 * Server-side only - prevents client manipulation
 */
export const bulkAddCreditsToAll = functions.https.onCall(async (data, context) => {
  // Admin authentication
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }
  
  const adminId = context.auth.uid;
  const adminRoleDoc = await db.collection('roles_admin').doc(adminId).get();
  if (!adminRoleDoc.exists) {
    throw new HttpsError('permission-denied', 'Only admins can bulk add credits');
  }
  
  const { creditAmount = 40, reason } = data;
  
  if (creditAmount <= 0 || creditAmount > 1000) {
    throw new HttpsError('invalid-argument', 'Credit amount must be between 1 and 1000');
  }
  
  try {
    const usersSnapshot = await db.collection('users')
      .where('role', '==', 'student')
      .where('isActive', '==', true)
      .get();
    
    let processedCount = 0;
    let creditsAdded = 0;
    const processedUsers: Array<{ userId: string; oldCredits: number; newCredits: number }> = [];
    
    // Process in batches with transactions
    for (const userDoc of usersSnapshot.docs) {
      try {
        await db.runTransaction(async (transaction) => {
          const userRef = db.collection('users').doc(userDoc.id);
          const freshDoc = await transaction.get(userRef);
          
          if (!freshDoc.exists) {
            throw new Error('User not found');
          }
          
          const freshData = freshDoc.data()!;
          const currentCredits = freshData.creditsRemaining || 0;
          const newCredits = currentCredits + creditAmount;
          
          transaction.update(userRef, {
            creditsRemaining: newCredits,
            lastCreditRollover: admin.firestore.FieldValue.serverTimestamp(),
            lastReplenishedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          processedUsers.push({
            userId: userDoc.id,
            oldCredits: currentCredits,
            newCredits: newCredits,
          });
        });
        
        processedCount++;
        creditsAdded += creditAmount;
      } catch (error) {
        console.warn(`Failed to add credits to user ${userDoc.id}:`, error);
      }
    }
    
    // Audit log
    await db.collection('audit_logs').add({
      action: 'bulk_credits_added',
      adminId,
      creditAmount,
      usersProcessed: processedCount,
      totalCreditsAdded: creditsAdded,
      reason: reason || 'Bulk credit addition',
      processedUsers: processedUsers.slice(0, 100), // Limit to first 100 for log size
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return {
      success: true,
      usersProcessed: processedCount,
      creditsAdded: creditsAdded,
      creditAmountPerUser: creditAmount,
    };
    
  } catch (error) {
    console.error('Error in bulk credit addition:', error);
    throw new HttpsError('internal', 'Failed to bulk add credits');
  }
});

