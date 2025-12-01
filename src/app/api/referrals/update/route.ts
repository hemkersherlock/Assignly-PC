import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
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

    const { linkId, active, name, credits } = await request.json();

    // Validate input
    if (!linkId || typeof linkId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Link ID is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const linkRef = db.collection('referral_links').doc(linkId);
    const linkDoc = await linkRef.get();

    if (!linkDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Referral link not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (typeof active === 'boolean') {
      updateData.active = active;
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Name must be a non-empty string' },
          { status: 400 }
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Name must be 100 characters or less' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (credits !== undefined) {
      if (typeof credits !== 'number' || credits < 0 || credits > 100) {
        return NextResponse.json(
          { success: false, error: 'Credits must be a number between 0 and 100' },
          { status: 400 }
        );
      }
      updateData.credits = credits;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updateData.updatedAt = new Date();
    updateData.updatedBy = adminAuth.userId;

    // Use transaction for atomicity
    await db.runTransaction(async (transaction) => {
      const freshDoc = await transaction.get(linkRef);
      if (!freshDoc.exists) {
        throw new Error('Referral link not found during transaction');
      }
      transaction.update(linkRef, updateData);
    });

    // Create audit log
    const auditLogRef = db.collection('audit_logs').doc();
    await auditLogRef.set({
      action: 'referral_link_updated',
      adminId: adminAuth.userId,
      adminEmail: adminAuth.email,
      referralLinkId: linkId,
      changes: updateData,
      timestamp: new Date(),
    });

    console.log('✅ Referral link updated by admin:', {
      adminId: adminAuth.userId,
      linkId,
      changes: Object.keys(updateData),
    });

    return NextResponse.json({
      success: true,
      message: 'Referral link updated successfully',
      linkId,
    });

  } catch (error) {
    console.error('Error updating referral link:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: sanitizeErrorMessage(error)
      },
      { status: 500 }
    );
  }
}

