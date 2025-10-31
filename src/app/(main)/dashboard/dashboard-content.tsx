"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { ArrowRight, FileText } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { useAuthContext } from "@/context/AuthContext";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { useFirebase, useMemoFirebase } from "@/firebase";
import type { Order, AppUser } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardContentProps {
  initialUser: AppUser;
}

export default function DashboardContent({ initialUser }: DashboardContentProps) {
  // Use initial user from server, fallback to AuthContext for real-time updates
  const { user: contextUser } = useAuthContext();
  const appUser = contextUser || initialUser;
  
  const { firestore } = useFirebase();

  const ordersQuery = useMemoFirebase(() => {
    // Only create the query if the user is logged in
    if (!appUser?.id) return null;
    const coll = collection(firestore, "users", appUser.id, "orders");
    return query(coll, orderBy("createdAt", "desc"), limit(3));
  }, [firestore, appUser?.id]);

  // Pass the (potentially null) query to the hook
  const { data: recentOrders, isLoading: ordersLoading } = useCollection<Order>(ordersQuery);

  if (ordersLoading) {
    return (
        <div className="container mx-auto p-0">
            <div className="grid gap-8">
                <Card className="bg-primary text-primary-foreground shadow-subtle">
                    <CardHeader>
                        <CardDescription className="text-primary-foreground/80">Your current credits</CardDescription>
                        <Skeleton className="h-16 w-1/2 bg-primary/50" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-4 w-1/3 bg-primary/50" />
                    </CardContent>
                    <CardFooter>
                         <Button asChild variant="secondary" size="lg" className="font-semibold" disabled>
                            <Link href="/orders/new">Order New Assignment</Link>
                        </Button>
                    </CardFooter>
                </Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">Recent Orders</h2>
                    <Button asChild variant="link" disabled>
                        <Link href="/orders">View all <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </div>
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="w-full p-3 sm:p-0">
      <div className="grid gap-4 sm:gap-6 md:gap-8">
        <Card className="bg-primary text-primary-foreground shadow-subtle border-0 sm:border">
          <CardHeader className="space-y-2">
            <CardDescription className="text-primary-foreground/80 text-xs sm:text-sm">
              Your current credits
            </CardDescription>
            <CardTitle className="text-4xl sm:text-5xl md:text-6xl font-bold transition-all duration-300 ease-in-out">
              {appUser.creditsRemaining} CREDITS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm text-primary-foreground/80">
              Account created on {format(appUser.createdAt, "MMMM d, yyyy")}
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="secondary" size="lg" className="font-semibold w-full sm:w-auto">
              <Link href="/orders/new">Order New Assignment</Link>
            </Button>
          </CardFooter>
        </Card>

        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold">Recent Orders</h2>
            <Button asChild variant="link" size="sm" className="self-start sm:self-auto">
              <Link href="/orders">
                View all <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ordersLoading && (
                 <>
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                 </>
            )}
            {!ordersLoading && recentOrders?.map(order => (
              <Card key={order.id} className="shadow-subtle">
                <CardHeader className="flex flex-col gap-2 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm sm:text-base font-medium line-clamp-2 flex-1">
                      {order.assignmentTitle}
                    </CardTitle>
                    <StatusBadge status={order.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p>Page Count: {order.pageCount}</p>
                    <p>Submitted: {order.createdAt ? format(order.createdAt instanceof Date ? order.createdAt : order.createdAt.toDate(), "PPP") : 'Unknown'}</p>
                  </div>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline" className="w-full">
                        <Link href={`/orders/${order.id}`}>View Details</Link>
                    </Button>
                </CardFooter>
              </Card>
            ))}
             {!ordersLoading && (!recentOrders || recentOrders.length === 0) && (
                <div className="col-span-full text-center py-10">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">You haven't placed any orders yet.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

