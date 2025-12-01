
"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  UploadCloud,
  File as FileIcon,
  X,
  Loader2,
  Info,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import * as pdfjs from "pdfjs-dist";
import { useAuthContext } from "@/context/AuthContext";
import { useFirebase } from "@/firebase";
import { createOrderFolder, uploadFileToCloudinary } from "@/lib/cloudinary";
import { generateShortOrderId } from "@/lib/order-utils";
import { SuccessAnimation } from "@/components/ui/success-animation";

// Configure pdf.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface FileUploadProgress {
  fileName: string;
  progress: number; // 0 to 100
  error?: string;
}

function FilePreview({
  file,
  onRemove,
  isSubmitting,
}: {
  file: File;
  onRemove: () => void;
  isSubmitting: boolean;
}) {
  const isImage = file.type.startsWith("image/");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file, isImage, previewUrl]);

  return (
    <div className="relative group w-full aspect-video rounded-lg border bg-muted/20 flex items-center justify-center">
      {isImage && previewUrl ? (
        <img
          src={previewUrl}
          alt={file.name}
          className="object-cover h-full w-full rounded-lg"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground p-2">
          <FileIcon className="h-8 w-8" />
          <span className="text-xs font-medium text-center break-all">
            {file.name}
          </span>
        </div>
      )}
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
        disabled={isSubmitting}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function NewOrderPage() {
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [orderType, setOrderType] = useState<"assignment" | "practical">(
    "assignment"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );

  const router = useRouter();
  const { toast } = useToast();
  const { user: appUser, setAppUser } = useAuthContext();
  const { auth } = useFirebase();

  const totalPageCount = useMemo(() => {
    return files.reduce((acc, file) => acc + (pageCounts[file.name] || 0), 0);
  }, [files, pageCounts]);

  const getPageCount = useCallback(
    async (file: File) => {
      if (file.type === "application/pdf") {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument(arrayBuffer).promise;
          return pdf.numPages;
        } catch (error) {
          console.error("Error reading PDF:", error);
          toast({
            variant: "destructive",
            title: `Could not read ${file.name}.`,
          });
          return 1; // Default to 1 page on error
        }
      }
      return 1; // 1 page for non-PDF files
    },
    [toast]
  );

  useEffect(() => {
    const newFiles = files.filter((file) => !(file.name in pageCounts));
    if (newFiles.length > 0) {
      const processFiles = async () => {
        const newCounts: Record<string, number> = {};
        for (const file of newFiles) {
          newCounts[file.name] = await getPageCount(file);
        }
        setPageCounts((prev) => ({ ...prev, ...newCounts }));
      };
      processFiles();
    }
  }, [files, pageCounts, getPageCount]);

  const currentUserCredits = appUser?.creditsRemaining ?? 0;
  const remainingCredits = currentUserCredits - totalPageCount;
  const hasSufficientCredits = remainingCredits >= 0;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const allFiles = [...files, ...newFiles];

      const validFiles = allFiles.filter((file) => {
        if (file.size > 10 * 1024 * 1024) {
          // 10MB
          toast({
            variant: "destructive",
            title: "File too large",
            description: `${file.name} is larger than 10MB.`,
          });
          return false;
        }
        return true;
      });
      setFiles(validFiles);
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    setFiles(files.filter((_, i) => i !== index));

    const newPageCounts = { ...pageCounts };
    delete newPageCounts[fileToRemove.name];
    setPageCounts(newPageCounts);
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files) {
      const newFiles = Array.from(event.dataTransfer.files);
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // 🔒 SECURE ORDER SUBMISSION - Via server API route (OPTION 2)
  // Server validates credits, creates order atomically, prevents exploits
  const handleSubmit = async () => {
    // Client-side validations (fast fail)
    if (!appUser) {
      toast({
        variant: "destructive",
        title: "You must be logged in to submit an order.",
      });
      return;
    }

    if (!appUser.email) {
      toast({
        variant: "destructive",
        title: "User email is missing. Please log out and log in again.",
      });
      return;
    }

    if (!assignmentTitle.trim()) {
      toast({
        variant: "destructive",
        title: "Assignment title is required.",
      });
      return;
    }

    if (files.length === 0) {
      toast({
        variant: "destructive",
        title: "Please upload at least one file.",
      });
      return;
    }

    if (!hasSufficientCredits) {
      toast({
        variant: "destructive",
        title: "Insufficient credits to submit.",
        description: `You need ${totalPageCount} credits but only have ${currentUserCredits} remaining.`,
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress({});

    try {
      toast({
        title: "Submitting...",
        description: "Your order is being processed.",
      });

      // Generate a short, user-friendly order ID
      const orderId = generateShortOrderId();

      // 1. Create Cloudinary folder
      const cloudinaryFolder = await createOrderFolder(orderId);

      // 2. Upload files in parallel for faster processing
      console.log(`📤 Starting parallel upload of ${files.length} files...`);
      
      const uploadPromises = files.map(async (file, i) => {
        try {
          console.log(`Uploading file ${i + 1}/${files.length}: ${file.name}`);
          
          const serializableFile = {
            name: file.name,
            type: file.type,
            size: file.size,
            data: Array.from(new Uint8Array(await file.arrayBuffer()))
          };
          
          const uploadedFile = await uploadFileToCloudinary(serializableFile, orderId);
          console.log(`✅ Upload successful: ${uploadedFile.id}`);
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          
          return { name: file.name, url: uploadedFile.url };
        } catch (error) {
          console.error(`❌ Failed to upload ${file.name}:`, error);
          setUploadProgress(prev => ({ ...prev, [file.name]: -1 }));
          throw error;
        }
      });
      
      const uploadedFiles = await Promise.all(uploadPromises);
      console.log(`✅ All ${uploadedFiles.length} files uploaded!`);

      // 3. 🔒 CALL SECURE API ROUTE (Server validates & creates order)
      console.log('🔒 Calling secure API route for order creation...');
      
      // Get Firebase ID token for authentication
      const idToken = await auth.currentUser?.getIdToken();
      
      if (!idToken) {
        throw new Error('Authentication failed. Please log in again.');
      }

      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orderId,
          assignmentTitle,
          orderType,
          pageCount: totalPageCount,
          uploadedFiles,
          cloudinaryFolder,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Order creation failed on server');
      }

      console.log('✅ Server validated and created order:', data);

      // 4. Update local user state with server-confirmed values
      setAppUser(appUser ? {
        ...appUser,
        creditsRemaining: data.creditsRemaining,
        totalOrders: (appUser.totalOrders || 0) + 1,
        totalPages: (appUser.totalPages || 0) + totalPageCount,
        lastOrderAt: new Date()
      } : null);

      // Show success animation
      setShowSuccess(true);

    } catch (error: any) {
      console.error("❌ Order submission failed:", error);
      
      let errorMessage = "An unexpected error occurred. Please try again.";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalProgress = useMemo(() => {
    if (files.length === 0) return 0;
    const uploadedCount = Object.keys(uploadProgress).length;
    return (uploadedCount / files.length) * 100;
  }, [uploadProgress, files.length]);

  return (
    <div className="w-full p-3 sm:p-0 flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-4xl mx-auto">
      {/* Main Form */}
      <div className="w-full space-y-3 sm:space-y-4 lg:space-y-6">
        <Card className="shadow-subtle border border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg sm:text-xl">Create New Order</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Give your assignment a title and upload the necessary files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="assignment-title" className="text-sm">Assignment Title</Label>
              <Input
                id="assignment-title"
                placeholder="e.g. Modern History Midterm Essay"
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                disabled={isSubmitting}
                className="text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2 sm:space-y-3">
              <Label className="text-sm">Order Type</Label>
              <RadioGroup
                defaultValue="assignment"
                className="flex gap-4"
                onValueChange={(value: "assignment" | "practical") =>
                  setOrderType(value)
                }
                disabled={isSubmitting}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="assignment" id="r1" />
                  <Label htmlFor="r1" className="font-normal cursor-pointer text-sm">
                    Assignment
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="practical" id="r2" />
                  <Label htmlFor="r2" className="font-normal cursor-pointer text-sm">
                    Practical
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Assignment Files</Label>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,image/jpeg,image/png"
                disabled={isSubmitting}
              />
              {files.length === 0 ? (
                <div
                  className="relative border-2 border-dashed border-muted-foreground/50 rounded-lg p-6 sm:p-8 text-center flex flex-col items-center justify-center hover:border-primary transition-colors cursor-pointer min-h-[160px]"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                  <p className="mt-2 font-semibold text-sm sm:text-base">
                    Tap to browse files
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    PDF, DOCX, JPG, PNG up to 10MB each
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {files.map((file, index) => (
                    <FilePreview
                      key={index}
                      file={file}
                      onRemove={() => removeFile(index)}
                      isSubmitting={isSubmitting}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className={cn(
                      "aspect-video rounded-lg border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors",
                      isSubmitting && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <Plus className="h-6 w-6 sm:h-8 sm:w-8" />
                    <span className="text-xs sm:text-sm font-semibold mt-1">Add More</span>
                  </button>
                </div>
              )}
            </div>
            {isSubmitting && (
              <div className="space-y-2">
                <Label className="text-sm">Upload Progress</Label>
                <Progress value={totalProgress} />
                <p className="text-xs sm:text-sm text-muted-foreground text-center">
                  {Math.round(totalProgress)}% complete
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Billing Summary */}
      <div className="w-full space-y-3 sm:space-y-4 lg:space-y-6">
        <Card className="shadow-subtle border border-border">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Billing Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-muted-foreground">Estimated Page Count</span>
              <span className="font-semibold">{totalPageCount} pages</span>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-muted-foreground">Your Current Credits</span>
              <span className="font-semibold">{currentUserCredits} credits</span>
            </div>
            <div className="space-y-2">
              <Progress
                value={
                  hasSufficientCredits
                    ? (totalPageCount / (currentUserCredits || 1)) * 100
                    : 100
                }
                className={
                  !hasSufficientCredits
                    ? "bg-destructive/20 [&>*]:bg-destructive"
                    : ""
                }
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Cost: {totalPageCount} credits</span>
                <span>Remaining: {remainingCredits < 0 ? 0 : remainingCredits}</span>
              </div>
            </div>
            {!hasSufficientCredits && (
              <div className="flex items-start gap-2 sm:gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-2.5 sm:p-3 text-destructive">
                <Info className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm">
                  You don't have enough credits. You need {totalPageCount} credits but only have {currentUserCredits}.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-3 sm:pt-6">
            <Button
              className="w-full text-sm sm:text-base"
              size="lg"
              onClick={handleSubmit}
              disabled={
                !hasSufficientCredits ||
                files.length === 0 ||
                !assignmentTitle.trim() ||
                isSubmitting
              }
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting
                ? Object.keys(uploadProgress).length > 0 
                  ? `Uploading ${Object.keys(uploadProgress).length}/${files.length} files...`
                  : "Preparing..."
                : `Submit Order (${totalPageCount} pages)`}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Simple Success Animation */}
      <SuccessAnimation
        show={showSuccess}
        onComplete={() => {
          setShowSuccess(false);
          router.push("/dashboard");
        }}
      />
    </div>
  );
}
