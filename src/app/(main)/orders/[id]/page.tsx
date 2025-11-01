
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
    <div className="w-full p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <Button asChild variant="ghost" size="sm" className="mb-2 hover:bg-muted/50">
        <Link href="/orders" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span className="text-sm">Back to Orders</span>
        </Link>
      </Button>
      
      <Card className="shadow-lg border bg-gradient-to-br from-background to-muted/20 overflow-hidden">
        <CardHeader className="pb-4 bg-gradient-to-r from-muted/40 to-transparent border-b">
          <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                  <CardTitle className="text-2xl sm:text-3xl font-bold line-clamp-2 mb-2 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                    {order.assignmentTitle}
                  </CardTitle>
                  <CardDescription className="text-sm font-mono bg-muted/50 px-2 py-1 rounded-md inline-block">
                    {order.id}
                  </CardDescription>
              </div>
              <div className="shrink-0">
                <StatusBadge status={order.status} />
              </div>
          </div>
        </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
            <div className="group flex items-center gap-4 p-4 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-border hover:shadow-sm transition-all duration-200">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Hash className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Pages</p>
                    <p className="text-lg font-bold text-foreground">{order.pageCount}</p>
                </div>
            </div>
            <div className="group flex items-center gap-4 p-4 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-border hover:shadow-sm transition-all duration-200">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Submitted</p>
                    <p className="text-base font-semibold text-foreground">{order.createdAt ? format(order.createdAt instanceof Date ? order.createdAt : order.createdAt.toDate(), "MMM d, yyyy") : 'Unknown'}</p>
                </div>
            </div>
            {order.originalFiles && order.originalFiles.length > 0 && (
                <div className="group flex items-start gap-4 p-4 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-border hover:shadow-sm transition-all duration-200 sm:col-span-2">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors mt-1">
                      <FileText className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">File</p>
                        <TooltipProvider>
                            {order.originalFiles.map((file, idx) => {
                                const truncatedName = truncateFileName(file.name, isMobile ? 25 : 40);
                                const isTruncated = file.name !== truncatedName;
                                const FileDisplay = (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-background/80 rounded-md border border-border/50">
                                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <span className="text-sm font-medium truncate block">{truncatedName}</span>
                                    </div>
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
                                return <div key={idx}>{FileDisplay}</div>;
                            })}
                        </TooltipProvider>
                    </div>
                </div>
            )}
            {order.status !== 'pending' && order.startedAt && (
                <div className="group flex items-center gap-4 p-4 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-border hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                      <Clock className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Started</p>
                        <p className="text-base font-semibold text-foreground">{order.startedAt ? format(order.startedAt instanceof Date ? order.startedAt : order.startedAt.toDate(), "MMM d, yyyy") : 'Unknown'}</p>
                    </div>
                </div>
            )}
            {order.status === 'completed' && order.completedAt && (
                <>
                <div className="group flex items-center gap-4 p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 hover:border-green-500/30 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Completed</p>
                        <p className="text-base font-semibold text-foreground">{order.completedAt ? format(order.completedAt instanceof Date ? order.completedAt : order.completedAt.toDate(), "MMM d, yyyy") : 'Unknown'}</p>
                    </div>
                </div>
                {order.turnaroundTimeHours && (
                    <div className="group flex items-center gap-4 p-4 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-border hover:shadow-sm transition-all duration-200">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                          <Clock className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Turnaround</p>
                            <p className="text-base font-semibold text-foreground">~{order.turnaroundTimeHours}h</p>
                        </div>
                    </div>
                )}
                </>
            )}
        </div>
        
        {order.status === 'completed' && (
          <div className="border-t pt-6 flex flex-col sm:flex-row gap-3">
            <Button className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-200" size="default">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="secondary" className="w-full sm:w-auto border-2 hover:bg-muted/80 transition-all duration-200" size="default">
              <Save className="mr-2 h-4 w-4" />
              Save to Drive
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
