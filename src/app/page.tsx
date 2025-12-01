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

  // REMOVED: Client-side redirect from root page
  // Middleware handles root redirect based on cookie

  // Show minimal loading while checking
  return null;
}
