"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFirebase } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuthContext } from "@/context/AuthContext";

export default function DebugPage() {
  const { firestore } = useFirebase();
  const { user: currentUser } = useAuthContext();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
      console.log('🔍 Debug - All users:', usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="space-y-4">
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Current User:</strong> {currentUser?.email}</p>
            <p><strong>Is Admin:</strong> {currentUser?.isAdmin ? 'Yes' : 'No'}</p>
            <p><strong>Total Users:</strong> {users.length}</p>
          </div>
          <Button onClick={fetchUsers} disabled={loading} className="mt-4">
            {loading ? "Refreshing..." : "Refresh Users"}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>All Users in Database</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground">No users found in database.</p>
          ) : (
            <div className="space-y-2">
              {users.map((user, index) => (
                <div key={user.id} className="p-2 border rounded">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Role:</strong> {user.role}</p>
                  <p><strong>Credits:</strong> {user.creditsRemaining}</p>
                  <p><strong>Active:</strong> {user.isActive ? 'Yes' : 'No'}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
