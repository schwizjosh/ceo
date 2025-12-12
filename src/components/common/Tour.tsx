import React from 'react';
import { TourStep } from '../../hooks/useGuidedTour';
import { Button } from './Button';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';

interface TourProps {
  isActive: boolean;
  currentStep: TourStep | null;
  currentStepIndex: number;
  totalSteps: number;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
}

export const Tour: React.FC<TourProps> = ({
  isActive,
  currentStep,
  currentStepIndex,
  totalSteps,
  nextStep,
  previousStep,
  skipTour,
}) => {
  if (!isActive || !currentStep) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="absolute"
        style={{
          top: currentStep.target ? document.querySelector(currentStep.target)?.getBoundingClientRect().top : '50%',
          left: currentStep.target ? document.querySelector(currentStep.target)?.getBoundingClientRect().left : '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          className="relative rounded-lg bg-white p-6 shadow-2xl"
          style={{
            width: '300px',
          }}
        >
          <button
            onClick={skipTour}
            className="absolute top-2 right-2 p-1 text-slate-500 hover:text-slate-700"
          >
            <X size={18} />
          </button>
          <h3 className="text-lg font-bold mb-2">{currentStep.title}</h3>
          <p className="text-sm text-slate-600 mb-4">{currentStep.content}</p>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">
              {currentStepIndex + 1} / {totalSteps}
            </span>
            <div className="flex gap-2">
              {currentStepIndex > 0 && (
                <Button onClick={previousStep} variant="outline" size="sm">
                  <ArrowLeft size={16} className="mr-1" />
                  Prev
                </Button>
              )}
              <Button onClick={nextStep} size="sm">
                {currentStepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
                <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
