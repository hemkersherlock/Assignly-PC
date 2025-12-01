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

  // Show loading while AuthContext is loading user data
  // Middleware already verified cookie, so user should exist
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

  // If no user after loading completes, still show loading (user is loading from Firestore)
  // Don't redirect - middleware already checked cookie, user should exist
  if (!user) {
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
