"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/context/AuthContext";
import { RefreshCw, UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { httpsCallable, type HttpsCallable } from "firebase/functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { User } from "@/types";

export default function AdminCreditsPage() {
    const [selectedStudent, setSelectedStudent] = useState('');
    const [adjustment, setAdjustment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { firestore, functions } = useFirebase();
    const { user: currentUser } = useAuthContext();

    // Get all users (students)
    const usersQuery = useMemoFirebase(() => {
        if (!currentUser || currentUser.role !== 'admin') return null;
        const q = query(collection(firestore, 'users'), limit(100));
        console.log('🔍 Creating users query for credits:', q);
        return q;
    }, [firestore, currentUser?.role]);

    const { data: allUsers, isLoading: usersLoading, error: usersError } = useCollection<User>(usersQuery);

    // Filter to only show students (non-admin users)
    const students = allUsers?.filter(user => user.role !== 'admin') || [];

    console.log('🔍 Credits Page Debug:', {
        currentUser: currentUser?.email,
        userRole: currentUser?.role,
        isAdmin: currentUser?.role === 'admin',
        allUsers: allUsers?.length,
        students: students.length,
        usersLoading,
        usersError: usersError?.message
    });

    const handleReplenish = async () => {
        if (!students.length) return;
        
        setIsLoading(true);
        try {
            // Use server-side Cloud Function for secure credit addition
            const bulkAddCredits = httpsCallable(functions, 'bulkAddCreditsToAll') as HttpsCallable<{ creditAmount?: number; reason?: string }, { success: boolean; usersProcessed: number; creditsAdded: number }>;
            
            const result = await bulkAddCredits({
                creditAmount: 40,
                reason: 'Monthly credit addition - admin bulk operation'
            });
            
            const data = result.data;
            
            if (data.success) {
                toast({ 
                    title: 'Success!', 
                    description: `Added 40 credits to ${data.usersProcessed} students. Total credits added: ${data.creditsAdded}. All changes are logged in audit trail.`
                });
            } else {
                throw new Error('Bulk credit addition failed');
            }
        } catch (error: any) {
            console.error('Failed to replenish credits:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to replenish credits. Please try again."
            });
        } finally {
            setIsLoading(false);
        }
    }

    const handleAdjustment = async () => {
        if (!selectedStudent || !adjustment) return;
        
        const adjustmentValue = parseInt(adjustment);
        if (isNaN(adjustmentValue)) {
            toast({
                variant: "destructive",
                title: "Invalid Input",
                description: "Please enter a valid number for credits adjustment."
            });
            return;
        }
        
        const studentData = students.find(s => s.id === selectedStudent);
        if (!studentData) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Student not found."
            });
            return;
        }
        
        setIsLoading(true);
        try {
            // Use server-side Cloud Function for secure credit adjustment
            const adjustCredits = httpsCallable(functions, 'adjustUserCredits') as HttpsCallable<{ userId: string; creditAmount: number; reason?: string }, { success: boolean; newCredits: number; oldCredits: number }>;
            
            const result = await adjustCredits({
                userId: selectedStudent,
                creditAmount: adjustmentValue,
                reason: `Manual adjustment by admin - ${adjustmentValue > 0 ? 'Added' : 'Subtracted'} ${Math.abs(adjustmentValue)} credits`
            });
            
            const data = result.data;
            
            if (data.success) {
                toast({ 
                    title: 'Success!', 
                    description: `Credits for ${studentData.email} adjusted by ${adjustmentValue}. Old: ${data.oldCredits}, New: ${data.newCredits} credits.`
                });
                
                setSelectedStudent('');
                setAdjustment('');
            } else {
                throw new Error('Credit adjustment failed');
            }
        } catch (error: any) {
            console.error('Failed to adjust credits:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to adjust credits. Please try again."
            });
        } finally {
            setIsLoading(false);
        }
    }

    const studentData = students.find(s => s.id === selectedStudent);

    if (usersLoading) {
        return (
            <div className="grid gap-8 md:grid-cols-2">
                <Card className="shadow-subtle">
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-4 w-64" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
                <Card className="shadow-subtle">
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (usersError) {
        return (
            <div className="grid gap-8 md:grid-cols-2">
                <Card className="shadow-subtle">
                    <CardHeader>
                        <CardTitle>Bulk Replenishment</CardTitle>
                        <CardDescription>Add 40 credits to all students. Credits accumulate and never expire.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8">
                            <p className="text-red-500">Error loading students: {usersError.message}</p>
                            <p className="text-sm text-muted-foreground mt-2">Please try refreshing the page.</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-subtle">
                    <CardHeader>
                        <CardTitle>Individual Adjustments</CardTitle>
                        <CardDescription>Manually add or subtract credits for a specific student.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8">
                            <p className="text-red-500">Error loading students: {usersError.message}</p>
                            <p className="text-sm text-muted-foreground mt-2">Please try refreshing the page.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Bulk Credit Addition</CardTitle>
          <CardDescription>Add 40 credits to all students. Credits accumulate and never expire.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will add 40 credits to all {students.length} students. Existing credits are preserved and accumulate.
          </p>
          <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" disabled={isLoading || students.length === 0}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Add 40 Credits to All Students
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This action will add 40 credits to ALL {students.length} students. Existing credits will be preserved and accumulated. This cannot be undone.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReplenish}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
      
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Individual Adjustments</CardTitle>
          <CardDescription>Manually add or subtract credits for a specific student.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student-select">Select Student</Label>
            <Select onValueChange={setSelectedStudent} value={selectedStudent}>
              <SelectTrigger id="student-select">
                <SelectValue placeholder="Select a student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.email} ({student.creditsRemaining} credits)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {studentData && (
              <div className="p-4 bg-muted/50 rounded-lg text-sm">
                  Current credits: <span className="font-bold">{studentData.creditsRemaining} credits</span>
              </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="adjustment">Credits to Add/Subtract</Label>
            <Input 
              id="adjustment" 
              type="number" 
              placeholder="e.g., 10 or -5" 
              value={adjustment} 
              onChange={e => setAdjustment(e.target.value)} 
              disabled={!selectedStudent} 
            />
            <p className="text-xs text-muted-foreground">
              Positive numbers add credits, negative numbers subtract credits.
            </p>
          </div>

          <Button className="w-full" onClick={handleAdjustment} disabled={!selectedStudent || !adjustment || isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Save Adjustment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
