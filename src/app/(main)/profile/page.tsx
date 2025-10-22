"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Save, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc } from "firebase/firestore";
import { useFirebase } from "@/firebase";
import { useAuthContext } from "@/context/AuthContext";
import Link from "next/link";
import type { User as UserType } from "@/types";

export default function ProfilePage() {
  console.log('🔍 Profile page component loaded');
  
  const { user, setAppUser } = useAuthContext();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  console.log('🔍 Profile page loaded, user:', user);
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    whatsappNo: '',
    section: '',
    year: '1st Year' as const,
    sem: '1st Sem' as const,
  });

  // Update form data when user data loads
  React.useEffect(() => {
    if (user) {
      setFormData({
        whatsappNo: user.whatsappNo || '',
        section: user.section || '',
        year: user.year || '1st Year',
        sem: user.sem || '1st Sem',
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      console.error('❌ No user data available for profile update');
      toast({
        variant: "destructive",
        title: "Error",
        description: "User data not available. Please try logging in again.",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('🔍 Updating profile for user:', user.id);
      const userRef = doc(firestore, "users", user.id);
      await updateDoc(userRef, {
        whatsappNo: formData.whatsappNo,
        section: formData.section,
        year: formData.year,
        sem: formData.sem,
      });

      console.log('✅ Profile updated successfully');

      // Update local state
      setAppUser({
        ...user,
        whatsappNo: formData.whatsappNo,
        section: formData.section,
        year: formData.year,
        sem: formData.sem,
      });

      toast({
        title: "Profile Updated!",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Card className="shadow-subtle">
          <CardContent className="p-8 text-center">
            <p>Loading profile...</p>
            <p className="text-sm text-muted-foreground mt-2">User data not available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Edit Profile</h1>
          <p className="text-muted-foreground">Update your contact and academic details</p>
        </div>
      </div>

      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>Update your contact and academic details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* WhatsApp */}
          <div>
            <Label htmlFor="whatsapp">WhatsApp Number *</Label>
            <Input
              id="whatsapp"
              placeholder="Enter your WhatsApp number"
              value={formData.whatsappNo}
              onChange={(e) => setFormData({ ...formData, whatsappNo: e.target.value })}
            />
            <p className="text-sm text-muted-foreground mt-1">
              We'll use this to contact you about your orders
            </p>
          </div>
          
          {/* Section */}
          <div>
            <Label htmlFor="section">Section *</Label>
            <Input
              id="section"
              placeholder="Enter your section (e.g., A, B, C)"
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
            />
          </div>

          {/* Year and Semester */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Year *</Label>
              <Select value={formData.year} onValueChange={(value: UserType["year"]) => setFormData({ ...formData, year: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st Year">1st Year</SelectItem>
                  <SelectItem value="2nd Year">2nd Year</SelectItem>
                  <SelectItem value="3rd Year">3rd Year</SelectItem>
                  <SelectItem value="4th Year">4th Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="sem">Semester *</Label>
              <Select value={formData.sem} onValueChange={(value: UserType["sem"]) => setFormData({ ...formData, sem: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st Sem">1st Sem</SelectItem>
                  <SelectItem value="2nd Sem">2nd Sem</SelectItem>
                  <SelectItem value="3rd Sem">3rd Sem</SelectItem>
                  <SelectItem value="4th Sem">4th Sem</SelectItem>
                  <SelectItem value="5th Sem">5th Sem</SelectItem>
                  <SelectItem value="6th Sem">6th Sem</SelectItem>
                  <SelectItem value="7th Sem">7th Sem</SelectItem>
                  <SelectItem value="8th Sem">8th Sem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading} className="min-w-[120px]">
          {isLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
