"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import { useFirebase } from "@/firebase";
import type { AppUser } from "@/types";

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  setAppUser: (user: AppUser | null) => void;
  needsOnboarding: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { auth, firestore } = useFirebase();
  // CRITICAL FIX: Start with undefined (not null) so we wait for Firebase auth to respond
  // null = "checked and no user", undefined = "haven't checked yet"
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null | undefined>(undefined);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Check if user needs onboarding (only for completely new users with no profile data)
  const needsOnboarding = appUser ? (
    !appUser.whatsappNo || appUser.whatsappNo === '' ||
    !appUser.section || appUser.section === ''
  ) : false;

  // Debug logging for onboarding
  if (appUser) {
    console.log('🔍 Onboarding check:', {
      whatsappNo: appUser.whatsappNo,
      section: appUser.section,
      needsOnboarding
    });
  }

  useEffect(() => {
    // Fast auth check - just listen to Firebase Auth state
    // Don't sync cookie here (only on login/logout actions)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔐 Auth state changed:', user?.uid || 'null');
      setFirebaseUser(user);
      // Don't sync cookie here - it's slow and causes delays
      // Cookie sync happens only on explicit login/logout
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const manageUser = async () => {
      if (firebaseUser === undefined) {
        setLoading(true);
        return;
      }; 
      
      if (firebaseUser) {
        console.log('✅ User is authenticated:', firebaseUser.email);
        
        // FAST: Set basic user immediately from Firebase Auth (no Firestore calls)
        // This allows pages to render FAST while we fetch full user data in background
        setAppUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || 'unknown@example.com',
          name: firebaseUser.displayName || '',
          role: 'student', // Default, will update when we fetch from Firestore
          creditsRemaining: 40, // Default, will update when we fetch from Firestore
          totalOrders: 0,
          totalPages: 0,
          isActive: true,
          createdAt: new Date(),
          lastOrderAt: null,
          whatsappNo: '',
          section: '',
          year: '1st Year',
          sem: '1st Sem',
          branch: 'CS',
          referralCode: null,
        });
        
        // Mark loading as done IMMEDIATELY (page can render now)
        setLoading(false);
        
        // Fetch full user data in background (non-blocking)
        const userDocRef = doc(firestore, "users", firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const adminRoleRef = doc(firestore, "roles_admin", firebaseUser.uid);
            const adminDoc = await getDoc(adminRoleRef);
            
            const userData = userDoc.data();
            const currentRole = adminDoc.exists() ? "admin" : "student";
            const createdAt = userData.createdAt as Timestamp;

            // Update user with full data (non-blocking)
            setAppUser({
                ...(userData as Omit<AppUser, 'id' | 'role' | 'createdAt' | 'lastOrderAt'>),
                id: firebaseUser.uid,
                email: firebaseUser.email || userData.email || 'unknown@example.com',
                role: currentRole,
                creditsRemaining: Math.max(0, userData.creditsRemaining ?? userData.pageQuota ?? 40),
                totalOrders: userData.totalOrders ?? userData.totalOrdersPlaced ?? 0,
                totalPages: userData.totalPages ?? userData.totalPagesUsed ?? 0,
                createdAt: createdAt?.toDate() || new Date(),
                lastOrderAt: userData.lastOrderAt?.toDate() || null
            });
          }
        } catch (err: any) {
          console.error('Error fetching user data:', err);
          // Don't block - user already set with defaults
        }
      } else {
        console.log('🚪 User logged out');
        setAppUser(null);
        setLoading(false);
      }
    };

    manageUser();
  }, [firebaseUser, firestore, auth]);
  
  useEffect(() => {
    console.log('🔍 Redirect check:', { loading, pathname, appUser: !!appUser, role: appUser?.role });
    
    // CRITICAL: Don't do ANY redirects while auth is still loading
    // This prevents the flash: loading → redirect to /login → redirect back to /dashboard
    if (loading || !pathname) {
      console.log('⏳ Still loading or no pathname, skipping redirect');
      return;
    }

    const isAuthPage = pathname === '/login';

    // Only redirect if auth check is COMPLETE
    if (appUser && isAuthPage) {
      const targetDashboard = appUser.role === 'admin' ? '/admin' : '/dashboard';
      console.log(`✅ User IS logged in but on login page, redirecting to ${targetDashboard}`);
      router.replace(targetDashboard);
    }
    
    if (!appUser && !isAuthPage) {
       console.log(`❌ User NOT logged in and not on login page, redirecting to /login`);
      router.replace('/login');
    }
  }, [appUser, loading, pathname, router]);

  const logout = async () => {
    // Clear Firebase auth
    await signOut(auth);
    
    // Clear auth cookie for server-side middleware
    await fetch('/api/clear-auth-cookie', {
      method: 'POST',
    });
    
    // Clear local state
    setAppUser(null);
    setFirebaseUser(null);
    
    // Redirect to login
    router.replace('/login');
  };

  const value = { user: appUser, firebaseUser, loading, logout, setAppUser, needsOnboarding };
  
  // Show loading spinner while checking auth state
  // This prevents flash of login screen when user is already logged in
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};