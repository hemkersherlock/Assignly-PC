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

    const { orderId, studentId, status } = await request.json();

    // Validate input
    if (!orderId || !studentId || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: orderId, studentId, status' },
        { status: 400 }
      );
    }

    // Validate status enum
    const validStatuses = ['pending', 'writing', 'on the way', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Verify order exists
    const orderRef = db.collection(`users/${studentId}/orders`).doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update order status using transaction
    await db.runTransaction(async (transaction) => {
      const freshOrderDoc = await transaction.get(orderRef);
      if (!freshOrderDoc.exists) {
        throw new Error('Order not found during transaction');
      }

      transaction.update(orderRef, {
        status,
        updatedAt: new Date(),
        updatedBy: adminAuth.userId,
      });
    });

    // Create audit log
    const auditLogRef = db.collection('audit_logs').doc();
    await auditLogRef.set({
      action: 'order_status_updated',
      adminId: adminAuth.userId,
      adminEmail: adminAuth.email,
      orderId,
      studentId,
      oldStatus: orderDoc.data()?.status || 'unknown',
      newStatus: status,
      timestamp: new Date(),
    });

    console.log('✅ Order status updated by admin:', {
      adminId: adminAuth.userId,
      orderId,
      status,
    });

    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully',
      orderId,
      status,
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: sanitizeErrorMessage(error)
      },
      { status: 500 }
    );
  }
}

