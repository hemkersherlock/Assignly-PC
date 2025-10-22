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
import { useToast } from "@/hooks/use-toast";
import { fixUserCreditsByUID } from "@/lib/fix-user-credits";
import { Loader2 } from "lucide-react";

export default function FixCreditsPage() {
  const [userId, setUserId] = useState("");
  const [newCredits, setNewCredits] = useState(40);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFixCredits = async () => {
    if (!userId.trim()) {
      toast({
        variant: "destructive",
        title: "User ID is required",
        description: "Please enter a valid user ID",
      });
      return;
    }

    setIsLoading(true);
    try {
      await fixUserCreditsByUID(userId, newCredits);
      toast({
        title: "Credits Fixed!",
        description: `User ${userId} now has ${newCredits} credits`,
      });
      setUserId("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to fix credits",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-subtle">
      <CardHeader>
        <CardTitle>Fix User Credits</CardTitle>
        <CardDescription>
          Fix credits for users who have negative or incorrect credit values.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="userId">User ID (Firebase UID)</Label>
          <Input
            id="userId"
            placeholder="Enter Firebase UID (e.g., MwAkaXODaAfZ0RML2LMbWgvrZ0v1)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            You can find the User ID in Firebase Console → Authentication → Users
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="credits">New Credit Amount</Label>
          <Input
            id="credits"
            type="number"
            placeholder="40"
            value={newCredits}
            onChange={(e) => setNewCredits(Number(e.target.value))}
          />
        </div>

        <Button 
          onClick={handleFixCredits} 
          disabled={isLoading || !userId.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fixing Credits...
            </>
          ) : (
            "Fix User Credits"
          )}
        </Button>

        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            How to find User ID:
          </h4>
          <ol className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>1. Go to Firebase Console</li>
            <li>2. Navigate to Authentication → Users</li>
            <li>3. Find the user (ayush@gmail.com)</li>
            <li>4. Copy the User UID</li>
            <li>5. Paste it in the User ID field above</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

