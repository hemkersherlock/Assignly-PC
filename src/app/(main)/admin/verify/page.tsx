"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFirebase } from "@/firebase";
import { useAuthContext } from "@/context/AuthContext";
import { useCollection } from "@/firebase/firestore/use-collection";
import { useMemoFirebase } from "@/firebase";
import { collection, query, limit, addDoc, serverTimestamp } from "firebase/firestore";
import type { User } from "@/types";

export default function VerifyPage() {
  const { firestore } = useFirebase();
  const { user: currentUser } = useAuthContext();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Test the same query that the students page uses
  const usersQuery = useMemoFirebase(() => {
    if (!currentUser?.isAdmin) return null;
    const q = query(collection(firestore, 'users'), limit(100));
    console.log('🔍 Verify page - Creating users query:', q);
    return q;
  }, [firestore, currentUser?.isAdmin]);

  const { data: allUsers, isLoading, error } = useCollection<User>(usersQuery);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, result]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    addResult("🧪 Starting Admin Panel Verification Tests...");
    
    // Test 1: Check current user
    addResult(`✅ Current User: ${currentUser?.email || 'Not logged in'}`);
    addResult(`✅ Is Admin: ${currentUser?.isAdmin ? 'Yes' : 'No'}`);
    
    if (!currentUser?.isAdmin) {
      addResult("❌ FAIL: User is not an admin!");
      setIsRunning(false);
      return;
    }
    
    // Test 2: Check query creation
    addResult(`✅ Users Query Created: ${usersQuery ? 'Yes' : 'No'}`);
    
    // Test 3: Check loading state
    addResult(`✅ Loading State: ${isLoading ? 'Loading...' : 'Not loading'}`);
    
    // Test 4: Check error state
    if (error) {
      addResult(`❌ ERROR: ${error.message}`);
    } else {
      addResult("✅ No errors in query");
    }
    
    // Test 5: Check data
    if (allUsers) {
      addResult(`✅ Users Data: ${allUsers.length} users found`);
      
      const students = allUsers.filter(user => user.role !== 'admin');
      addResult(`✅ Students: ${students.length} students found`);
      
      if (students.length > 0) {
        addResult("✅ SUCCESS: Students page should work!");
        students.forEach((student, index) => {
          addResult(`  ${index + 1}. ${student.email} (${student.creditsRemaining} credits)`);
        });
      } else {
        addResult("⚠️ WARNING: No students found - this is why the pages are empty");
        addResult("💡 Try creating a test user first");
      }
    } else {
      addResult("❌ No users data received");
    }
    
    addResult("\n🎯 Test Complete!");
    setIsRunning(false);
  };

  const createTestUser = async () => {
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
      addResult(`✅ Test user created: ${testUser.email}`);
      
      // Refresh the query
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (err: any) {
      addResult(`❌ Failed to create test user: ${err.message}`);
    }
  };

  useEffect(() => {
    runTests();
  }, [allUsers, isLoading, error]);

  return (
    <div className="space-y-4">
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Admin Panel Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={runTests} disabled={isRunning}>
                {isRunning ? "Running Tests..." : "Run Tests"}
              </Button>
              <Button onClick={createTestUser} variant="outline">
                Create Test User
              </Button>
            </div>
            
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <pre className="text-sm whitespace-pre-wrap">
                {testResults.join('\n') || "Click 'Run Tests' to start verification"}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Real-time Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
            <p><strong>Error:</strong> {error?.message || 'None'}</p>
            <p><strong>Users Found:</strong> {allUsers?.length || 0}</p>
            <p><strong>Students:</strong> {allUsers?.filter(u => u.role !== 'admin').length || 0}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
