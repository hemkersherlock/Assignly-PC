"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/context/AuthContext";
import { safeFormat } from "@/lib/date-utils";
import { Edit, Eye } from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import type { User } from "@/types";

export default function AdminStudentsPage() {
  const { firestore } = useFirebase();
  const { user: currentUser } = useAuthContext();

  // Get all users (students)
  const usersQuery = useMemoFirebase(() => {
    if (!currentUser?.isAdmin) return null;
    const q = query(collection(firestore, 'users'), limit(100));
    console.log('🔍 Creating users query:', q);
    return q;
  }, [firestore, currentUser?.isAdmin]);

  const { data: allUsers, isLoading, error } = useCollection<User>(usersQuery);

  // Filter to only show students (non-admin users)
  const students = allUsers?.filter(user => user.role !== 'admin') || [];

  console.log('🔍 Students Page Debug:', {
    currentUser: currentUser?.email,
    isAdmin: currentUser?.isAdmin,
    usersQuery: usersQuery,
    allUsers: allUsers?.length,
    students: students.length,
    isLoading,
    error: error?.message
  });

  if (isLoading) {
    return (
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Student Management</CardTitle>
          <CardDescription>View and manage all student accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Student Management</CardTitle>
          <CardDescription>View and manage all student accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500">Error loading students: {error.message}</p>
            <p className="text-sm text-muted-foreground mt-2">Please try refreshing the page.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-subtle">
      <CardHeader>
        <CardTitle>Student Management</CardTitle>
        <CardDescription>View and manage all student accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Credits</TableHead>
              <TableHead className="text-center">Total Orders</TableHead>
              <TableHead className="text-center">Total Pages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map(student => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.email}</TableCell>
                <TableCell className="text-center font-semibold">{student.creditsRemaining}</TableCell>
                <TableCell className="text-center">{student.totalOrders}</TableCell>
                <TableCell className="text-center">{student.totalPages}</TableCell>
                <TableCell>
                  <Badge className={cn("border-transparent", student.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300")}>
                    {student.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>{safeFormat(student.lastOrderAt, "PPP", "Never")}</TableCell>
                <TableCell className="text-right">
                   <div className="flex gap-2 justify-end">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/orders?student=${student.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Orders
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/credits?student=${student.id}`}>
                          <Edit className="h-4 w-4 mr-1" />
                          Adjust Credits
                        </Link>
                      </Button>
                   </div>
                </TableCell>
              </TableRow>
            ))}
             {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
