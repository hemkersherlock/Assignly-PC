import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';
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

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Helper function to delete Cloudinary files using Admin API
async function deleteCloudinaryFiles(originalFiles: any[], cloudinaryFolder?: string): Promise<boolean> {
  try {
    console.log('\n🧹 ========== CLOUDINARY DELETION START ==========');
    console.log('📂 Folder to delete:', cloudinaryFolder);
    console.log('📄 Files to delete:', originalFiles?.length || 0);
    // 🔒 SECURITY: Don't log environment variables
    const hasCloudinaryConfig = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
    console.log('🔑 Cloudinary config:', hasCloudinaryConfig ? '✅ SET' : '❌ NOT SET');
    
    if (!cloudinaryFolder) {
      console.log('⚠️ No cloudinary folder provided - skipping');
      return true;
    }

    // 🔧 FIX: Check for OLD duplicated paths (bug fix for legacy uploads)
    console.log(`\n📁 Checking for files in folder: ${cloudinaryFolder}`);
    let folderContents = await cloudinary.api.resources({
      type: 'upload',
      prefix: cloudinaryFolder,
      max_results: 500
    });
    
    let resourceCount = folderContents.resources?.length || 0;
    
    // If not found, try with duplicated path (for old buggy uploads)
    if (resourceCount === 0) {
      const duplicatedPath = `${cloudinaryFolder}/${cloudinaryFolder}`;
      console.log(`⚠️ No files found, trying duplicated path: ${duplicatedPath}`);
      
      folderContents = await cloudinary.api.resources({
        type: 'upload',
        prefix: duplicatedPath,
        max_results: 500
      });
      
      resourceCount = folderContents.resources?.length || 0;
      if (resourceCount > 0) {
        console.log(`✅ Found files in duplicated path! (old upload bug)`);
      }
    }
    
    console.log(`📋 Total resources found: ${resourceCount}`);
    
    if (!folderContents.resources || folderContents.resources.length === 0) {
      console.log('📁 Folder is already empty');
      return true;
    }
    
    // Log all found resources
    folderContents.resources.forEach((resource: any, index: number) => {
      console.log(`Resource ${index + 1}: ${resource.public_id} (${resource.format})`);
    });
    
    // Delete all resources found in the folder
    console.log('🗑️ Deleting all resources...');
    
    const deletePromises = folderContents.resources.map(async (resource: any) => {
      try {
        console.log(`Deleting: ${resource.public_id}`);
        const result = await cloudinary.uploader.destroy(resource.public_id);
        console.log(`✅ Deleted: ${resource.public_id} - ${result.result}`);
        return result.result === 'ok';
      } catch (error) {
        console.error(`❌ Failed to delete ${resource.public_id}:`, error);
        return false;
      }
    });
    
    const results = await Promise.all(deletePromises);
    const successCount = results.filter(Boolean).length;
    const failCount = results.length - successCount;
    
    console.log(`\n📊 DELETION RESULTS:`);
    console.log(`  ✅ Success: ${successCount}/${results.length}`);
    console.log(`  ❌ Failed: ${failCount}/${results.length}`);
    
    // Try to delete the folder itself
    try {
      console.log('\n📁 Attempting to delete folder itself...');
      const folderResult = await cloudinary.api.delete_folder(cloudinaryFolder);
      console.log('✅ Folder deleted:', folderResult);
    } catch (folderError: any) {
      console.log('⚠️ Folder deletion failed (may not be empty):', folderError?.message || folderError);
    }
    
    const allDeleted = successCount === folderContents.resources.length;
    console.log(`\n🏁 FINAL RESULT: ${allDeleted ? '✅ ALL FILES DELETED' : '⚠️ SOME FILES REMAIN'}`);
    console.log('🧹 ========== CLOUDINARY DELETION END ==========\n');
    
    return allDeleted;
    
  } catch (error: any) {
    console.error('\n❌ ========== CLOUDINARY DELETION ERROR ==========');
    console.error('Error:', error?.message || error);
    console.error('Stack:', error?.stack);
    console.error('🧹 ========== CLOUDINARY DELETION END ==========\n');
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin authentication
    const adminAuth = await verifyAdminAuth(request);
    if (!adminAuth) {
      // Try to verify regular auth to give better error message
      const { verifyAuthToken } = await import('@/lib/api-auth');
      const authResult = await verifyAuthToken(request);
      return authResult ? forbiddenResponse() : unauthorizedResponse();
    }

    const { orderId, studentId, pageCount, originalFiles, cloudinaryFolder } = await request.json();

    console.log('🔒 Admin deleting order:', { 
      adminId: adminAuth!.userId, 
      adminEmail: adminAuth!.email,
      orderId, 
      studentId, 
      pageCount 
    });

    // Validate input
    if (!orderId || !studentId || typeof pageCount !== 'number' || pageCount < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid input parameters' },
        { status: 400 }
      );
    }

    if (pageCount > 10000) {
      return NextResponse.json(
        { success: false, error: 'Page count exceeds maximum allowed' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // 1. Get current user data for credit restoration
    const userRef = db.collection('users').doc(studentId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify order exists before deletion
    const orderRef = db.collection(`users/${studentId}/orders`).doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const currentCredits = userData?.creditsRemaining || 0;
    const currentTotalOrders = userData?.totalOrders || 0;
    const currentTotalPages = userData?.totalPages || 0;

    // 🔒 SECURITY: Use transaction instead of batch for atomicity
    await db.runTransaction(async (transaction) => {
      // Re-read user doc inside transaction for consistency
      const freshUserDoc = await transaction.get(userRef);
      if (!freshUserDoc.exists) {
        throw new Error('User not found during transaction');
      }

      const freshUserData = freshUserDoc.data()!;
      const freshCredits = freshUserData.creditsRemaining || 0;
      const freshTotalOrders = freshUserData.totalOrders || 0;
      const freshTotalPages = freshUserData.totalPages || 0;

      // Re-verify order exists inside transaction
      const freshOrderDoc = await transaction.get(orderRef);
      if (!freshOrderDoc.exists) {
        throw new Error('Order not found during transaction');
      }

      // Calculate new values
      const newCredits = freshCredits + pageCount;
      const newTotalOrders = Math.max(0, freshTotalOrders - 1);
      const newTotalPages = Math.max(0, freshTotalPages - pageCount);

      // Delete order
      transaction.delete(orderRef);

      // Update user stats
      transaction.update(userRef, {
        creditsRemaining: newCredits,
        totalOrders: newTotalOrders,
        totalPages: newTotalPages,
      });

      // Queue Cloudinary deletion if needed
      if (originalFiles && originalFiles.length > 0 && cloudinaryFolder) {
        const deletionQueueRef = db.collection('cloudinary_deletion_queue').doc();
        transaction.set(deletionQueueRef, {
          orderId,
          studentId,
          cloudinaryFolder,
          originalFiles,
          status: 'pending',
          createdAt: new Date(),
          retryCount: 0,
          deletedBy: adminAuth!.userId,
          deletedAt: new Date(),
        });
      }

      console.log('✅ Transaction prepared:', { newCredits, newTotalOrders, newTotalPages });
    });

    // Create audit log for deletion
    const auditLogRef = db.collection('audit_logs').doc();
    await auditLogRef.set({
      action: 'order_deleted',
      adminId: adminAuth!.userId,
      adminEmail: adminAuth!.email,
      orderId,
      studentId,
      creditsRestored: pageCount,
      timestamp: new Date(),
    });

    console.log('✅ Order deleted successfully by admin:', adminAuth!.userId);

    // Get fresh user data for response
    const updatedUserDoc = await userRef.get();
    const updatedUserData = updatedUserDoc.data()!;

    // 6. 🚀 Try immediate Cloudinary deletion in background (don't block response)
    if (originalFiles && originalFiles.length > 0 && cloudinaryFolder) {
      console.log('🔥 Attempting immediate Cloudinary deletion...');
      
      // Don't await this - let it run in background
      deleteCloudinaryFiles(originalFiles, cloudinaryFolder)
        .catch((error) => {
          console.error('❌ Background Cloudinary deletion failed:', error);
          // Will be processed by cleanup API later
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully. Cloudinary files queued for cleanup.',
      cloudinaryQueued: !!(originalFiles && originalFiles.length > 0 && cloudinaryFolder),
      creditsRestored: pageCount,
      newUserStats: {
        creditsRemaining: updatedUserData.creditsRemaining || 0,
        totalOrders: updatedUserData.totalOrders || 0,
        totalPages: updatedUserData.totalPages || 0,
      }
    });

  } catch (error) {
    console.error('Error in delete order API:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: sanitizeErrorMessage(error)
      },
      { status: 500 }
    );
  }
}