"use client";

import { useEffect, useState } from "react";

interface SuccessAnimationProps {
  show: boolean;
  onComplete?: () => void;
}

export function SuccessAnimation({
  show,
  onComplete,
}: SuccessAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // Auto-hide after 2 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="relative flex items-center justify-center"
        style={{
          animation: "appleSlide 2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        {/* Premium green checkmark image */}
        <img
          src="/check-mark-button_2705.png"
          alt="Success"
          className="w-28 h-28"
          style={{
            animation: "checkPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both",
            filter: "drop-shadow(0 6px 12px rgba(0, 0, 0, 0.2))",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes appleSlide {
          0% {
            transform: translateY(60px) scale(0.9);
            opacity: 0;
          }
          20% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          80% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-10px) scale(0.98);
            opacity: 0;
          }
        }

        @keyframes checkPop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}


