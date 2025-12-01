"use client";

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { format, formatDistanceToNow } from "date-fns";
import { Download, Edit, Eye } from "lucide-react";
import Link from 'next/link';

interface RealOrder {
  id: string;
  studentId: string;
  studentEmail: string;
  assignmentTitle: string;
  orderType: string;
  pageCount: number;
  status: string;
  createdAt: any;
  originalFiles: { name: string; url: string }[];
  cloudinaryFolder: string;
}

export default function RealOrdersPage() {
  const [orders, setOrders] = useState<RealOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { firestore } = useFirebase();

  useEffect(() => {
    const fetchAllOrders = async () => {
      try {
        console.log('[Admin] Fetching all orders from Firestore...');
        
        // Get all users
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const allOrders: RealOrder[] = [];
        
        for (const userDoc of usersSnapshot.docs) {
          const userId = userDoc.id;
          console.log(`[Admin] Checking orders for user: ${userId}`);
          
          // Get orders for this user
          const ordersSnapshot = await getDocs(
            collection(firestore, `users/${userId}/orders`)
          );
          
          ordersSnapshot.forEach(orderDoc => {
            const orderData = orderDoc.data();
            allOrders.push({
              id: orderDoc.id,
              studentId: userId,
              studentEmail: orderData.studentEmail || 'Unknown',
              assignmentTitle: orderData.assignmentTitle || 'Untitled',
              orderType: orderData.orderType || 'assignment',
              pageCount: orderData.pageCount || 0,
              status: orderData.status || 'pending',
              createdAt: orderData.createdAt,
              originalFiles: orderData.originalFiles || [],
              cloudinaryFolder: orderData.cloudinaryFolder || '',
            });
          });
        }
        
        // Sort by creation date (newest first)
        allOrders.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return b.createdAt.toDate() - a.createdAt.toDate();
          }
          return 0;
        });
        
        console.log(`[Admin] Found ${allOrders.length} orders`);
        setOrders(allOrders);
        
      } catch (error) {
        console.error('[Admin] Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllOrders();
  }, [firestore]);

  if (loading) {
    return (
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>Loading orders from database...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-subtle">
      <CardHeader>
        <CardTitle>All Orders ({orders.length})</CardTitle>
        <CardDescription>Real orders from your Firestore database</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Pages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Files</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map(order => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">{order.id}</TableCell>
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
                <TableCell className="text-center">{order.pageCount}</TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell>
                  {order.createdAt 
                    ? formatDistanceToNow(order.createdAt instanceof Date ? order.createdAt : order.createdAt.toDate(), { addSuffix: true })
                    : 'Unknown'
                  }
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {order.originalFiles.map((file, index) => (
                      <Button
                        key={index}
                        asChild
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-1 h-3 w-3" />
                          {file.name.length > 10 ? file.name.substring(0, 10) + '...' : file.name}
                        </a>
                      </Button>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/orders/${order.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No orders found in the database.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
