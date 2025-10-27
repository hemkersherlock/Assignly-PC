"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SuccessAnimation } from "@/components/ui/success-animation";
import { Play } from "lucide-react";

export default function TestAnimationPage() {
  const [showSuccess, setShowSuccess] = useState(false);

  const triggerAnimation = () => {
    setShowSuccess(true);
  };

  return (
    <div className="w-full p-3 sm:p-0 max-w-2xl mx-auto">
      <Card className="border-0 sm:border">
        <CardHeader>
          <CardTitle>🎬 Test Success Animation</CardTitle>
          <CardDescription>
            Click the button below to preview your custom green checkmark animation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={triggerAnimation}
            disabled={showSuccess}
            size="lg"
            className="w-full"
          >
            <Play className="mr-2 h-5 w-5" />
            {showSuccess ? "Animation Playing..." : "Play Success Animation"}
          </Button>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>What to expect:</strong>
              <br />
              • Your custom green checkmark image
              <br />
              • Glassy white frosted background
              <br />
              • Slides up from below with bounce
              <br />
              • Apple-style smooth animation
              <br />
              • Lasts 2 seconds
            </p>
          </div>
        </CardContent>
      </Card>

      <SuccessAnimation
        show={showSuccess}
        onComplete={() => {
          setShowSuccess(false);
        }}
      />
    </div>
  );
}


