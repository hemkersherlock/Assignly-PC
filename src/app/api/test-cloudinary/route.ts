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
        { success: false, error: 'Test routes are disabled in production' },
        { status: 403 }
      );
    }

    const { publicId } = await request.json();
    
    if (!publicId) {
      return NextResponse.json(
        { success: false, error: 'Public ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔒 Admin testing Cloudinary deletion:`, {
      adminId: adminAuth.userId,
      publicId,
    });
    
    // 🔒 SECURITY: Don't log environment variables
    const hasCloudinaryConfig = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
    console.log('Cloudinary config:', hasCloudinaryConfig ? 'SET' : 'NOT SET');

    // Test the deletion
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Deletion result:', result);

    return NextResponse.json({
      success: true,
      result: result,
      message: `File ${publicId} deletion result: ${result.result}`
    });

  } catch (error) {
    console.error('Error testing Cloudinary deletion:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: sanitizeErrorMessage(error)
      },
      { status: 500 }
    );
  }
}

