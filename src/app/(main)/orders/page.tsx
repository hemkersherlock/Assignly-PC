
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useAuthContext } from "@/context/AuthContext";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, orderBy } from "firebase/firestore";
import { useFirebase, useMemoFirebase } from "@/firebase";
import type { Order } from "@/types";

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
    <Card className="shadow-subtle max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>Order History</CardTitle>
        <CardDescription>A list of all your past and current orders.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Assignment Title</TableHead>
                <TableHead className="text-center w-[12%]">Pages</TableHead>
                <TableHead className="text-center w-[28%]">Status</TableHead>
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
              <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium">
                  <div className="truncate max-w-[300px]" title={order.assignmentTitle}>
                    {order.assignmentTitle}
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold">{order.pageCount}</TableCell>
                <TableCell className="text-center">
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {order.createdAt ? formatDistanceToNow(order.createdAt instanceof Date ? order.createdAt : order.createdAt.toDate(), { addSuffix: true }) : 'Unknown'}
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
  );
}
