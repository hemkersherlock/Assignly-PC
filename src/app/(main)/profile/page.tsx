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
} from "@/components/ui/card";
import { ArrowLeft, Save, User, Mail, CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc } from "firebase/firestore";
import { useFirebase } from "@/firebase";
import { useAuthContext } from "@/context/AuthContext";
import Link from "next/link";
import type { User as UserType } from "@/types";

export default function ProfilePage() {
  const { user, setAppUser } = useAuthContext();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
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
      toast({
        variant: "destructive",
        title: "Error",
        description: "User data not available. Please try logging in again.",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const userRef = doc(firestore, "users", user.id);
      await updateDoc(userRef, {
        whatsappNo: formData.whatsappNo,
        section: formData.section,
        year: formData.year,
        sem: formData.sem,
      });

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
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Minimalistic Header */}
      <div className="mb-6 sm:mb-8">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">Profile Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your personal information</p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Profile Form - Takes 2 columns on desktop */}
        <div className="lg:col-span-2">
          <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300 bg-gradient-to-br from-background to-muted/20">
            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* WhatsApp */}
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-sm font-medium text-foreground/90">
                  WhatsApp Number
                </Label>
                <Input
                  id="whatsapp"
                  placeholder="+91 9876543210"
                  value={formData.whatsappNo}
                  onChange={(e) => setFormData({ ...formData, whatsappNo: e.target.value })}
                  className="h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                />
                <p className="text-xs text-muted-foreground/80">
                  We'll contact you here about your orders
                </p>
              </div>
              
              {/* Section */}
              <div className="space-y-2">
                <Label htmlFor="section" className="text-sm font-medium text-foreground/90">
                  Section
                </Label>
                <Input
                  id="section"
                  placeholder="A, B, C, etc."
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                  className="h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                  maxLength={2}
                />
              </div>

              {/* Year and Semester - Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="year" className="text-sm font-medium text-foreground/90">
                    Year
                  </Label>
                  <Select value={formData.year} onValueChange={(value: UserType["year"]) => setFormData({ ...formData, year: value })}>
                    <SelectTrigger className="h-11 bg-background/50 border-border/50 focus:border-primary/50">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st Year">1st Year</SelectItem>
                      <SelectItem value="2nd Year">2nd Year</SelectItem>
                      <SelectItem value="3rd Year">3rd Year</SelectItem>
                      <SelectItem value="4th Year">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sem" className="text-sm font-medium text-foreground/90">
                    Semester
                  </Label>
                  <Select value={formData.sem} onValueChange={(value: UserType["sem"]) => setFormData({ ...formData, sem: value })}>
                    <SelectTrigger className="h-11 bg-background/50 border-border/50 focus:border-primary/50">
                      <SelectValue placeholder="Select semester" />
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
        </div>

        {/* Sidebar - Account Info & Save Button */}
        <div className="space-y-6">
          {/* Account Info Card - Minimalistic */}
          <Card className="border border-border/50 shadow-sm bg-gradient-to-br from-background to-muted/10">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  <Mail className="h-3.5 w-3.5" />
                  <span>Email</span>
                </div>
                <p className="text-sm font-medium text-foreground break-all">{user.email}</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  <User className="h-3.5 w-3.5" />
                  <span>Name</span>
                </div>
                <p className="text-sm font-medium text-foreground">{user.name}</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Credits</span>
                </div>
                <p className="text-base font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {user.creditsRemaining}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button - Sticky on desktop, fixed on mobile */}
          <div className="lg:sticky lg:top-6">
            <Button 
              onClick={handleSave} 
              disabled={isLoading} 
              className="w-full h-12 text-sm font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-200"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
      </div>
    </div>
  );
}
