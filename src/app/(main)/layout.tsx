"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import AppShell from "@/components/layout/AppShell";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  // HARD BLOCK: Don't render ANYTHING until auth check is done
  // This prevents ANY flash of pages before redirect
  useEffect(() => {
    if (!loading && !user) {
      // Auth check complete, no user → redirect to login
      router.replace('/login');
    }
  }, [loading, user, router]);

  // Show loading spinner while checking auth
  // This prevents flash of dashboard/pages before auth is verified
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user after loading, don't render anything (redirect will happen)
  if (!user) {
    return null;
  }

  // Only render app if user is confirmed logged in
  return (
    <OnboardingLayout>
      <AppShell>{children}</AppShell>
    </OnboardingLayout>
  );
}
