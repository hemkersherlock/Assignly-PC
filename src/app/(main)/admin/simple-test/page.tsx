"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirebase } from "@/firebase";
import { useAuthContext } from "@/context/AuthContext";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

export default function SimpleTestPage() {
  const { firestore } = useFirebase();
  const { user: currentUser } = useAuthContext();
  const [testResult, setTestResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const testFirebaseConnection = async () => {
    setIsLoading(true);
    setTestResult("Testing Firebase connection...\n");
    
    try {
      // Test 1: Check if we can read from users collection
      setTestResult(prev => prev + "✅ Firebase instance created\n");
      
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      setTestResult(prev => prev + `✅ Users collection read: ${usersSnapshot.docs.length} documents\n`);
      
      // Test 2: Check current user
      setTestResult(prev => prev + `✅ Current user: ${currentUser?.email || 'Not logged in'}\n`);
      setTestResult(prev => prev + `✅ Is admin: ${currentUser?.isAdmin ? 'Yes' : 'No'}\n`);
      
      // Test 3: Try to create a test document
      const testDoc = {
        test: true,
        timestamp: serverTimestamp(),
        createdBy: currentUser?.email || 'unknown'
      };
      
      const docRef = await addDoc(collection(firestore, 'test'), testDoc);
      setTestResult(prev => prev + `✅ Test document created: ${docRef.id}\n`);
      
      setTestResult(prev => prev + "\n🎉 ALL TESTS PASSED! Firebase is working correctly.\n");
      
    } catch (error: any) {
      setTestResult(prev => prev + `❌ ERROR: ${error.message}\n`);
      console.error('Firebase test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-subtle">
      <CardHeader>
        <CardTitle>Firebase Connection Test</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={testFirebaseConnection} disabled={isLoading} className="w-full mb-4">
          {isLoading ? "Testing..." : "Test Firebase Connection"}
        </Button>
        
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <pre className="text-sm whitespace-pre-wrap">{testResult || "Click the button to test Firebase connection"}</pre>
        </div>
      </CardContent>
    </Card>
  );
}
