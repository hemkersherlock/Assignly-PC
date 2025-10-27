import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';

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
    console.log('🔑 Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY ? '✅ SET' : '❌ NOT SET',
      api_secret: process.env.CLOUDINARY_API_SECRET ? '✅ SET' : '❌ NOT SET'
    });
    
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
  const db = getFirestore();
  const batch = db.batch();

  try {
    const { orderId, studentId, pageCount, originalFiles, cloudinaryFolder } = await request.json();

    console.log('Starting order deletion process:', { orderId, studentId, pageCount });

    // Validate input
    if (!orderId || !studentId || typeof pageCount !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid input parameters' },
        { status: 400 }
      );
    }

    // 1. Get current user data for credit restoration
    const userRef = db.collection('users').doc(studentId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const currentCredits = userData?.creditsRemaining || 0;
    const currentTotalOrders = userData?.totalOrders || 0;
    const currentTotalPages = userData?.totalPages || 0;

    console.log('Current user stats:', { currentCredits, currentTotalOrders, currentTotalPages });

    // 2. 🔥 Queue Cloudinary deletion for later processing
    let deletionQueueRef: any = null;
    if (originalFiles && originalFiles.length > 0 && cloudinaryFolder) {
      console.log('📋 Queueing Cloudinary files for deletion...');
      
      deletionQueueRef = db.collection('cloudinary_deletion_queue').doc();
      batch.set(deletionQueueRef, {
        orderId,
        studentId,
        cloudinaryFolder,
        originalFiles,
        status: 'pending',
        createdAt: new Date(),
        retryCount: 0,
      });
      
      console.log('✅ Files queued - will be processed by cleanup API');
    } else {
      console.log('No Cloudinary files to delete');
    }

    // 3. Delete the order document
    const orderRef = db.collection(`users/${studentId}/orders`).doc(orderId);
    batch.delete(orderRef);
    console.log('Order document marked for deletion');

    // 4. Restore student credits and update stats
    const newCredits = currentCredits + pageCount;
    const newTotalOrders = Math.max(0, currentTotalOrders - 1);
    const newTotalPages = Math.max(0, currentTotalPages - pageCount);

    batch.update(userRef, {
      creditsRemaining: newCredits,
      totalOrders: newTotalOrders,
      totalPages: newTotalPages,
    });

    console.log('User stats update prepared:', { newCredits, newTotalOrders, newTotalPages });

    // 5. Commit all changes in a transaction
    await batch.commit();
    console.log('Transaction committed successfully');

    // 6. 🚀 NOW try immediate deletion (after queue is created!)
    if (deletionQueueRef && cloudinaryFolder) {
      console.log('🔥 Attempting immediate Cloudinary deletion...');
      
      // Don't await this - let it run in background
      deleteCloudinaryFiles(originalFiles, cloudinaryFolder)
        .then(async (success) => {
          if (success) {
            console.log('✅ IMMEDIATE deletion SUCCESS!');
            await deletionQueueRef.update({ 
              status: 'completed', 
              completedAt: new Date() 
            });
          } else {
            console.log('⚠️ IMMEDIATE deletion PARTIAL - will retry from queue');
          }
        })
        .catch((error) => {
          console.error('❌ IMMEDIATE deletion FAILED:', error);
          console.log('Will be processed by cleanup API later');
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully. Cloudinary files queued for cleanup.',
      cloudinaryQueued: !!(originalFiles && originalFiles.length > 0 && cloudinaryFolder),
      creditsRestored: pageCount,
      newUserStats: {
        creditsRemaining: newCredits,
        totalOrders: newTotalOrders,
        totalPages: newTotalPages,
      }
    });

  } catch (error) {
    console.error('Error in delete order API:', error);
    
    // If batch was started, try to rollback (though Firestore doesn't support rollback)
    // The transaction will automatically fail if any operation fails
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete order' 
      },
      { status: 500 }
    );
  }
}