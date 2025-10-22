
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Download, Loader, CheckCircle, Users, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, orderBy, where, limit, getDocs } from "firebase/firestore";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order, User } from "@/types";
import { safeFormatDistance } from "@/lib/date-utils";
import { useState, useEffect } from "react";


export default function AdminDashboard() {
  const { firestore } = useFirebase();
  const { user: currentUser } = useAuthContext();

  // Get all orders from all users
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    const fetchAllOrders = async () => {
      if (!currentUser || currentUser.role !== 'admin') {
        console.log('❌ User is not admin, skipping order fetch');
        setOrdersLoading(false);
        return;
      }
      
      try {
        setOrdersLoading(true);
        console.log('🔍 Fetching all orders from Firebase...');
        
        // Get all users
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const orders: Order[] = [];
        
        for (const userDoc of usersSnapshot.docs) {
          const userId = userDoc.id;
          const userData = userDoc.data();
          
          // Get orders for this user
          const ordersSnapshot = await getDocs(
            collection(firestore, `users/${userId}/orders`)
          );
          
          ordersSnapshot.forEach(orderDoc => {
            const orderData = orderDoc.data();
            orders.push({
              id: orderDoc.id,
              studentId: userId,
              studentEmail: orderData.studentEmail || userData.email || 'Unknown',
              studentName: userData.name || 'Unknown Student',
              studentBranch: userData.branch || 'Unknown',
              studentYear: userData.year || 'Unknown',
              assignmentTitle: orderData.assignmentTitle || 'Untitled',
              orderType: orderData.orderType || 'assignment',
              pageCount: orderData.pageCount || 0,
              status: orderData.status || 'pending',
              createdAt: orderData.createdAt?.toDate() || new Date(),
              originalFiles: orderData.originalFiles || [],
              cloudinaryFolder: orderData.cloudinaryFolder || '',
            } as Order);
          });
        }
        
        // Sort by creation date (newest first)
        orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        console.log(`✅ Found ${orders.length} orders from Firebase`);
        setAllOrders(orders);
        
      } catch (error) {
        console.error('❌ Error fetching orders:', error);
        setAllOrders([]); // Set empty array on error
      } finally {
        setOrdersLoading(false);
      }
    };

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (ordersLoading) {
        console.log('⏰ Orders loading timeout, setting to false');
        setOrdersLoading(false);
      }
    }, 10000); // 10 second timeout

    fetchAllOrders();

    return () => clearTimeout(timeoutId);
  }, [firestore, currentUser?.role]);

  // Get all users for stats
  const allUsersQuery = useMemoFirebase(() => {
    if (!currentUser || currentUser.role !== 'admin') return null;
    return query(collection(firestore, 'users'), limit(100));
  }, [firestore, currentUser?.role]);

  const { data: allUsers, isLoading: usersLoading } = useCollection<User>(allUsersQuery);

  // Calculate real statistics from actual data
  const activeOrders = allOrders.filter(o => o.status === 'pending' || o.status === 'writing');
  const pendingCount = allOrders.filter(o => o.status === 'pending').length;
  const inProgressCount = allOrders.filter(o => o.status === 'writing').length;
  const completedToday = allOrders.filter(o => {
    if (o.status !== 'on the way') return false;
    const today = new Date().toDateString();
    const orderDate = o.createdAt.toDateString();
    return orderDate === today;
  }).length;

  const totalStudents = allUsers?.length || 0;
  const totalOrders = allOrders.length;
  const totalPages = allOrders.reduce((sum, order) => sum + order.pageCount, 0);

  const isLoading = usersLoading || ordersLoading;

  console.log('🔍 Admin Dashboard Debug:', {
    usersLoading,
    ordersLoading,
    isLoading,
    allUsers: allUsers?.length,
    allOrders: allOrders.length,
    currentUser: currentUser?.email,
    isAdmin: currentUser?.role === 'admin'
  });

  // Show loading only for a reasonable time, then show data
  if (isLoading && !allUsers && !allOrders.length) {
    return (
      <div className="container mx-auto p-0 grid gap-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="shadow-subtle">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-8">
          <Card className="shadow-subtle">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell>
                        <div>
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-0 grid gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Loader className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">Currently being worked on</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{completedToday}</div>
            <p className="text-xs text-muted-foreground">Finished in the last 24h</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-8">
        <Card className="shadow-subtle">
          <CardHeader>
              <CardTitle>Active Orders ({activeOrders.length})</CardTitle>
              <CardDescription>All orders that are currently pending or in progress.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Pages</TableHead>
                        <TableHead>Time Elapsed</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {activeOrders.map(order => (
                        <TableRow key={order.id}>
                            <TableCell>
                              <div>
                                <div className="font-semibold">{order.studentName || 'Unknown Student'}</div>
                                <div className="text-sm text-muted-foreground">{order.studentBranch} - {order.studentYear}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    order.orderType === 'assignment' 
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                                      : order.orderType === 'practical'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300'
                                  }`}>
                                    {order.orderType || 'Unknown'}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={order.assignmentTitle}>
                                  {order.assignmentTitle || 'Untitled'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{order.pageCount}</TableCell>
                            <TableCell>{safeFormatDistance(order.createdAt, { addSuffix: true })}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                order.status === 'pending' 
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                                  : order.status === 'writing'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                              }`}>
                                {order.status === 'pending' ? '⏳ Pending' : 
                                 order.status === 'writing' ? '✍️ Writing' : '🚀 On the Way'}
                              </span>
                            </TableCell>
                        </TableRow>
                    ))}
                    {activeOrders.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">No active orders.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
