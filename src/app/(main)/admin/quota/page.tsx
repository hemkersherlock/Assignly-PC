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
import { collection, query, orderBy, limit, doc, updateDoc, writeBatch } from "firebase/firestore";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/context/AuthContext";
import { RefreshCw, UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
    const { firestore } = useFirebase();
    const { user: currentUser } = useAuthContext();

    // Get all users (students)
    const usersQuery = useMemoFirebase(() => {
        if (!currentUser?.isAdmin) return null;
        return query(collection(firestore, 'users'), orderBy('createdAt', 'desc'), limit(100));
    }, [firestore, currentUser?.isAdmin]);

    const { data: allUsers, isLoading: usersLoading } = useCollection<User>(usersQuery);

    // Filter to only show students (non-admin users)
    const students = allUsers?.filter(user => user.role !== 'admin') || [];

    const handleReplenish = async () => {
        if (!students.length) return;
        
        setIsLoading(true);
        try {
            const batch = writeBatch(firestore);
            
            students.forEach(student => {
                const userRef = doc(firestore, 'users', student.id);
                batch.update(userRef, {
                    creditsRemaining: 40,
                    lastReplenishedAt: new Date()
                });
            });
            
            await batch.commit();
            
            toast({ 
                title: 'Success!', 
                description: `All ${students.length} student credits have been replenished to 40 credits.`
            });
        } catch (error: any) {
            console.error('Failed to replenish credits:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to replenish credits. Please try again."
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
        
        setIsLoading(true);
        try {
            const studentRef = doc(firestore, 'users', selectedStudent);
            const studentData = students.find(s => s.id === selectedStudent);
            
            if (!studentData) {
                throw new Error('Student not found');
            }
            
            const newCredits = Math.max(0, studentData.creditsRemaining + adjustmentValue);
            
            await updateDoc(studentRef, {
                creditsRemaining: newCredits,
                lastAdjustedAt: new Date()
            });
            
            toast({ 
                title: 'Success!', 
                description: `Credits for ${studentData.email} have been adjusted by ${adjustmentValue}. New total: ${newCredits} credits.`
            });
            
            setSelectedStudent('');
            setAdjustment('');
        } catch (error: any) {
            console.error('Failed to adjust credits:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to adjust credits. Please try again."
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

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Bulk Replenishment</CardTitle>
          <CardDescription>Reset all student credits to the default amount.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will reset credits for {students.length} students to 40 credits each.
          </p>
          <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" disabled={isLoading || students.length === 0}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Replenish All Credits to 40
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This action will reset the credits for ALL {students.length} students to 40 credits. This cannot be undone.
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
