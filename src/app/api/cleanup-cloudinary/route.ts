import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';
import { sanitizeErrorMessage } from '@/lib/api-auth';

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

// Helper function to delete Cloudinary files
async function deleteCloudinaryFolder(cloudinaryFolder: string): Promise<boolean> {
  try {
    console.log('\n🧹 ========== CLEANUP API: CLOUDINARY DELETION START ==========');
    console.log('📂 Folder:', cloudinaryFolder);
    // 🔒 SECURITY: Don't log environment variables
    const hasCloudinaryConfig = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
    console.log('🔑 Config:', hasCloudinaryConfig ? '✅ SET' : '❌ NOT SET');
    
    // 🔧 FIX: Check for OLD duplicated paths (bug fix for legacy uploads)
    let folderContents = await cloudinary.api.resources({
      type: 'upload',
      prefix: cloudinaryFolder,
      max_results: 500,
    });
    
    let resourceCount = folderContents.resources?.length || 0;
    
    // If not found, try with duplicated path (for old buggy uploads)
    if (resourceCount === 0) {
      const duplicatedPath = `${cloudinaryFolder}/${cloudinaryFolder}`;
      console.log(`⚠️ No files found, trying duplicated path: ${duplicatedPath}`);
      
      folderContents = await cloudinary.api.resources({
        type: 'upload',
        prefix: duplicatedPath,
        max_results: 500,
      });
      
      resourceCount = folderContents.resources?.length || 0;
      if (resourceCount > 0) {
        console.log(`✅ Found files in duplicated path! (old upload bug)`);
      }
    }
    
    if (resourceCount === 0) {
      console.log('✅ Folder is already empty - nothing to delete');
      console.log('🧹 ========== CLEANUP API: DELETION END ==========\n');
      return true;
    }
    
    console.log(`📋 Found ${resourceCount} files to delete`);
    console.log('🗑️ Starting deletion process...');
    
    const deletePromises = folderContents.resources.map(async (resource: any) => {
      try {
        const result = await cloudinary.uploader.destroy(resource.public_id);
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
      console.log('\n📁 Attempting to delete folder...');
      await cloudinary.api.delete_folder(cloudinaryFolder);
      console.log('✅ Folder deleted');
    } catch (error: any) {
      console.log('⚠️ Folder deletion skipped:', error?.message || 'may not be empty');
    }
    
    const allDeleted = successCount === folderContents.resources.length;
    console.log(`\n🏁 RESULT: ${allDeleted ? '✅ ALL FILES DELETED' : '⚠️ SOME FILES REMAIN'}`);
    console.log('🧹 ========== CLEANUP API: DELETION END ==========\n');
    
    return allDeleted;
  } catch (error: any) {
    console.error('\n❌ ========== CLEANUP API: ERROR ==========');
    console.error('Error:', error?.message || error);
    console.error('Stack:', error?.stack);
    console.error('🧹 ========== CLEANUP API: DELETION END ==========\n');
    return false;
  }
}

export async function POST(request: NextRequest) {
  const db = getFirestore();

  try {
    // Optional: Add admin authentication check here
    // const authHeader = request.headers.get('authorization');
    // ... verify admin token ...

    // Get all pending deletions from queue
    const queueSnapshot = await db
      .collection('cloudinary_deletion_queue')
      .where('status', '==', 'pending')
      .where('retryCount', '<', 3) // Max 3 retries
      .limit(10) // Process 10 at a time
      .get();

    if (queueSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No pending deletions',
        processed: 0,
      });
    }

    console.log(`📋 Found ${queueSnapshot.size} pending deletions`);

    const results = [];

    for (const doc of queueSnapshot.docs) {
      const data = doc.data();
      const { cloudinaryFolder, orderId, retryCount } = data;

      console.log(`\n🧹 Processing deletion for order: ${orderId}`);

      try {
        const success = await deleteCloudinaryFolder(cloudinaryFolder);

        if (success) {
          // Mark as completed
          await doc.ref.update({
            status: 'completed',
            completedAt: new Date(),
          });
          results.push({ orderId, status: 'completed' });
          console.log(`✅ Completed deletion for order: ${orderId}`);
        } else {
          // Increment retry count
          await doc.ref.update({
            retryCount: retryCount + 1,
            lastAttempt: new Date(),
          });
          results.push({ orderId, status: 'retry', retryCount: retryCount + 1 });
          console.log(`⚠️ Partial failure for order: ${orderId}, will retry`);
        }
      } catch (error) {
        console.error(`❌ Error processing order ${orderId}:`, error);
        
        // Increment retry count
        await doc.ref.update({
          retryCount: retryCount + 1,
          lastAttempt: new Date(),
          lastError: error instanceof Error ? error.message : 'Unknown error',
        });
        results.push({ orderId, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} deletions`,
      processed: results.length,
      results,
    });

  } catch (error) {
    console.error('Error in cleanup API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: sanitizeErrorMessage(error)
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check queue status
export async function GET(request: NextRequest) {
  const db = getFirestore();

  try {
    const pendingSnapshot = await db
      .collection('cloudinary_deletion_queue')
      .where('status', '==', 'pending')
      .get();

    const completedSnapshot = await db
      .collection('cloudinary_deletion_queue')
      .where('status', '==', 'completed')
      .get();

    return NextResponse.json({
      success: true,
      pending: pendingSnapshot.size,
      completed: completedSnapshot.size,
      total: pendingSnapshot.size + completedSnapshot.size,
    });

  } catch (error) {
    console.error('Error checking queue status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: sanitizeErrorMessage(error)
      },
      { status: 500 }
    );
  }
}

