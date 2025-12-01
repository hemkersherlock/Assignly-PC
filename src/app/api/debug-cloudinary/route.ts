import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { verifyAdminAuth, forbiddenResponse, unauthorizedResponse, sanitizeErrorMessage } from '@/lib/api-auth';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin authentication - test routes should be protected
    const adminAuth = await verifyAdminAuth(request);
    if (!adminAuth) {
      const { verifyAuthToken } = await import('@/lib/api-auth');
      const authResult = await verifyAuthToken(request);
      return authResult ? forbiddenResponse() : unauthorizedResponse();
    }

    // 🔒 SECURITY: Disable in production unless explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEBUG_ROUTES !== 'true') {
      return NextResponse.json(
        { success: false, error: 'Debug routes are disabled in production' },
        { status: 403 }
      );
    }

    const { publicId } = await request.json();
    
    console.log('=== CLOUDINARY DEBUG ===');
    console.log('Admin:', adminAuth.userId);
    console.log('Testing deletion for public ID:', publicId);
    
    // 🔒 SECURITY: Don't log environment variables
    const hasCloudinaryConfig = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
    console.log('Cloudinary config:', hasCloudinaryConfig ? 'SET' : 'NOT SET');

    // First, check if the file exists
    console.log('1. Checking if file exists...');
    try {
      const resource = await cloudinary.api.resource(publicId);
      console.log('File exists:', resource);
    } catch (error) {
      console.log('File does not exist or error:', error);
    }

    // Try to delete the file
    console.log('2. Attempting to delete file...');
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Deletion result:', result);

    // Check if file still exists
    console.log('3. Checking if file still exists after deletion...');
    try {
      const resource = await cloudinary.api.resource(publicId);
      console.log('File still exists:', resource);
    } catch (error) {
      console.log('File successfully deleted or not found:', error);
    }

    return NextResponse.json({
      success: true,
      publicId,
      deletionResult: result,
      message: 'Debug completed'
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: sanitizeErrorMessage(error)
      },
      { status: 500 }
    );
  }
}

