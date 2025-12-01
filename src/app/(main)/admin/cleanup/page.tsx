"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, RefreshCw, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CloudinaryCleanupPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [lastCleanup, setLastCleanup] = useState<any>(null);

  // Check queue status on load
  useEffect(() => {
    checkQueueStatus();
  }, []);

  const checkQueueStatus = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/cleanup-cloudinary', {
        method: 'GET',
      });
      
      const data = await response.json();
      setQueueStatus(data);
      
      console.log('Queue status:', data);
    } catch (error) {
      console.error('Error checking queue:', error);
    } finally {
      setChecking(false);
    }
  };

  const runCleanup = async () => {
    setLoading(true);
    try {
      toast({
        title: "Starting cleanup...",
        description: "Processing Cloudinary deletion queue",
      });

      const response = await fetch('/api/cleanup-cloudinary', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLastCleanup(data);
        toast({
          title: "Cleanup completed!",
          description: `Processed ${data.processed} items. Check results below.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Cleanup failed",
          description: data.error || 'Unknown error',
        });
      }

      // Refresh queue status
      await checkQueueStatus();

    } catch (error: any) {
      console.error('Cleanup error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || 'Failed to run cleanup',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full p-3 sm:p-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cloudinary Cleanup</h1>
        <p className="text-muted-foreground mt-1">
          Manage background deletion of Cloudinary files from deleted orders
        </p>
      </div>

      {/* Queue Status */}
      <Card className="border-0 sm:border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Deletion Queue Status
              </CardTitle>
              <CardDescription>
                Files waiting to be deleted from Cloudinary
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={checkQueueStatus}
              disabled={checking}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {queueStatus ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Pending</p>
                </div>
                <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
                  {queueStatus.pending || 0}
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Files waiting to be deleted
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">Completed</p>
                </div>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {queueStatus.completed || 0}
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Successfully deleted
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trash2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Total</p>
                </div>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {queueStatus.total || 0}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  All deletion requests
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading queue status...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Cleanup */}
      <Card className="border-0 sm:border">
        <CardHeader>
          <CardTitle>Manual Cleanup</CardTitle>
          <CardDescription>
            Manually process pending Cloudinary deletions (processes up to 10 items at a time)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>When you delete an order, files are queued for deletion</li>
                <li>Most files are deleted automatically in the background</li>
                <li>If deletion fails (timeouts, errors), click "Run Cleanup" below</li>
                <li>Failed items will retry up to 3 times automatically</li>
              </ul>
            </div>
          </div>

          <Button 
            onClick={runCleanup} 
            disabled={loading || (queueStatus?.pending === 0)}
            className="w-full sm:w-auto"
            size="lg"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Run Cleanup {queueStatus?.pending > 0 && `(${queueStatus.pending} pending)`}
              </>
            )}
          </Button>

          {queueStatus?.pending === 0 && (
            <p className="text-sm text-green-600 dark:text-green-400">
              ✅ No pending deletions - all files are clean!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Last Cleanup Results */}
      {lastCleanup && lastCleanup.results && (
        <Card className="border-0 sm:border">
          <CardHeader>
            <CardTitle>Last Cleanup Results</CardTitle>
            <CardDescription>
              Processed {lastCleanup.processed} items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lastCleanup.results.map((result: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {result.orderId}
                    </code>
                  </div>
                  <Badge 
                    variant={
                      result.status === 'completed' ? 'default' : 
                      result.status === 'retry' ? 'secondary' : 
                      'destructive'
                    }
                  >
                    {result.status === 'completed' && '✅ Deleted'}
                    {result.status === 'retry' && `🔄 Retry ${result.retryCount}/3`}
                    {result.status === 'error' && '❌ Error'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


