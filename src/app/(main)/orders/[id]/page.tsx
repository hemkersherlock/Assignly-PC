
"use client";

import { use, useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { Save, Clock, Hash, Calendar, CheckCircle, FileText, ArrowLeft, Download } from "lucide-react";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/context/AuthContext";
import { useDoc } from "@/firebase/firestore/use-doc";
import { doc } from "firebase/firestore";
import type { Order } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Helper function to truncate file names intelligently
function truncateFileName(fileName: string, maxLength: number = 30): string {
  if (fileName.length <= maxLength) return fileName;
  
  const ext = fileName.substring(fileName.lastIndexOf('.'));
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const maxNameLength = maxLength - ext.length - 3; // -3 for "..."
  
  if (nameWithoutExt.length <= maxNameLength) return fileName;
  
  return `${nameWithoutExt.substring(0, maxNameLength)}...${ext}`;
}

function StudentOrderDetailSkeleton() {
  return (
    <Card className="max-w-3xl mx-auto shadow-subtle border-0 sm:border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
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
            <FileText className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Filename(s)</p>
              <Skeleton className="h-5 w-48 mt-1" />
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Hash className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Page Count</p>
              <Skeleton className="h-5 w-16 mt-1" />
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Calendar className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
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
  const [isMobile, setIsMobile] = useState(false);
  
  // Unwrap the params Promise
  const { id } = use(params);

  const orderRef = useMemoFirebase(() => {
    if (!appUser?.id) return null;
    return doc(firestore, "users", appUser.id, "orders", id);
  }, [firestore, appUser?.id, id]);

  const { data: order, isLoading } = useDoc<Order>(orderRef);

  // Check if mobile on client side
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


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
    <div className="w-full p-3 sm:p-0 max-w-4xl space-y-3 sm:space-y-4">
      <Button asChild variant="outline" size="sm" className="mb-2 sm:mb-4">
        <Link href="/orders">
          <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm">Back to Orders</span>
        </Link>
      </Button>
      
      <Card className="shadow-subtle border-0 sm:border">
        <CardHeader className="pb-2 sm:pb-3">
          <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg sm:text-xl line-clamp-2 mb-1">{order.assignmentTitle}</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {order.id}
                  </CardDescription>
              </div>
              <div className="shrink-0">
                <StatusBadge status={order.status} />
              </div>
          </div>
        </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 pt-0">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="flex items-center gap-2.5">
                <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Pages</p>
                    <p className="font-medium text-sm">{order.pageCount}</p>
                </div>
            </div>
            <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="font-medium text-sm">{order.createdAt ? format(order.createdAt instanceof Date ? order.createdAt : order.createdAt.toDate(), "MMM d, yyyy") : 'Unknown'}</p>
                </div>
            </div>
            {order.originalFiles && order.originalFiles.length > 0 && (
                <div className="flex items-start gap-2.5 sm:col-span-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">File</p>
                        <TooltipProvider>
                            {order.originalFiles.map((file, idx) => {
                                const truncatedName = truncateFileName(file.name, isMobile ? 25 : 40);
                                const isTruncated = file.name !== truncatedName;
                                const FileDisplay = (
                                    <span className="text-sm font-medium truncate block">{truncatedName}</span>
                                );
                                
                                if (isTruncated) {
                                    return (
                                        <Tooltip key={idx}>
                                            <TooltipTrigger asChild>
                                                {FileDisplay}
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs break-all">
                                                <p>{file.name}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                }
                                return <span key={idx}>{FileDisplay}</span>;
                            })}
                        </TooltipProvider>
                    </div>
                </div>
            )}
            {order.status !== 'pending' && order.startedAt && (
                <div className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Started</p>
                        <p className="font-medium text-sm">{order.startedAt ? format(order.startedAt instanceof Date ? order.startedAt : order.startedAt.toDate(), "MMM d, yyyy") : 'Unknown'}</p>
                    </div>
                </div>
            )}
            {order.status === 'completed' && order.completedAt && (
                <>
                <div className="flex items-center gap-2.5">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Completed</p>
                        <p className="font-medium text-sm">{order.completedAt ? format(order.completedAt instanceof Date ? order.completedAt : order.completedAt.toDate(), "MMM d, yyyy") : 'Unknown'}</p>
                    </div>
                </div>
                {order.turnaroundTimeHours && (
                    <div className="flex items-center gap-2.5">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Turnaround</p>
                            <p className="font-medium text-sm">~{order.turnaroundTimeHours}h</p>
                        </div>
                    </div>
                )}
                </>
            )}
        </div>
        
        
        {order.status === 'completed' && (
          <div className="border-t pt-3 sm:pt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button className="w-full sm:w-auto text-xs sm:text-sm" size="sm">
              <Download className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Download
            </Button>
            <Button variant="secondary" className="w-full sm:w-auto text-xs sm:text-sm" size="sm">
              <Save className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Save to Drive
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
