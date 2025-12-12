import React, { useState, useRef, TouchEvent } from 'react';
import { Button } from '../common/Button';
import { Calendar, Clock, Sparkles, Tag, ArrowRight, CheckCircle2 } from 'lucide-react';

const slides = [
  {
    icon: Calendar,
    title: 'Track Your Brand Moments',
    description: 'Events are the heartbeat of your brand storytelling. Add product launches, holidays, campaigns, and milestones that matter.',
    tip: 'Pro tip: Use events as a mini-journal of daily highlights! Track wins, insights, and memorable moments from your brand journey.'
  },
  {
    icon: Clock,
    title: 'Build Your Calendar',
    description: 'Each event becomes a storytelling opportunity. Andora will weave these moments into your monthly themes and daily content.',
    tip: 'Events you add here will automatically influence your content calendar and AI-generated posts.'
  },
  {
    icon: Tag,
    title: 'Add Context & Categories',
    description: 'Tag events by type (launch, holiday, campaign, milestone) to help Andora understand the tone and energy each moment deserves.',
    tip: 'Daily journaling tip: Quick notes like "Client loved the pitch!" or "Hit 1K followers" become content gold when Andora weaves them into your narrative.'
  },
  {
    icon: Sparkles,
    title: 'Let Andora Do the Rest',
    description: 'Once your events are set, Andora crafts narratives around these moments—building anticipation, celebrating, and reflecting automatically.',
    tip: 'Your events become story arcs that unfold across all your channels.'
  }
];

interface EventsOnboardingProps {
  onComplete: () => void;
}

export const EventsOnboarding: React.FC<EventsOnboardingProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentSlide < slides.length - 1) {
      handleNext();
    }

    if (isRightSwipe && currentSlide > 0) {
      handlePrev();
    }
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleFinish = () => {
    // Scroll to top before completing
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  const currentContent = slides[currentSlide];
  const Icon = currentContent.icon;

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        ref={containerRef}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-300"
            style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8 sm:p-12 pt-12 sm:pt-16">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-100">
              <Icon className="w-12 h-12 text-primary-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 mb-4">
            {currentContent.title}
          </h2>

          {/* Description */}
          <p className="text-base sm:text-lg text-slate-600 text-center mb-6 leading-relaxed">
            {currentContent.description}
          </p>

          {/* Tip box */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-8">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900 mb-1">Pro Tip</p>
                <p className="text-sm text-amber-800">{currentContent.tip}</p>
              </div>
            </div>
          </div>

          {/* Navigation dots */}
          <div className="flex justify-center space-x-2 mb-8">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'w-8 bg-gradient-to-r from-primary-500 to-secondary-500'
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            {currentSlide > 0 && (
              <Button
                variant="outline"
                onClick={handlePrev}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Previous
              </Button>
            )}

            {currentSlide < slides.length - 1 ? (
              <Button
                onClick={handleNext}
                className="w-full sm:w-auto order-1 sm:order-2 ml-auto flex items-center justify-center"
              >
                Next
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                className="w-full sm:w-auto order-1 sm:order-2 ml-auto bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 flex items-center justify-center"
              >
                <CheckCircle2 className="mr-2 w-4 h-4" />
                Start Adding Events
              </Button>
            )}
          </div>

          {/* Skip option */}
          <div className="text-center mt-6">
            <button
              onClick={handleFinish}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Skip tutorial
            </button>
          </div>
        </div>

        {/* Swipe hint for mobile */}
        <div className="absolute bottom-4 left-0 right-0 text-center sm:hidden">
          <p className="text-xs text-slate-400">Swipe to navigate</p>
        </div>
      </div>
    </div>
  );
};
