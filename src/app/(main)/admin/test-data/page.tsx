"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function TestDataPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const createTestUser = async () => {
    setIsCreating(true);
    try {
      const testUser = {
        email: `testuser${Date.now()}@example.com`,
        role: 'student',
        isActive: true,
        creditsRemaining: 40,
        totalOrders: 0,
        totalPages: 0,
        createdAt: serverTimestamp(),
        lastOrderAt: null,
      };

      await addDoc(collection(firestore, 'users'), testUser);
      
      toast({
        title: "Test User Created!",
        description: `Created user: ${testUser.email}`,
      });
    } catch (error: any) {
      console.error('Error creating test user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to create test user: ${error.message}`,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="shadow-subtle">
      <CardHeader>
        <CardTitle>Test Data Creation</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={createTestUser} 
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? "Creating..." : "Create Test User"}
        </Button>
        <p className="text-sm text-muted-foreground mt-4">
          This will create a test user to verify the admin panels are working.
        </p>
      </CardContent>
    </Card>
  );
}
