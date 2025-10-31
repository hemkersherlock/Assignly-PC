"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/context/AuthContext';

/**
 * Root Page - Client Component (Fast)
 * Simple redirect based on client auth state
 */
export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuthContext();

  useEffect(() => {
    // Only redirect after auth check completes
    if (loading) return;
    
    if (user) {
      // User is logged in - go to their dashboard
      const targetDashboard = user.role === 'admin' ? '/admin' : '/dashboard';
      router.replace(targetDashboard);
    } else {
      // User is NOT logged in - go to login
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Show minimal loading while checking
  return null;
}
