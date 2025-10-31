import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth-server';
import DashboardContent from './dashboard-content';

/**
 * Dashboard Page - Server Component
 * Server-side auth check BEFORE rendering (eliminates flicker)
 */
export default async function DashboardPage() {
  // Server-side auth check - runs BEFORE page renders
  const user = await getServerUser();
  
  // If no user, redirect to login (server-side redirect - no flash)
  if (!user) {
    redirect('/login');
  }
  
  // User exists - render dashboard
  // Pass user data to client component for real-time updates
  return <DashboardContent initialUser={user} />;
}
