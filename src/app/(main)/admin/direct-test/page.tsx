"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFirebase } from "@/firebase";
import { useAuthContext } from "@/context/AuthContext";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

export default function DirectTestPage() {
  const { firestore } = useFirebase();
  const { user: currentUser } = useAuthContext();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsersDirectly = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Starting direct Firebase query...');
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      console.log('🔍 Query completed, docs:', usersSnapshot.docs.length);
      
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('🔍 Users data:', usersData);
      setUsers(usersData);
      
    } catch (err: any) {
      console.error('❌ Direct query error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
      console.log('✅ Test user created');
      fetchUsersDirectly(); // Refresh the list
      
    } catch (err: any) {
      console.error('❌ Create user error:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchUsersDirectly();
  }, []);

  return (
    <div className="space-y-4">
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Direct Firebase Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={fetchUsersDirectly} disabled={loading}>
                {loading ? "Loading..." : "Refresh Users"}
              </Button>
              <Button onClick={createTestUser} variant="outline">
                Create Test User
              </Button>
            </div>
            
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded">
                Error: {error}
              </div>
            )}
            
            <div>
              <p><strong>Current User:</strong> {currentUser?.email}</p>
              <p><strong>Is Admin:</strong> {currentUser?.isAdmin ? 'Yes' : 'No'}</p>
              <p><strong>Total Users Found:</strong> {users.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Users List</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground">No users found. Try creating a test user.</p>
          ) : (
            <div className="space-y-2">
              {users.map((user, index) => (
                <div key={user.id} className="p-3 border rounded-lg">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Role:</strong> {user.role}</p>
                  <p><strong>Credits:</strong> {user.creditsRemaining}</p>
                  <p><strong>Active:</strong> {user.isActive ? 'Yes' : 'No'}</p>
                  <p><strong>ID:</strong> {user.id}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
