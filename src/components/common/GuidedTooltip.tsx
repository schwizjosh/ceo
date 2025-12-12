import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { TourStep } from '../../hooks/useGuidedTour';

interface GuidedTooltipProps {
  step: TourStep;
  currentStepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const GuidedTooltip: React.FC<GuidedTooltipProps> = ({
  step,
  currentStepIndex,
  totalSteps,
  isFirstStep,
  isLastStep,
  onNext,
  onPrevious,
  onSkip
}) => {
  const [targetPosition, setTargetPosition] = useState<Position | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      const targetElement = document.querySelector(step.target);
      if (!targetElement) {
        console.warn(`Tour target not found: ${step.target}`);
        return;
      }

      // Scroll target into view
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });

      // Get target position
      const rect = targetElement.getBoundingClientRect();
      const padding = step.spotlightPadding || 16;

      setTargetPosition({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2
      });

      // Calculate tooltip position based on placement
      if (tooltipRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const spacing = 20; // Space between spotlight and tooltip
        let top = 0;
        let left = 0;

        switch (step.placement) {
          case 'top':
            top = rect.top - tooltipRect.height - spacing - padding;
            left = rect.left + rect.width / 2 - tooltipRect.width / 2;
            break;
          case 'bottom':
            top = rect.bottom + spacing + padding;
            left = rect.left + rect.width / 2 - tooltipRect.width / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2 - tooltipRect.height / 2;
            left = rect.left - tooltipRect.width - spacing - padding;
            break;
          case 'right':
            top = rect.top + rect.height / 2 - tooltipRect.height / 2;
            left = rect.right + spacing + padding;
            break;
        }

        // Keep tooltip within viewport
        const maxLeft = window.innerWidth - tooltipRect.width - 20;
        const maxTop = window.innerHeight - tooltipRect.height - 20;
        left = Math.max(20, Math.min(left, maxLeft));
        top = Math.max(20, Math.min(top, maxTop));

        setTooltipPosition({ top, left });
      }
    };

    // Update position after a short delay to allow DOM to settle
    const timer = setTimeout(updatePosition, 100);

    // Update on resize or scroll
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [step, currentStepIndex]);

  if (!targetPosition) {
    return null;
  }

  return (
    <>
      {/* Backdrop with spotlight */}
      <div
        className="fixed inset-0 z-[9999] pointer-events-none"
        style={{ isolation: 'isolate' }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

        {/* SVG spotlight with animated pulse */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ mixBlendMode: 'normal' }}
        >
          <defs>
            <mask id="spotlight-mask">
              {/* White background */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Black cutout for spotlight */}
              <rect
                x={targetPosition.left}
                y={targetPosition.top}
                width={targetPosition.width}
                height={targetPosition.height}
                rx="12"
                fill="black"
              />
            </mask>

            {/* Gradient for pulsing border */}
            <radialGradient id="pulse-gradient" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgb(251, 146, 60)" stopOpacity="0.8">
                <animate
                  attributeName="stop-opacity"
                  values="0.8;0.4;0.8"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="100%" stopColor="rgb(251, 146, 60)" stopOpacity="0">
                <animate
                  attributeName="stop-opacity"
                  values="0;0.2;0"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </stop>
            </radialGradient>
          </defs>

          {/* Apply mask to darken everything except spotlight */}
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(15, 23, 42, 0.75)"
            mask="url(#spotlight-mask)"
          />

          {/* Animated pulsing border around spotlight */}
          <rect
            x={targetPosition.left - 4}
            y={targetPosition.top - 4}
            width={targetPosition.width + 8}
            height={targetPosition.height + 8}
            rx="14"
            fill="none"
            stroke="url(#pulse-gradient)"
            strokeWidth="3"
            className="animate-pulse"
          />

          {/* Solid border for definition */}
          <rect
            x={targetPosition.left}
            y={targetPosition.top}
            width={targetPosition.width}
            height={targetPosition.height}
            rx="12"
            fill="none"
            stroke="rgb(251, 146, 60)"
            strokeWidth="2"
            opacity="0.6"
          />
        </svg>
      </div>

      {/* Tooltip */}
      {tooltipPosition && (
        <div
          ref={tooltipRef}
          className="fixed z-[10000] pointer-events-auto"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-orange-200 max-w-sm w-screen mx-4 sm:mx-0 sm:w-96">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 text-lg mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600">
                  {step.content}
                </p>
              </div>
              <button
                onClick={onSkip}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors ml-2"
                title="Skip tour"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 rounded-b-xl flex items-center justify-between">
              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalSteps }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentStepIndex
                        ? 'w-6 bg-orange-500'
                        : index < currentStepIndex
                        ? 'w-1.5 bg-orange-300'
                        : 'w-1.5 bg-slate-300'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-2">
                {!isFirstStep && (
                  <button
                    onClick={onPrevious}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                  >
                    <ChevronLeft size={14} />
                    Back
                  </button>
                )}

                {isLastStep ? (
                  <button
                    onClick={onNext}
                    className="px-4 py-1.5 text-sm font-medium bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-lg transition-colors"
                  >
                    Got it!
                  </button>
                ) : (
                  <button
                    onClick={onNext}
                    className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-lg transition-colors"
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Step counter */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded-full shadow-lg">
                {currentStepIndex + 1} of {totalSteps}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
