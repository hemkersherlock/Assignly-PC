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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Check if user needs onboarding (only for completely new users with no profile data)
  const needsOnboarding = appUser ? (
    !appUser.name || appUser.name === '' ||
    !appUser.whatsappNo || appUser.whatsappNo === '' ||
    !appUser.section || appUser.section === ''
  ) : false;

  // Debug logging for onboarding
  if (appUser) {
    console.log('🔍 Onboarding check:', {
      name: appUser.name,
      whatsappNo: appUser.whatsappNo,
      section: appUser.section,
      needsOnboarding
    });
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔐 Auth state changed:', user?.uid || 'null');
      setFirebaseUser(user);
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
        
        const userDocRef = doc(firestore, "users", firebaseUser.uid);
        
        try {
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            console.log('✅ User document found');
            const adminRoleRef = doc(firestore, "roles_admin", firebaseUser.uid);
            const [userData, adminDoc] = await Promise.all([
                userDoc.data(),
                getDoc(adminRoleRef)
            ]);

            const currentRole = adminDoc.exists() ? "admin" : "student";
            const createdAt = userData.createdAt as Timestamp;

            // Quick migration (non-blocking)
            if (userData.pageQuota !== undefined && userData.creditsRemaining === undefined) {
              updateDoc(userDocRef, {
                creditsRemaining: userData.pageQuota
              }).catch(console.error);
            }

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

          } else {
            console.log('⚠️ User document does NOT exist. Creating new profile...');
            const newUser = {
                email: firebaseUser.email || 'unknown@example.com',
                role: 'student',
                isActive: true,
                creditsRemaining: 40,
                totalOrders: 0,
                totalPages: 0,
                createdAt: serverTimestamp(),
                lastOrderAt: null,
                // New profile fields with default values
                name: '',
                whatsappNo: '',
                section: '',
                year: '1st Year' as const,
                sem: '1st Sem' as const,
                branch: 'CS' as const,
            };

            // Create user document
            await setDoc(userDocRef, newUser);
            console.log('✅ User document created successfully!');

            // Set user data immediately
            const appUserData = {
              ...newUser,
              id: firebaseUser.uid,
              email: firebaseUser.email || 'unknown@example.com',
              createdAt: new Date(),
              lastOrderAt: null
            };
            setAppUser(appUserData);
          }
        } catch (err: any) {
            console.error('❌ ERROR in AuthContext:', err);
            setError(err.message || 'An unexpected error occurred during login.');
            // Don't automatically log out on error - let the user try again
            // await signOut(auth);
        }
      } else {
        console.log('🚪 User logged out');
        setAppUser(null);
      }
      setLoading(false);
    };

    manageUser();
  }, [firebaseUser, firestore, auth]);
  
  useEffect(() => {
    if (loading || !pathname) {
      return;
    }

    const isAuthPage = pathname === '/login';

    if (appUser && isAuthPage) {
      const targetDashboard = appUser.role === 'admin' ? '/admin' : '/dashboard';
      console.log(`User is on auth page, redirecting to ${targetDashboard}`);
      router.push(targetDashboard);
    }
    
    if (!appUser && !isAuthPage) {
       console.log(`User is not authenticated and not on auth page, redirecting to /login`);
      router.push('/login');
    }
  }, [appUser, loading, pathname, router]);

  const logout = async () => {
    await signOut(auth);
    setAppUser(null);
    setFirebaseUser(null);
    router.push('/login');
  };

  const value = { user: appUser, firebaseUser, loading, logout, setAppUser, needsOnboarding };
  
  if (loading && pathname !== '/login') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};