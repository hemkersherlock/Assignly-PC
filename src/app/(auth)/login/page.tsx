
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirebase } from "@/firebase";
import { useAuthContext } from "@/context/AuthContext";
import { Loader2, Mail, Lock, Gift } from "lucide-react";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, updateDoc, increment, collection, getDocs } from "firebase/firestore";


function LoginPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCredits, setReferralCredits] = useState<number>(0);
  
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check if user is already logged in to prevent flash of login form
  const { loading: authLoading, user: currentUser } = useAuthContext();

  // Track referral click on page load
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      console.log('🔗 Referral code detected:', ref);
      setReferralCode(ref);
      
      // Store in localStorage for signup
      localStorage.setItem('referralCode', ref);
      
      // Track click
      trackReferralClick(ref);
    }
  }, [searchParams]);

  // Track click on referral link
  const trackReferralClick = async (code: string) => {
    try {
      // Find referral link by code
      const linksRef = collection(firestore, 'referral_links');
      const linksSnapshot = await getDocs(linksRef);
      
      const linkDoc = linksSnapshot.docs.find(doc => doc.data().code === code);
      
      if (linkDoc && linkDoc.data().active) {
        // Increment click count
        await updateDoc(doc(firestore, 'referral_links', linkDoc.id), {
          clicks: increment(1)
        });
        
        setReferralCredits(linkDoc.data().credits);
        
        toast({
          title: `🎁 Special offer!`,
          description: `Sign up now and get ${linkDoc.data().credits} FREE credits!`,
        });
        
        console.log('✅ Referral click tracked');
      }
    } catch (error) {
      console.error('Error tracking referral click:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 🔒 SET PERSISTENT LOGIN - User stays logged in FOREVER until they click logout
      await setPersistence(auth, browserLocalPersistence);
      console.log('✅ Auth persistence set to LOCAL (stays logged in forever)');
      
      // Only allow existing users to log in - NO new account creation
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Login successful - User will stay logged in across sessions');
      
      // Get Firebase ID token
      const idToken = await userCredential.user.getIdToken();
      
      // Set auth cookie for server-side middleware
      // This allows middleware to check auth BEFORE page renders (eliminates flicker)
      const response = await fetch('/api/set-auth-cookie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to set auth cookie');
      }
      
      console.log('✅ Auth cookie set - server-side auth will work now');
      
      // Wait for Firebase auth state to be ready (small delay to ensure persistence)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use router.push instead of window.location to avoid full reload loop
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
      router.push(redirectTo);
      
    } catch (err: any) {
        console.error('❌ Login failed:', err);
        
        // Handle specific error cases
        if (err.code === 'auth/user-not-found') {
            setError("Account not found. This is a closed service - only pre-created accounts can access.");
        } else if (err.code === 'auth/wrong-password') {
            setError("Incorrect password. Please check your credentials.");
        } else if (err.code === 'auth/invalid-email') {
            setError("Invalid email address format.");
        } else if (err.code === 'auth/too-many-requests') {
            setError("Too many failed attempts. Please try again later.");
        } else {
            const message = err.message?.replace('Firebase: ','') || "Login failed. Please try again.";
            setError(message);
        }
        
        setIsLoading(false);
    }
    
    // Add a timeout to reset loading state if redirect doesn't happen
    setTimeout(() => {
      if (isLoading) {
        console.log('⏰ Login timeout - resetting loading state');
        setIsLoading(false);
      }
    }, 8000); // 8 second timeout
  };

  // Show loading spinner while checking auth state
  // This prevents flash of login form when user is already logged in
  if (authLoading) {
    return (
      <div className="w-full max-w-md">
        <Card className="border-2 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Checking login status...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Login Card */}
      <Card className="border-2 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
        <CardHeader className="space-y-2 pb-4">
          <CardTitle className="text-xl sm:text-2xl font-semibold text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center text-xs sm:text-sm">
            Sign in to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          {/* Referral Offer Banner */}
          {referralCredits > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-green-800 dark:text-green-200">
                    🎉 Special Offer!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Get <span className="font-bold">{referralCredits} FREE credits</span> when you sign up!
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Login Button */}
            <Button 
              type="submit" 
              className="w-full h-11 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            {/* Info Message */}
            <div className="pt-2 text-center">
              <p className="text-xs text-muted-foreground">
                🔒 Closed service • Only authorized accounts
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground mt-6">
        Need help? Contact your administrator
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md">
        <Card className="border-2 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
          <CardContent className="p-8 text-center">
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
