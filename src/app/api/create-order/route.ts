import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // 2. Get request data
    const {
      orderId,
      assignmentTitle,
      orderType,
      pageCount,
      uploadedFiles,
      cloudinaryFolder,
    } = await request.json();

    // 3. Validate input
    if (!orderId || !assignmentTitle || !orderType || !pageCount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (pageCount < 1 || pageCount > 1000) {
      return NextResponse.json(
        { success: false, error: 'Invalid page count' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // 4. Check user credits (SERVER-SIDE)
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data()!;
    const currentCredits = userData.creditsRemaining || 0;

    if (currentCredits < pageCount) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient credits. You have ${currentCredits} but need ${pageCount}` 
        },
        { status: 400 }
      );
    }

    // 5. ATOMIC TRANSACTION (prevents race conditions)
    await db.runTransaction(async (transaction) => {
      // Re-check credits inside transaction
      const freshUserDoc = await transaction.get(userRef);
      const freshCredits = freshUserDoc.data()?.creditsRemaining || 0;

      if (freshCredits < pageCount) {
        throw new Error('Credits changed during submission. Please try again.');
      }

      // Create order
      const orderRef = db.collection('users').doc(userId).collection('orders').doc(orderId);
      transaction.set(orderRef, {
        id: orderId,
        assignmentTitle,
        orderType,
        pageCount,
        originalFiles: uploadedFiles,
        cloudinaryFolder: cloudinaryFolder || '',
        status: 'pending',
        studentId: userId,
        studentEmail: userData.email,
        studentName: userData.name || 'Unknown',
        studentBranch: userData.branch || 'Unknown',
        studentYear: userData.year || 'Unknown',
        createdAt: FieldValue.serverTimestamp(),
        startedAt: null,
        completedAt: null,
        turnaroundTimeHours: null,
        notes: null,
      });

      // Update user credits
      const newCredits = freshCredits - pageCount;
      transaction.update(userRef, {
        creditsRemaining: newCredits,
        totalOrders: FieldValue.increment(1),
        totalPages: FieldValue.increment(pageCount),
        lastOrderAt: FieldValue.serverTimestamp(),
      });

      // Track referral if applicable
      if (userData.referralCode) {
        const linksSnapshot = await db
          .collection('referral_links')
          .where('code', '==', userData.referralCode)
          .limit(1)
          .get();

        if (!linksSnapshot.empty) {
          const linkRef = linksSnapshot.docs[0].ref;
          transaction.update(linkRef, {
            orders: FieldValue.increment(1),
          });
        }
      }
    });

    console.log(`✅ Secure order created: ${orderId} for user ${userId}`);

    return NextResponse.json({
      success: true,
      orderId,
      creditsRemaining: currentCredits - pageCount,
    });

  } catch (error: any) {
    console.error('Error creating order:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: sanitizeErrorMessage(error)
      },
      { status: 500 }
    );
  }
}



