import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth-server';

/**
 * Root Page - Server Component
 * Server-side redirect based on auth (eliminates flicker)
 */
export default async function RootPage() {
  // Server-side auth check - runs BEFORE page renders
  const user = await getServerUser();
  
  // Redirect based on auth status (server-side redirect - no flash)
  if (user) {
    // User is logged in - go to their dashboard
    const targetDashboard = user.role === 'admin' ? '/admin' : '/dashboard';
    redirect(targetDashboard);
  } else {
    // User is NOT logged in - go to login
    redirect('/login');
  }
}
