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
    // 🔒 SECURITY: Verify admin authentication
    const adminAuth = await verifyAdminAuth(request);
    if (!adminAuth) {
      const { verifyAuthToken } = await import('@/lib/api-auth');
      const authResult = await verifyAuthToken(request);
      return authResult ? forbiddenResponse() : unauthorizedResponse();
    }

    // 🔒 SECURITY: Disable in production
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEBUG_ROUTES !== 'true') {
      return NextResponse.json(
        { success: false, error: 'Test routes are disabled in production' },
        { status: 403 }
      );
    }

    const { publicId } = await request.json();
    
    console.log('🔒 Admin simple delete test:', {
      adminId: adminAuth.userId,
      publicId,
    });
    
    // Try to delete with a simple approach
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Delete result:', result);
    
    return NextResponse.json({
      success: true,
      publicId: publicId,
      result: result
    });

  } catch (error) {
    console.error('Simple delete error:', error);
    return NextResponse.json(
      { success: false, error: sanitizeErrorMessage(error) },
      { status: 500 }
    );
  }
}

