import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyAdminAuth, forbiddenResponse, unauthorizedResponse, sanitizeErrorMessage } from '@/lib/api-auth';

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

// Generate a random password
function generatePassword(length: number = 12): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin authentication
    const adminAuth = await verifyAdminAuth(request);
    if (!adminAuth) {
      const { verifyAuthToken } = await import('@/lib/api-auth');
      const authResult = await verifyAuthToken(request);
      return authResult ? forbiddenResponse() : unauthorizedResponse();
    }

    const { email, name, referralCode } = await request.json();

    // Validate input
    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Enhanced input validation
    if (typeof email !== 'string' || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid input types' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate name length
    if (name.trim().length === 0 || name.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid name length' },
        { status: 400 }
      );
    }

    // Validate referral code format if provided
    if (referralCode && (typeof referralCode !== 'string' || referralCode.length > 50)) {
      return NextResponse.json(
        { success: false, error: 'Invalid referral code format' },
        { status: 400 }
      );
    }

    console.log('🔒 Admin creating student account:', { 
      adminId: adminAuth.userId,
      adminEmail: adminAuth.email,
      studentEmail: email 
    });

    console.log('Creating student account:', { email, name });

    const auth = getAuth();
    const db = getFirestore();

    // Check for referral code and get bonus credits
    let bonusCredits = 0;
    let referralLinkId = null;
    
    if (referralCode) {
      console.log('Checking referral code:', referralCode);
      const linksSnapshot = await db.collection('referral_links').where('code', '==', referralCode).get();
      
      if (!linksSnapshot.empty) {
        const linkDoc = linksSnapshot.docs[0];
        const linkData = linkDoc.data();
        
        if (linkData.active) {
          bonusCredits = linkData.credits || 0;
          referralLinkId = linkDoc.id;
          console.log('Referral code valid, bonus credits:', bonusCredits);
        }
      }
    }

    // Generate password
    const password = generatePassword(12);
    console.log('Generated password for student');

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name,
    });

    console.log('Created Firebase Auth user:', userRecord.uid);

    // Create user document in Firestore
    const userData = {
      id: userRecord.uid,
      email: email,
      name: name,
      whatsappNo: '', // Empty to trigger onboarding
      section: '', // Empty to trigger onboarding
      year: '', // Empty to trigger onboarding
      sem: '', // Empty to trigger onboarding
      branch: '', // Empty to trigger onboarding
      role: 'student',
      creditsRemaining: 40 + bonusCredits, // Default 40 credits + bonus
      totalOrders: 0,
      totalPages: 0,
      isActive: true,
      createdAt: new Date(),
      lastOrderAt: null,
      lastCreditRollover: new Date(), // Track credit rollover date for monthly rollover
      referralCode: referralCode || null, // Track where they came from
    };

    await db.collection('users').doc(userRecord.uid).set(userData);
    console.log('Created user document in Firestore');

    // Update referral link stats if applicable
    if (referralLinkId) {
      await db.collection('referral_links').doc(referralLinkId).update({
        signups: FieldValue.increment(1),
      });
      console.log('Updated referral link signup count');
    }

    // Create audit log
    const auditLogRef = db.collection('audit_logs').doc();
    await auditLogRef.set({
      action: 'student_account_created',
      adminId: adminAuth.userId,
      adminEmail: adminAuth.email,
      studentId: userRecord.uid,
      studentEmail: email,
      bonusCredits,
      referralCode: referralCode || null,
      timestamp: new Date(),
    });

    // 🔒 SECURITY: Never return password in API response
    // Password should be shared via secure channel (email/SMS)
    // For now, return success without password
    console.log('✅ Student account created successfully by admin:', adminAuth.userId);
    console.log('⚠️ Password generated but NOT returned in response (security best practice)');
    console.log('💡 Send password via secure email/SMS instead');

    return NextResponse.json({
      success: true,
      message: bonusCredits > 0 
        ? `Student account created successfully with ${bonusCredits} bonus credits! 🎁`
        : 'Student account created successfully',
      student: {
        id: userRecord.uid,
        email: email,
        name: name,
        creditsRemaining: 40 + bonusCredits,
      },
      // Security note: Password must be sent via secure channel (email/SMS)
      // It is NOT included in this response for security reasons
      securityNote: 'Password has been generated but is not returned in this response for security. Please retrieve it from secure logs or send it via email/SMS.',
      // Include password ONLY if this is a development environment (NOT recommended for production)
      // Remove this in production - password should NEVER be in API response
      ...(process.env.NODE_ENV === 'development' ? { _devPassword: password } : {}),
    });

  } catch (error: any) {
    console.error('Error creating student:', error);
    
    // Use sanitized error messages
    const errorMessage = sanitizeErrorMessage(error);
    
    // Handle specific Firebase errors with proper status codes
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 409 }
      );
    }
    
    if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
