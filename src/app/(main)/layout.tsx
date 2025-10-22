import AppShell from "@/components/layout/AppShell";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";

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
