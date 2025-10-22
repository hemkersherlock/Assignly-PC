"use client";

import { useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, User, Phone, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc } from "firebase/firestore";
import { useFirebase } from "@/firebase";
import type { User as UserType } from "@/types";

interface OnboardingData {
  name: string;
  whatsappNo: string;
  section: string;
  year: UserType["year"];
  sem: UserType["sem"];
  branch: UserType["branch"];
}

interface OnboardingFlowProps {
  user: UserType;
  onComplete: (updatedUser: UserType) => void;
}

export default function OnboardingFlow({ user, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    whatsappNo: "",
    section: "",
    year: "1st Year",
    sem: "1st Sem",
    branch: "CS",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const totalSteps = 3;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const userRef = doc(firestore, "users", user.id);
      await updateDoc(userRef, {
        name: data.name,
        whatsappNo: data.whatsappNo,
        section: data.section,
        year: data.year,
        sem: data.sem,
        branch: data.branch,
      });

      // Create updated user object
      const updatedUser = {
        ...user,
        name: data.name,
        whatsappNo: data.whatsappNo,
        section: data.section,
        year: data.year,
        sem: data.sem,
        branch: data.branch,
      };

      toast({
        title: "Profile Updated!",
        description: "Your profile has been successfully updated.",
      });

      console.log('✅ Onboarding completed, passing updated user:', updatedUser);
      onComplete(updatedUser);
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

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return data.name.trim() !== "";
      case 2:
        return data.whatsappNo.trim() !== "" && data.section.trim() !== "";
      case 3:
        return data.year && data.sem && data.branch;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <User className="mx-auto h-12 w-12 text-primary mb-4" />
              <h2 className="text-2xl font-semibold">Personal Information</h2>
              <p className="text-muted-foreground">Let's start with your basic details</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Phone className="mx-auto h-12 w-12 text-primary mb-4" />
              <h2 className="text-2xl font-semibold">Contact & Section</h2>
              <p className="text-muted-foreground">Help us stay connected with you</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="whatsapp">WhatsApp Number *</Label>
                <Input
                  id="whatsapp"
                  placeholder="Enter your WhatsApp number"
                  value={data.whatsappNo}
                  onChange={(e) => setData({ ...data, whatsappNo: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="section">Section *</Label>
                <Input
                  id="section"
                  placeholder="Enter your section (e.g., A, B, C)"
                  value={data.section}
                  onChange={(e) => setData({ ...data, section: e.target.value })}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-primary mb-4" />
              <h2 className="text-2xl font-semibold">Academic Details</h2>
              <p className="text-muted-foreground">Tell us about your studies</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="year">Year *</Label>
                <Select value={data.year} onValueChange={(value: UserType["year"]) => setData({ ...data, year: value })}>
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
                <Select value={data.sem} onValueChange={(value: UserType["sem"]) => setData({ ...data, sem: value })}>
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
              
              <div>
                <Label htmlFor="branch">Branch *</Label>
                <Select value={data.branch} onValueChange={(value: UserType["branch"]) => setData({ ...data, branch: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CS">Computer Science (CS)</SelectItem>
                    <SelectItem value="EXTC">Electronics & Telecommunication (EXTC)</SelectItem>
                    <SelectItem value="MECH">Mechanical (MECH)</SelectItem>
                    <SelectItem value="CHEM">Chemical (CHEM)</SelectItem>
                    <SelectItem value="IT">Information Technology (IT)</SelectItem>
                    <SelectItem value="INSTRU">Instrumentation (INSTRU)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-subtle">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Step {currentStep} of {totalSteps} - Let's set up your profile
          </CardDescription>
          <Progress value={(currentStep / totalSteps) * 100} className="mt-4" />
        </CardHeader>
        <CardContent>
          {renderStep()}
          
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!isStepValid() || isLoading}
              >
                {isLoading ? "Saving..." : "Complete Setup"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
