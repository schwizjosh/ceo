import React, { useState, useRef, TouchEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { Feather, Calendar, Sparkles } from 'lucide-react';

const slides = [
  {
    icon: Feather,
    title: 'Your Brand Voice, Mastered',
    description: 'Andora learns how your brand sounds and writes content that feels authentically yours across every channel.'
  },
  {
    icon: Calendar,
    title: 'Content Calendar Made Simple',
    description: 'Set monthly themes and key moments. Andora builds your complete content calendar automatically.'
  },
  {
    icon: Sparkles,
    title: 'Ready to Publish, Every Time',
    description: 'Generate on-brand posts, campaigns, and stories for all your platforms in minutes, not hours.'
  }
];

export const AppOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px)
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
      setCurrentSlide(prev => prev + 1);
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleGetStarted = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    navigate('/login');
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    navigate('/login');
  };

  const CurrentIcon = slides[currentSlide].icon;

  return (
    <div className="relative flex h-screen flex-col bg-gradient-to-b from-white via-slate-50 to-slate-100 overflow-hidden">
      {/* Skip button */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <button
          onClick={handleSkip}
          className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Main content */}
      <div
        ref={containerRef}
        className="flex-1 flex flex-col items-center justify-center px-6 py-12"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Logo */}
        <div className="mb-12 text-center">
          <div className="inline-flex flex-col items-center gap-3 rounded-3xl border border-white/60 bg-white/80 px-10 py-6 shadow-lg backdrop-blur">
            <img src="/andora-logo.png" alt="Andora" className="h-10 w-auto" />
            <span className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Story Intelligence</span>
          </div>
        </div>

        {/* Slide content */}
        <div className="max-w-md w-full text-center space-y-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center">
              <CurrentIcon className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2 className="font-display text-3xl font-semibold text-slate-900">
            {slides[currentSlide].title}
          </h2>

          {/* Description */}
          <p className="text-lg text-slate-600 leading-relaxed">
            {slides[currentSlide].description}
          </p>
        </div>

        {/* Pagination dots */}
        <div className="mt-12 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'w-8 bg-slate-900'
                  : 'w-2 bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Bottom action */}
      <div className="px-6 pb-8">
        {currentSlide === slides.length - 1 ? (
          <Button
            size="lg"
            onClick={handleGetStarted}
            className="w-full"
          >
            Get started
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={() => setCurrentSlide(prev => prev + 1)}
            className="w-full"
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
};
