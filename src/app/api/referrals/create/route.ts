import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyAdminAuth, forbiddenResponse, unauthorizedResponse, sanitizeErrorMessage } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin authentication
    const adminAuth = await verifyAdminAuth(request);
    if (!adminAuth) {
      const { verifyAuthToken } = await import('@/lib/api-auth');
      const authResult = await verifyAuthToken(request);
      return authResult ? forbiddenResponse() : unauthorizedResponse();
    }

    const { name, credits } = await request.json();

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Name must be 100 characters or less' },
        { status: 400 }
      );
    }

    if (typeof credits !== 'number' || credits < 0 || credits > 100) {
      return NextResponse.json(
        { success: false, error: 'Credits must be a number between 0 and 100' },
        { status: 400 }
      );
    }

    // Generate unique code
    const generateCode = (): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const db = getFirestore();
    let code = generateCode();
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure code is unique
    while (attempts < maxAttempts) {
      const existingLinks = await db
        .collection('referral_links')
        .where('code', '==', code)
        .limit(1)
        .get();

      if (existingLinks.empty) {
        break; // Code is unique
      }

      code = generateCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate unique code. Please try again.' },
        { status: 500 }
      );
    }

    const newLink = {
      code,
      name: name.trim(),
      credits,
      clicks: 0,
      signups: 0,
      orders: 0,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: adminAuth.userId,
      createdByEmail: adminAuth.email,
    };

    const docRef = await db.collection('referral_links').add(newLink);

    // Create audit log
    const auditLogRef = db.collection('audit_logs').doc();
    await auditLogRef.set({
      action: 'referral_link_created',
      adminId: adminAuth.userId,
      adminEmail: adminAuth.email,
      referralLinkId: docRef.id,
      code,
      name: name.trim(),
      credits,
      timestamp: new Date(),
    });

    console.log('✅ Referral link created by admin:', {
      adminId: adminAuth.userId,
      linkId: docRef.id,
      code,
    });

    return NextResponse.json({
      success: true,
      message: 'Referral link created successfully',
      link: {
        id: docRef.id,
        code,
        name: name.trim(),
        credits,
      },
    });

  } catch (error) {
    console.error('Error creating referral link:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: sanitizeErrorMessage(error)
      },
      { status: 500 }
    );
  }
}

