
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
import { collection, query, orderBy, where, limit } from "firebase/firestore";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order, User } from "@/types";
import { safeFormatDistance } from "@/lib/date-utils";


export default function AdminDashboard() {
  const { firestore } = useFirebase();
  const { user: currentUser } = useAuthContext();

  // For now, we'll show a simplified dashboard without orders
  // TODO: Implement proper order aggregation
  const allOrders: Order[] = [];
  const ordersLoading = false;

  // Get all users for stats
  const allUsersQuery = useMemoFirebase(() => {
    if (!currentUser?.isAdmin) return null;
    return query(collection(firestore, 'users'), limit(100));
  }, [firestore, currentUser?.isAdmin]);

  const { data: allUsers, isLoading: usersLoading } = useCollection<User>(allUsersQuery);

  // Calculate real statistics
  const activeOrders: Order[] = [];
  const pendingCount = 0;
  const inProgressCount = 0;
  const completedToday = 0;

  const totalStudents = allUsers?.length || 0;
  const totalOrders = 0; // Will implement order aggregation later
  const totalPages = 0; // Will implement order aggregation later

  const isLoading = usersLoading;

  if (isLoading) {
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
        <div className="grid gap-8 lg:grid-cols-5">
          <Card className="lg:col-span-3 shadow-subtle">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2 shadow-subtle">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
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
      
      <div className="grid gap-8 lg:grid-cols-5">
        <Card className="lg:col-span-3 shadow-subtle">
          <CardHeader>
              <CardTitle>Active Orders</CardTitle>
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
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {activeOrders.map(order => (
                        <TableRow key={order.id}>
                            <TableCell>{order.studentEmail}</TableCell>
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
                            <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                    <Button asChild variant="ghost" size="icon"><Link href="#"><Download className="h-4 w-4"/></Link></Button>
                                    <Button asChild variant="outline" size="sm"><Link href={`/admin/orders/${order.id}`}>View Details</Link></Button>
                                </div>
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
        <Card className="lg:col-span-2 shadow-subtle">
            <CardHeader>
                <CardTitle>System Overview</CardTitle>
                <CardDescription>Key metrics and statistics.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Orders</span>
                  <span className="text-2xl font-bold">{totalOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Pages</span>
                  <span className="text-2xl font-bold">{totalPages}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active Students</span>
                  <span className="text-2xl font-bold">{totalStudents}</span>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  <p>Average pages per order: {totalOrders > 0 ? Math.round(totalPages / totalOrders) : 0}</p>
                  <p>Orders per student: {totalStudents > 0 ? Math.round(totalOrders / totalStudents) : 0}</p>
                </div>
              </div>
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
