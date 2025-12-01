import AppShell from "@/components/layout/AppShell";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";

/**
 * Main App Layout - Simple wrapper
 * Middleware already handles redirects, so no blocking needed here
 */
export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingLayout>
      <AppShell>{children}</AppShell>
    </OnboardingLayout>
  );
}
