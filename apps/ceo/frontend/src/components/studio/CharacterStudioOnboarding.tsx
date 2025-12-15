/**
 * Character Studio Onboarding Component
 *
 * 3-slide animated onboarding flow for first-time users
 */

import React, { useState } from 'react';
import { PyAvatar } from './PyAvatar';
import { AndoraSpeechBubble } from './AndoraSpeechBubble';
import { Button } from '../common/Button';
import { ChevronRight, ChevronLeft, Sparkles, Users, Wand2 } from 'lucide-react';

interface CharacterStudioOnboardingProps {
  onComplete: () => void;
}

export const CharacterStudioOnboarding: React.FC<CharacterStudioOnboardingProps> = ({
  onComplete
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Welcome to Character Studio",
      icon: <Sparkles size={48} className="text-primary-500" />,
      content: (
        <>
          <p className="text-lg mb-3">
            Hi! I'm <span className="font-semibold text-purple-600">Andora</span>, your brand storytelling assistant.
          </p>
          <p className="mb-3">
            Think of your brand as a <span className="font-semibold">TV series</span>, and the people working at your brand as the <span className="font-semibold">cast</span>.
          </p>
          <p className="text-slate-600">
            Just like viewers connect with different characters in their favorite shows, your audience will connect with different people on your team.
          </p>
        </>
      )
    },
    {
      title: "Build Your Cast",
      icon: <Users size={48} className="text-primary-400" />,
      content: (
        <>
          <p className="text-lg mb-3">
            Here's how we'll work <span className="font-semibold text-pink-600">together</span>:
          </p>
          <ul className="space-y-3 text-slate-700">
            <li className="flex items-start">
              <span className="mr-2 text-primary-500">✓</span>
              <span><span className="font-semibold">You provide</span> the raw facts: names, roles, quirks, backstories</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-primary-500">✓</span>
              <span><span className="font-semibold">I weave</span> them into compelling personas that resonate emotionally</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-primary-500">✓</span>
              <span><span className="font-semibold">You mark fields perfect</span> when they capture the essence just right</span>
            </li>
          </ul>
        </>
      )
    },
    {
      title: "When You'll Use Personas",
      icon: <Wand2 size={48} className="text-accent-500" />,
      content: (
        <>
          <p className="text-lg mb-3">
            These personas become the <span className="font-semibold text-rose-600">foundation</span> for all your content:
          </p>
          <ul className="space-y-3 text-slate-700">
            <li className="flex items-start">
              <span className="mr-2">📱</span>
              <span><span className="font-semibold">Social posts</span> - I'll write in their authentic voice</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">📝</span>
              <span><span className="font-semibold">Blog content</span> - Each character drives different storylines</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🎬</span>
              <span><span className="font-semibold">Video scripts</span> - Bringing their personalities to life</span>
            </li>
          </ul>
          <p className="mt-4 text-slate-600 italic">
            The better we craft these personas together, the more compelling your brand story becomes.
          </p>
        </>
      )
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const slide = slides[currentSlide];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-white via-dark-900/60 to-primary-100 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-16 left-12 w-72 h-72 bg-primary-200 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-16 right-16 w-96 h-96 bg-primary-300/70 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Content */}
      <div className="relative max-w-4xl w-full my-auto">
        <div className="relative bg-white/95 backdrop-blur border border-primary-100/70 shadow-2xl rounded-3xl px-6 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 max-h-[85vh] overflow-y-auto">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 via-accent-400 to-primary-400"></div>

          <div className="flex flex-col md:flex-row md:items-start gap-8 md:gap-12">
            <div className="flex flex-col items-center md:items-start">
              <div className="rounded-2xl border border-primary-100 bg-white px-6 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <img src="/andora-logo.png" alt="Andora" className="h-8 w-auto" />
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Character Studio</span>
                </div>
              </div>
            </div>

            <AndoraSpeechBubble className="flex-1">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  {slide.icon}
                  <h2 className="text-2xl font-bold text-slate-800">{slide.title}</h2>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Step {currentSlide + 1} of {slides.length}</span>
              </div>

              {slide.content}
            </AndoraSpeechBubble>
          </div>

          {/* Navigation */}
          <div className="mt-6 sm:mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={handlePrev}
                variant="outline"
                disabled={currentSlide === 0}
                className="flex items-center"
              >
                <ChevronLeft size={16} className="mr-1" />
                Back
              </Button>

              <Button
                onClick={handleNext}
                className="flex items-center"
              >
                {currentSlide === slides.length - 1 ? (
                  <>
                    Enter Studio
                    <Sparkles size={16} className="ml-2" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight size={16} className="ml-1" />
                  </>
                )}
              </Button>
            </div>

            {/* Slide indicators */}
            <div className="flex items-center gap-2 self-center md:self-auto">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentSlide
                      ? 'w-10 bg-primary-600'
                      : 'w-3 bg-primary-200 hover:bg-primary-300'
                  }`}
                  aria-label={`Go to onboarding step ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
