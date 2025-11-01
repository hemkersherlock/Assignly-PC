"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusDropdown, OrderStatus } from "@/components/shared/StatusDropdown";
import { format, formatDistanceToNow } from "date-fns";
import { Download, Search, Filter, X, MoreHorizontal, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RealOrder {
  id: string;
  studentId: string;
  studentEmail: string;
  studentName?: string;
  studentBranch?: string;
  studentYear?: string;
  assignmentTitle: string;
  orderType: 'assignment' | 'practical';
  pageCount: number;
  status: OrderStatus;
  createdAt: any;
  originalFiles: { name: string; url: string }[];
  cloudinaryFolder: string;
}

// Order IDs are now generated as short, user-friendly IDs at creation time

export default function AdminAllOrdersPage() {
  const [orders, setOrders] = useState<RealOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Delete order states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<RealOrder | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { firestore } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllOrders = async () => {
      try {
        console.log('[Admin] Fetching all orders from Firestore...');
        
        // Get all users first
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const allOrders: RealOrder[] = [];
        
        for (const userDoc of usersSnapshot.docs) {
          const userId = userDoc.id;
          const userData = userDoc.data();
          
          console.log(`[Admin] Checking orders for user: ${userId}`);
          
          // Get orders for this user
          const ordersSnapshot = await getDocs(collection(firestore, `users/${userId}/orders`));
          
          ordersSnapshot.forEach(orderDoc => {
            const orderData = orderDoc.data();
            allOrders.push({
              id: orderDoc.id,
              studentId: userId,
              studentEmail: userData.email || 'unknown@example.com',
              studentName: userData.name || 'Unknown Student',
              studentBranch: userData.branch || 'Unknown',
              studentYear: userData.year || 'Unknown',
              assignmentTitle: orderData.assignmentTitle || 'Untitled',
              orderType: orderData.orderType || 'assignment',
              pageCount: orderData.pageCount || 0,
              status: orderData.status || 'pending',
              createdAt: orderData.createdAt,
              originalFiles: orderData.originalFiles || [],
              cloudinaryFolder: orderData.cloudinaryFolder || ''
            });
          });
        }
        
        // Sort by creation date (newest first)
        allOrders.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
        console.log(`[Admin] Found ${allOrders.length} orders total`);
        setOrders(allOrders);
      } catch (error) {
        console.error('[Admin] Error fetching orders:', error);
        toast({
          variant: "destructive",
          title: "Failed to load orders",
          description: "Could not fetch orders from database. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllOrders();
  }, [firestore, toast]);

  const handleStatusChange = async (orderId: string, studentId: string, newStatus: OrderStatus) => {
    setUpdatingStatus(orderId);
    try {
      // 🔒 SECURITY: Use server-side API instead of direct Firestore write
      const { auth } = useFirebase();
      
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Authentication failed. Please log in again.');
      }

      const response = await fetch('/api/update-order-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orderId,
          studentId,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update order status');
      }

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus }
          : order
      ));

      toast({
        title: "Status Updated!",
        description: `Order status changed to "${newStatus}"`,
      });
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update order status. Please try again.",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDeleteOrder = (order: RealOrder) => {
    setOrderToDelete(order);
    setDeleteConfirmation("");
    setDeleteDialogOpen(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete || deleteConfirmation !== "DELETE") {
      toast({
        variant: "destructive",
        title: "Invalid Confirmation",
        description: "Please type 'DELETE' exactly to confirm deletion.",
      });
      return;
    }

    setIsDeleting(true);
    try {
      console.log('🗑️ Starting order deletion via API...', {
        orderId: orderToDelete.id,
        studentId: orderToDelete.studentId,
        pageCount: orderToDelete.pageCount,
      });
      
      // 🔒 SECURITY: Call the secure delete API with authentication
      const { auth } = useFirebase();
      const idToken = await auth.currentUser?.getIdToken();
      
      if (!idToken) {
        throw new Error('Authentication failed. Please log in again.');
      }

      const response = await fetch('/api/delete-order', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orderId: orderToDelete.id,
          studentId: orderToDelete.studentId,
          pageCount: orderToDelete.pageCount,
          originalFiles: orderToDelete.originalFiles || [],
          cloudinaryFolder: orderToDelete.cloudinaryFolder || `assignly/orders/${orderToDelete.id}`,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Delete failed');
      }

      console.log('✅ Order deleted successfully:', data);

      // Update local state
      setOrders(prev => prev.filter(order => order.id !== orderToDelete.id));

      toast({
        title: "✅ Order Deleted Successfully!",
        description: `Order ${orderToDelete.id} deleted. ${data.creditsRestored} credits restored. Cloudinary files queued for cleanup.`,
      });

      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      setDeleteConfirmation("");

    } catch (error: any) {
      console.error('❌ Error deleting order:', error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message || "Failed to delete order. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter orders based on search and filter criteria
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Search by order ID
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by order type
    if (orderTypeFilter !== "all") {
      filtered = filtered.filter(order => order.orderType === orderTypeFilter);
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    return filtered;
  }, [orders, searchTerm, orderTypeFilter, statusFilter]);

  if (loading) {
    return (
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>Loading orders from database...</CardDescription>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16" />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

  return (
    <div className="w-full p-3 sm:p-0">
    <Card className="shadow-subtle border-0 sm:border">
      <CardHeader className="pb-3 md:pb-6">
        <CardTitle className="text-lg sm:text-xl">All Orders ({filteredOrders.length})</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Real orders from your Firestore database</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Bar */}
        <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3 sm:h-4 sm:w-4" />
              <Input
                placeholder="Search by Order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 sm:pl-10 text-xs sm:text-sm h-9 sm:h-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Order Type Filter */}
            <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px] text-xs sm:text-sm h-9 sm:h-10">
                <SelectValue placeholder="Order Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs sm:text-sm">All Types</SelectItem>
                <SelectItem value="assignment" className="text-xs sm:text-sm">Assignments</SelectItem>
                <SelectItem value="practical" className="text-xs sm:text-sm">Practicals</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] text-xs sm:text-sm h-9 sm:h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs sm:text-sm">All Status</SelectItem>
                <SelectItem value="pending" className="text-xs sm:text-sm">⏳ Pending</SelectItem>
                <SelectItem value="writing" className="text-xs sm:text-sm">✍️ Writing</SelectItem>
                <SelectItem value="on the way" className="text-xs sm:text-sm">🚀 On the Way</SelectItem>
                <SelectItem value="delivered" className="text-xs sm:text-sm">✅ Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || orderTypeFilter !== "all" || statusFilter !== "all") && (
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {searchTerm}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setSearchTerm("")}
                  />
                </Badge>
              )}
              {orderTypeFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Type: {orderTypeFilter}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setOrderTypeFilter("all")}
                  />
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {statusFilter}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setStatusFilter("all")}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Mobile Horizontal Card View - Minimalist & Cozy */}
        <div className="md:hidden space-y-2">
          {filteredOrders.map(order => (
            <Card key={order.id} className="border overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 p-3">
                {/* Left: Order Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">{order.id}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      order.orderType === 'assignment' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                    }`}>
                      {order.orderType === 'assignment' ? '📝' : '🧪'}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground truncate">{order.studentEmail}</p>
                  
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="font-medium">{order.pageCount}p</span>
                    <span>•</span>
                    <span>
                      {order.createdAt ? (() => {
                        const orderDate = order.createdAt instanceof Date ? order.createdAt : order.createdAt.toDate();
                        const now = new Date();
                        const diffHours = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60));
                        if (diffHours < 1) return 'Now';
                        if (diffHours < 24) return `${diffHours}h`;
                        if (diffHours < 168) return `${Math.floor(diffHours / 24)}d`;
                        return format(orderDate, 'MMM dd');
                      })() : 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Right: Status & Actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusDropdown
                    currentStatus={order.status}
                    onStatusChange={(newStatus) => handleStatusChange(order.id, order.studentId, newStatus)}
                    disabled={updatingStatus === order.id}
                  />
                  
                  {order.originalFiles && order.originalFiles.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <Download className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {order.originalFiles.map((file, index) => (
                          <DropdownMenuItem key={index} asChild>
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs cursor-pointer"
                            >
                              <Download className="h-3 w-3" />
                              <span className="truncate">{file.name}</span>
                            </a>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {filteredOrders.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <p className="font-medium">No orders found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchTerm || orderTypeFilter !== "all" || statusFilter !== "all" 
                    ? "No orders match your filters" 
                    : "No orders found"
                  }
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs" title={order.id}>
                    {order.id}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-semibold">{order.studentName || 'Unknown Student'}</div>
                      <div className="text-sm text-muted-foreground">{order.studentBranch} - {order.studentYear}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex justify-center">
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
                      <div className="text-xs text-muted-foreground text-center truncate max-w-[200px] mx-auto" title={order.assignmentTitle}>
                        {order.assignmentTitle || 'Untitled'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{order.pageCount}</TableCell>
                  <TableCell>
                    <StatusDropdown
                      currentStatus={order.status}
                      onStatusChange={(newStatus) => handleStatusChange(order.id, order.studentId, newStatus)}
                      disabled={updatingStatus === order.id}
                    />
                  </TableCell>
                  <TableCell>
                    {order.createdAt ? (() => {
                      const orderDate = order.createdAt instanceof Date ? order.createdAt : order.createdAt.toDate();
                      const now = new Date();
                      const diffHours = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60));
                      
                      if (diffHours < 1) return 'Just now';
                      if (diffHours < 24) return `${diffHours}h ago`;
                      if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`;
                      return format(orderDate, 'MMM dd');
                    })() : 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => handleDeleteOrder(order)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Order
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </CardContent>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Order</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the order{" "}
              <span className="font-mono font-semibold">{orderToDelete?.id}</span>{" "}
              and restore {orderToDelete?.pageCount} credits to the student.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type <span className="font-mono font-semibold text-red-600">DELETE</span> to confirm:
              </label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type DELETE here"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteOrder}
              disabled={deleteConfirmation !== "DELETE" || isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </div>
  );
}
