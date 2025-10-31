"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const blueAdvantages = [
  { emoji: "😎", text: "No more deadlines stress" },
  { emoji: "🎓", text: "Perfect grades, zero work" },
  { emoji: "🎉", text: "Party all semester" },
  { emoji: "😴", text: "Sleep whenever you want" },
  { emoji: "✨", text: "Chill & crush it" },
];

const redDisadvantages = [
  { emoji: "😫", text: "All-nighters every week" },
  { emoji: "😰", text: "Constant panic mode" },
  { emoji: "🚫", text: "No time for fun" },
  { emoji: "💀", text: "Exhausted & broke" },
  { emoji: "📚", text: "Drowning in work" },
];

export default function MatrixLanding() {
  const router = useRouter();
  const [selectedPill, setSelectedPill] = useState<"blue" | null>(null);

  const handleBluePill = () => {
    setSelectedPill("blue");
    setTimeout(() => router.push("/login"), 800);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h1 className="text-4xl sm:text-5xl font-bold text-center mb-2 sm:mb-4">ASSIGNLY</h1>
        <p className="text-center text-gray-600 text-base sm:text-lg mb-12 sm:mb-16">
          Choose your reality
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          {/* Blue Pill - Advantages (Good Choice) */}
          <div className="p-8 sm:p-12 bg-blue-50 rounded-lg border-2 border-blue-200 hover:border-[#3B82F6] transition-all">
            <div className="mb-6 sm:mb-8 flex justify-center h-32 sm:h-40 relative">
              {/* Placeholder for hand image - replace with actual image when available */}
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] shadow-xl" />
              {/* TODO: Add hand image here when available from image AI */}
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-[#3B82F6]">
              BLUE 💙
            </h2>

            <div className="space-y-3 sm:space-y-4">
              {blueAdvantages.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-lg sm:text-xl">{item.emoji}</span>
                  <p className="font-semibold text-blue-900 text-sm sm:text-base">{item.text}</p>
                </div>
              ))}
            </div>

            <Button
              onClick={handleBluePill}
              className={cn(
                "w-full mt-8 sm:mt-12 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold py-2 sm:py-3 rounded-lg transition text-sm sm:text-base",
                selectedPill === "blue" && "animate-pulse scale-105"
              )}
            >
              Take the Blue Pill
            </Button>
          </div>

          {/* Red Pill - Disadvantages (Bad Choice) */}
          <div className="p-8 sm:p-12 bg-red-50 rounded-lg border-2 border-red-200 opacity-75">
            <div className="mb-6 sm:mb-8 flex justify-center h-32 sm:h-40 relative">
              {/* Placeholder for hand image - replace with actual image when available */}
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-red-400 to-red-600 opacity-75 shadow-lg" />
              {/* TODO: Add hand image here when available from image AI */}
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-red-600">
              RED 🔴
            </h2>

            <div className="space-y-3 sm:space-y-4">
              {redDisadvantages.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-lg sm:text-xl">{item.emoji}</span>
                  <p className="font-semibold text-red-900 text-sm sm:text-base">{item.text}</p>
                </div>
              ))}
            </div>

            <button
              className="w-full mt-8 sm:mt-12 bg-red-400 text-red-700 font-bold py-2 sm:py-3 rounded-lg transition opacity-50 cursor-not-allowed text-sm sm:text-base"
              disabled
            >
              Take the Red Pill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

