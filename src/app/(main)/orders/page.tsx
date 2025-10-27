
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useAuthContext } from "@/context/AuthContext";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, orderBy } from "firebase/firestore";
import { useFirebase, useMemoFirebase } from "@/firebase";
import type { Order } from "@/types";
import Link from "next/link";
import { FileText, Calendar, Hash } from "lucide-react";

export default function OrderHistoryPage() {
  const { user: appUser } = useAuthContext();
  const { firestore } = useFirebase();

  const ordersQuery = useMemoFirebase(() => {
    if (!appUser?.id) return null;
    const coll = collection(firestore, "users", appUser.id, "orders");
    return query(coll, orderBy("createdAt", "desc"));
  }, [firestore, appUser?.id]);

  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

  return (
    <div className="w-full p-3 sm:p-0 space-y-4">
      <Card className="shadow-subtle border-0 sm:border">
      <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Order History</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            A list of all your past and current orders.
          </CardDescription>
      </CardHeader>
      <CardContent>
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3">
            {isLoading && (
              <>
                {[...Array(3)].map((_, i) => (
                  <Card key={`skeleton-${i}`} className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-6 w-24" />
                  </Card>
                ))}
              </>
            )}
            {!isLoading && orders?.map(order => (
              <Card key={order.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm line-clamp-2 flex-1">
                      {order.assignmentTitle}
                    </h3>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      <span>{order.pageCount} pages</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {order.createdAt 
                          ? formatDistanceToNow(
                              order.createdAt instanceof Date 
                                ? order.createdAt 
                                : order.createdAt.toDate(), 
                              { addSuffix: true }
                            ) 
                          : 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/orders/${order.id}`}>View Details</Link>
                  </Button>
                </div>
              </Card>
            ))}
            {!isLoading && (!orders || orders.length === 0) && (
              <div className="text-center py-10">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No orders found.</p>
              </div>
            )}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                  <TableHead className="w-[40%]">Assignment Title</TableHead>
                <TableHead className="text-center w-[12%]">Pages</TableHead>
                  <TableHead className="text-center w-[23%]">Status</TableHead>
                <TableHead className="text-center w-[25%]">Submitted</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {isLoading && (
              <>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-4 w-8 mx-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-6 w-32 mx-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-4 w-28 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}
            {!isLoading && orders?.map(order => (
                  <TableRow key={order.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                <TableCell className="font-medium">
                  <div className="truncate max-w-[300px]" title={order.assignmentTitle}>
                    {order.assignmentTitle}
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold">{order.pageCount}</TableCell>
                <TableCell className="text-center">
                  <StatusBadge status={order.status} />
                </TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm">
                      {order.createdAt 
                        ? formatDistanceToNow(
                            order.createdAt instanceof Date 
                              ? order.createdAt 
                              : order.createdAt.toDate(), 
                            { addSuffix: true }
                          ) 
                        : 'Unknown'}
                </TableCell>
              </TableRow>
            ))}
             {!isLoading && (!orders || orders.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
