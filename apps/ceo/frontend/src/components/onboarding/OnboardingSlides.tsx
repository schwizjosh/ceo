import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { PyAvatar } from '../common/PyAvatar';
import { NotificationBubble } from '../common/NotificationBubble';
import { User } from '../../types';
import { ChevronRight, Sparkles, Target, Users, Calendar, MessageCircle, Wand2 } from 'lucide-react';

interface OnboardingSlidesProps {
  user: User;
  userName?: string;
  onComplete: () => void;
}

const slides = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Welcome!',
    message: (name: string) => `Hello ${name}! I'm thrilled to help you craft compelling brand narratives that truly resonate with your audience.`,
    highlight: 'Let me show you around your storytelling workspace!'
  },
  {
    id: 'config',
    icon: Target,
    title: 'Brand Configuration',
    message: () => 'First, we\'ll set up your brand\'s core identity - your mission, vision, values, and unique voice. This becomes the foundation for all your storytelling.',
    highlight: 'Think of this as your brand\'s DNA - everything flows from here!'
  },
  {
    id: 'plot',
    icon: Users,
    title: 'Story & Characters',
    message: () => 'Next, we\'ll create your brand narrative using a proven story framework and develop a cast of characters who will bring your story to life across all channels.',
    highlight: 'Every great brand has compelling characters and a clear story arc!'
  },
  {
    id: 'events',
    icon: Calendar,
    title: 'Events Calendar',
    message: () => 'Track important dates, product launches, and milestones. I\'ll help you weave these events into your ongoing narrative for maximum impact.',
    highlight: 'Your calendar becomes part of your story timeline!'
  },
  {
    id: 'season',
    icon: Wand2,
    title: 'Season Planning',
    message: () => 'Create strategic monthly themes and weekly content focus areas. I\'ll help you plan cohesive storytelling campaigns that build momentum over time.',
    highlight: 'Think in seasons - each month tells part of your bigger story!'
  },
  {
    id: 'monthly',
    icon: Calendar,
    title: 'Content Calendar',
    message: () => 'Generate detailed monthly content calendars with specific post ideas, briefs, and strategic messaging - all aligned with your brand story.',
    highlight: 'From strategy to execution - I\'ll help you every step of the way!'
  },
  {
    id: 'chat',
    icon: MessageCircle,
    title: 'AI Chat Assistant',
    message: () => 'Whenever you need help, just chat with me! I have complete knowledge of your brand and can help with content ideas, strategy, and storytelling guidance.',
    highlight: 'I\'m always here to help bring your brand story to life!'
  },
  {
    id: 'ready',
    icon: Sparkles,
    title: 'Ready to Begin!',
    message: (name: string) => `${name}, you now have everything you need to create compelling brand stories that connect with your audience. Let\'s start building something amazing together!`,
    highlight: 'Your storytelling journey begins now!'
  }
];

export const OnboardingSlides: React.FC<OnboardingSlidesProps> = ({
  user,
  userName = 'there',
  onComplete
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const currentSlideData = slides[currentSlide];
  const Icon = currentSlideData.icon;

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSlide(prev => prev + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      // Create a default brand when onboarding completes
      onComplete();
    }
  };

  const skipOnboarding = () => {
    onComplete();
  };

  // Auto-advance first slide after 3 seconds
  useEffect(() => {
    if (currentSlide === 0) {
      const timer = setTimeout(() => {
        nextSlide();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentSlide]);

  return (
    <div className="min-h-screen relative floating-particles flex items-center justify-center p-6 bg-gradient-to-br from-primary-100/40 via-white to-accent-100/30">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl animate-drift" />
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-drift" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-accent-500/5 rounded-full blur-3xl animate-drift" style={{ animationDelay: '4s' }} />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-500">Getting Started</span>
            <span className="text-sm text-slate-500">{currentSlide + 1} of {slides.length}</span>
          </div>
          <div className="w-full bg-white/70 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-primary-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'}`}>
          <div className="glass-effect p-8 rounded-2xl border border-primary-500/30 text-center">
            {/* Avatar */}
            <div className="flex justify-center items-center mb-6">
              <PyAvatar size="xl" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold shimmer-text mb-4">
              {currentSlideData.title}
            </h1>

            {/* Message Bubble */}
            <div className="mb-6">
              <NotificationBubble
                message={currentSlideData.message(userName)}
                type="info"
                className="mx-auto max-w-lg"
              />
            </div>

            {/* Highlight */}
            <div className="neural-glow p-4 rounded-lg mb-8 border border-accent-500/30">
              <div className="flex items-center justify-center space-x-2">
                <Sparkles className="w-5 h-5 text-accent-400" />
                <p className="text-accent-300 font-medium">{currentSlideData.highlight}</p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <Button
                variant="ghost"
                onClick={skipOnboarding}
                className="text-slate-500 hover:text-primary-800"
              >
                Skip Tour
              </Button>

              <Button
                onClick={nextSlide}
                className="flex items-center"
                size="lg"
              >
                {currentSlide === slides.length - 1 ? (
                  <>
                    <Sparkles size={20} className="mr-2" />
                    Let's Begin!
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight size={20} className="ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center space-x-4 text-sm text-slate-500">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
              <span>Plan: {user.plan}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-accent-400 rounded-full animate-pulse" />
              <span>Tokens: {user.tokens}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};