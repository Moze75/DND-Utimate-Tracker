import React from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export default function ProgressBar({ currentStep, totalSteps, steps }: ProgressBarProps) {
  const total = Math.max(1, totalSteps); // évite la division par 0 si jamais
  const percent = Math.max(0, Math.min(100, (currentStep / total) * 100));

  return (
    <div className="w-full mb-8">
      {/* Barre de progression */}
      <div className="w-full bg-gray-800 rounded-full h-2" aria-hidden="true">
        <div
          className="bg-gradient-to-r from-red-600 to-red-700 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          role="progressbar"
        />
      </div>

      {/* Libellés d'étapes: wrap + gaps + scroll horizontal si trop serré */}
      <div className="mt-3 text-xs sm:text-sm text-gray-400 overflow-x-auto">
        <ol className="flex flex-wrap sm:flex-nowrap items-center gap-x-4 sm:gap-x-6 gap-y-2 whitespace-nowrap">
          {steps.map((step, index) => {
            const isDone = index < currentStep;
            const isCurrent = index === currentStep;
            const dotClass = isDone
              ? 'bg-red-600'
              : isCurrent
                ? 'bg-red-500 animate-pulse'
                : 'bg-gray-600';

            const textClass = isDone
              ? 'text-red-400'
              : isCurrent
                ? 'text-gray-200'
                : 'text-gray-500';

            return (
              <li key={index} className="flex items-center gap-2 shrink-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${dotClass}`}
                  aria-hidden="true"
                />
                <span className={`transition-colors ${textClass}`}>
                  {step}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
} 