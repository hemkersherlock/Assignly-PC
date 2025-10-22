
"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { Download, Save, Clock, Hash, Calendar, CheckCircle, FileText, ArrowLeft } from "lucide-react";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/context/AuthContext";
import { useDoc } from "@/firebase/firestore/use-doc";
import { doc } from "firebase/firestore";
import type { Order } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

function StudentOrderDetailSkeleton() {
  return (
    <Card className="max-w-3xl mx-auto shadow-subtle">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex items-start gap-4">
            <FileText className="h-5 w-5 text-muted-foreground mt-1" />
            <div>
              <p className="text-sm text-muted-foreground">Filename(s)</p>
              <Skeleton className="h-5 w-48 mt-1" />
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Hash className="h-5 w-5 text-muted-foreground mt-1" />
            <div>
              <p className="text-sm text-muted-foreground">Page Count</p>
              <Skeleton className="h-5 w-16 mt-1" />
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Calendar className="h-5 w-5 text-muted-foreground mt-1" />
            <div>
              <p className="text-sm text-muted-foreground">Submitted</p>
              <Skeleton className="h-5 w-32 mt-1" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


export default function StudentOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user: appUser } = useAuthContext();
  const { firestore } = useFirebase();
  
  // Unwrap the params Promise
  const { id } = use(params);

  const orderRef = useMemoFirebase(() => {
    if (!appUser?.id) return null;
    return doc(firestore, "users", appUser.id, "orders", id);
  }, [firestore, appUser?.id, id]);

  const { data: order, isLoading } = useDoc<Order>(orderRef);


  if (isLoading) {
    return <StudentOrderDetailSkeleton />;
  }

  if (!order && !isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <Card className="shadow-subtle">
          <CardHeader>
            <CardTitle>Order Not Found</CardTitle>
            <CardDescription>The requested order could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="mt-4">
              <Link href="/orders">Back to Orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!order) {
      return <StudentOrderDetailSkeleton />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Button asChild variant="outline" className="mb-4">
        <Link href="/orders">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Link>
      </Button>
      
      <Card className="shadow-subtle">
        <CardHeader>
          <div className="flex justify-between items-start">
              <div>
                  <CardTitle>{order.assignmentTitle}</CardTitle>
                  <CardDescription>Summary of your order: <span className="font-mono text-xs">{order.id}</span></CardDescription>
              </div>
              <StatusBadge status={order.status} />
          </div>
        </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-start gap-4">
                <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                    <p className="text-sm text-muted-foreground">Uploaded Files</p>
                    <div className="font-semibold flex flex-col gap-1">
                        {order.originalFiles && order.originalFiles.length > 0 ? (
                            order.originalFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{file.name}</span>
                                </div>
                            ))
                        ) : (
                            <span className="text-muted-foreground">No files uploaded</span>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-start gap-4">
                <Hash className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                    <p className="text-sm text-muted-foreground">Page Count</p>
                    <p className="font-semibold">{order.pageCount}</p>
                </div>
            </div>
            <div className="flex items-start gap-4">
                <Calendar className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                    <p className="text-sm text-muted-foreground">Submitted</p>
                    <p className="font-semibold">{order.createdAt ? format(order.createdAt instanceof Date ? order.createdAt : order.createdAt.toDate(), "PPP p") : 'Unknown'}</p>
                </div>
            </div>
            {order.status !== 'pending' && order.startedAt && (
                <div className="flex items-start gap-4">
                    <Clock className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                        <p className="text-sm text-muted-foreground">Processing Started</p>
                        <p className="font-semibold">{order.startedAt ? format(order.startedAt instanceof Date ? order.startedAt : order.startedAt.toDate(), "PPP p") : 'Unknown'}</p>
                    </div>
                </div>
            )}
            {order.status === 'completed' && order.completedAt && (
                <>
                <div className="flex items-start gap-4">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                    <div>
                        <p className="text-sm text-muted-foreground">Completed</p>
                        <p className="font-semibold">{order.completedAt ? format(order.completedAt instanceof Date ? order.completedAt : order.completedAt.toDate(), "PPP p") : 'Unknown'}</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <Clock className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                        <p className="text-sm text-muted-foreground">Turnaround Time</p>
                        <p className="font-semibold">~{order.turnaroundTimeHours} hours</p>
                    </div>
                </div>
                </>
            )}
        </div>
        
        {order.originalFiles && order.originalFiles.length > 0 && (
          <div className="border-t pt-6">
            <div className="flex items-start gap-4">
              <Download className="h-5 w-5 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm text-muted-foreground mb-3">Download Files</p>
                <div className="space-y-2">
                  {order.originalFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-4 w-4" />
                          {file.name}
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {order.status === 'completed' && (
          <div className="border-t pt-6 flex flex-col md:flex-row gap-4">
            <Button className="w-full md:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Download Completed File
            </Button>
            <Button variant="secondary" className="w-full md:w-auto">
              <Save className="mr-2 h-4 w-4" />
              Save to Google Drive
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
