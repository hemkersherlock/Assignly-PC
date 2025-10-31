"use client";

import { useAuthContext } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardContent from './dashboard-content';

/**
 * Dashboard Page - Client Component (Fast)
 * Middleware handles redirect if no cookie, client handles auth verification
 */
export default function DashboardPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  // REMOVED: Redirect from dashboard page
  // Middleware already handles redirect if no cookie
  // If user doesn't exist after loading, show loading state (don't redirect again)

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="w-full p-3 sm:p-0">
        <div className="grid gap-4 sm:gap-6 md:gap-8">
          <div className="animate-pulse">
            <div className="h-48 bg-muted rounded-lg mb-4" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="h-48 bg-muted rounded-lg" />
              <div className="h-48 bg-muted rounded-lg" />
              <div className="h-48 bg-muted rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no user after loading, show loading state
  // Don't redirect - middleware already checked cookie
  if (!user && !loading) {
    return (
      <div className="w-full p-3 sm:p-0">
        <div className="grid gap-4 sm:gap-6 md:gap-8">
          <div className="animate-pulse">
            <div className="h-48 bg-muted rounded-lg mb-4" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="h-48 bg-muted rounded-lg" />
              <div className="h-48 bg-muted rounded-lg" />
              <div className="h-48 bg-muted rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User exists - render dashboard
  return <DashboardContent initialUser={user} />;
}
