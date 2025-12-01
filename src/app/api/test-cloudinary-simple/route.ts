import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth, forbiddenResponse, unauthorizedResponse, sanitizeErrorMessage } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
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

    console.log('🔒 Admin testing Cloudinary config:', {
      adminId: adminAuth.userId,
    });
    
    // 🔒 SECURITY: Don't expose environment variables in response
    const hasCloudinaryConfig = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
    
    return NextResponse.json({
      success: true,
      config_available: hasCloudinaryConfig,
      // Don't expose actual values
      cloud_name_set: !!process.env.CLOUDINARY_CLOUD_NAME,
      api_key_set: !!process.env.CLOUDINARY_API_KEY,
      api_secret_set: !!process.env.CLOUDINARY_API_SECRET
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: sanitizeErrorMessage(error) 
    }, { status: 500 });
  }
}

