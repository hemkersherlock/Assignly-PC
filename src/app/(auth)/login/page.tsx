
"use client";

import { useState } from "react";
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
import Logo from "@/components/shared/Logo";
import { useFirebase } from "@/firebase";
import { Loader2 } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { auth } = useFirebase();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Only allow existing users to log in - NO new account creation
      await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Login successful');
      // On successful login, the AuthContext's onAuthStateChanged will handle redirection.
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

  return (
    <Card className="mx-auto max-w-sm w-full shadow-subtle">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center items-center gap-2 mb-2">
            <Logo className="h-8 w-8" />
            <CardTitle className="text-3xl font-bold">Assignly</CardTitle>
        </div>
        <CardDescription>Enter your email and password to login</CardDescription>
        <p className="text-xs text-muted-foreground mt-2">
          This is a closed service. Only pre-created accounts can access.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 animate-spin" /> : null}
            {isLoading ? "Please wait..." : "Login"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
