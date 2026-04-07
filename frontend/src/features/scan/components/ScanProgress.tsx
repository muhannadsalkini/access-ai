"use client";

import { useEffect, useState } from "react";

const stages = [
  { key: "scanning", label: "Scanning website", description: "Loading page and running accessibility checks..." },
  { key: "analyzing", label: "AI Analysis", description: "Classifying issues and generating recommendations..." },
  { key: "completed", label: "Complete", description: "Your report is ready!" },
];

export default function ScanProgress() {
  const [currentStage, setCurrentStage] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    // Progress through stages (simulated timing)
    const timer1 = setTimeout(() => setCurrentStage(1), 5000);
    const timer2 = setTimeout(() => setCurrentStage(2), 15000);

    return () => {
      clearInterval(dotsInterval);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto py-12">
      <div className="text-center mb-8">
        {/* Animated spinner */}
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
        <h3 className="text-xl font-semibold text-gray-900">
          {stages[currentStage].label}{dots}
        </h3>
        <p className="text-gray-500 mt-2">{stages[currentStage].description}</p>
      </div>

      {/* Progress steps */}
      <div className="space-y-4">
        {stages.map((stage, index) => (
          <div key={stage.key} className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index < currentStage
                  ? "bg-green-100 text-green-600"
                  : index === currentStage
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {index < currentStage ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={`text-sm ${
                index <= currentStage ? "text-gray-900 font-medium" : "text-gray-400"
              }`}
            >
              {stage.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
