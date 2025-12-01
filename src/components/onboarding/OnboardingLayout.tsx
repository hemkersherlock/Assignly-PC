"use client";

import { useAuthContext } from "@/context/AuthContext";
import OnboardingFlow from "./OnboardingFlow";
import { useEffect } from "react";

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const { user, needsOnboarding, loading, setAppUser } = useAuthContext();

  // If user needs onboarding, show the onboarding flow
  if (!loading && user && needsOnboarding) {
    return (
      <OnboardingFlow 
        user={user} 
        onComplete={(updatedUser) => {
          // Update the user data in context instead of reloading
          console.log('✅ Onboarding completed, updating user context');
          setAppUser(updatedUser);
        }} 
      />
    );
  }

  // Otherwise, show the normal app
  return <>{children}</>;
}
