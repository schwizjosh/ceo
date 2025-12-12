import { useState, useEffect, useCallback } from 'react';

export interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  spotlightPadding?: number;
}

export interface TourConfig {
  [page: string]: TourStep[];
}

const TOUR_CONFIG: TourConfig = {
  dashboard: [
    {
      id: 'dashboard-welcome',
      target: '[data-tour="brand-overview"]',
      title: 'Welcome to Your Dashboard',
      content: 'This is your command center. See brand health, recent activity, and quick actions all in one place.',
      placement: 'bottom',
      spotlightPadding: 16
    },
    {
      id: 'dashboard-quick-actions',
      target: '[data-tour="quick-actions"]',
      title: 'Quick Actions',
      content: 'Jump to any section of your brand workspace with these quick action buttons.',
      placement: 'top',
      spotlightPadding: 12
    }
  ],
  config: [
    {
      id: 'config-brand-identity',
      target: '[data-tour="brand-identity"]',
      title: 'Brand Identity',
      content: 'Define your brand\'s core identity: name, tagline, industry, and personality. This guides all AI-generated content.',
      placement: 'right',
      spotlightPadding: 20
    },
    {
      id: 'config-channels',
      target: '[data-tour="channels"]',
      title: 'Content Channels',
      content: 'Select which platforms you publish on. Andora will tailor content for each channel\'s unique format.',
      placement: 'left',
      spotlightPadding: 16
    },
    {
      id: 'config-posting-schedule',
      target: '[data-tour="posting-schedule"]',
      title: 'Posting Schedule',
      content: 'Set which channels you post to on each day of the week. This controls your content calendar generation.',
      placement: 'top',
      spotlightPadding: 16
    }
  ],
  plot: [
    {
      id: 'plot-narrative',
      target: '[data-tour="narrative"]',
      title: 'Brand Narrative',
      content: 'Your brand\'s story foundation. This narrative guides character development and content themes.',
      placement: 'bottom',
      spotlightPadding: 20
    },
    {
      id: 'plot-characters',
      target: '[data-tour="characters"]',
      title: 'Brand Characters',
      content: 'Create AI personas that embody different aspects of your brand. Each character has a unique voice and perspective.',
      placement: 'top',
      spotlightPadding: 16
    },
    {
      id: 'plot-generate-cast',
      target: '[data-tour="generate-cast"]',
      title: 'Generate Characters',
      content: 'Let AI create a full cast of brand characters based on your narrative. You can refine them later.',
      placement: 'left',
      spotlightPadding: 12
    }
  ],
  events: [
    {
      id: 'events-calendar',
      target: '[data-tour="events-calendar"]',
      title: 'Events Calendar',
      content: 'Add important dates, product launches, holidays, and campaigns. Events automatically influence content generation.',
      placement: 'bottom',
      spotlightPadding: 16
    },
    {
      id: 'events-add',
      target: '[data-tour="add-event"]',
      title: 'Add Events',
      content: 'Click here to add new events. Include dates, descriptions, and importance levels to guide content.',
      placement: 'left',
      spotlightPadding: 12
    }
  ],
  season: [
    {
      id: 'season-overview',
      target: '[data-tour="season-overview"]',
      title: 'Seasonal Planning',
      content: 'Plan your content strategy by month. Set themes, plot arcs, and weekly subplots for cohesive storytelling.',
      placement: 'bottom',
      spotlightPadding: 20
    },
    {
      id: 'season-themes',
      target: '[data-tour="monthly-themes"]',
      title: 'Monthly Themes',
      content: 'Each month gets a core theme or message. This creates consistency across all your content.',
      placement: 'right',
      spotlightPadding: 16
    },
    {
      id: 'season-subplots',
      target: '[data-tour="weekly-subplots"]',
      title: 'Weekly Subplots',
      content: 'Break down monthly themes into weekly story arcs. Each week advances your brand narrative.',
      placement: 'top',
      spotlightPadding: 16
    }
  ],
  monthly: [
    {
      id: 'monthly-calendar',
      target: '[data-tour="calendar-grid"]',
      title: 'Your Content Calendar',
      content: 'This is your monthly content at a glance. Each day shows planned posts across all your channels.',
      placement: 'bottom',
      spotlightPadding: 20
    },
    {
      id: 'monthly-generate-week',
      target: '[data-tour="generate-week"]',
      title: 'Generate Content for a Week',
      content: 'Click here to let me generate content for a specific week. I will consider your themes, events, and characters.',
      placement: 'top',
      spotlightPadding: 16
    },
    {
      id: 'monthly-generate-month',
      target: '[data-tour="generate-month"]',
      title: 'Generate Content for a Full Month',
      content: 'Click here to let me generate content for the entire month. I will skip any content that you have marked as perfect.',
      placement: 'top',
      spotlightPadding: 16
    },
    {
      id: 'monthly-embed-events',
      target: '[data-tour="embed-events"]',
      title: 'Embed Your Events',
      content: 'If you have any events that are not yet part of your story, you can embed them here. I will weave them into your weekly subplots.',
      placement: 'top',
      spotlightPadding: 16
    },
    {
      id: 'monthly-model-switcher',
      target: '[data-tour="model-switcher"]',
      title: 'Select Your AI Model',
      content: 'You can choose which AI model I should use. Some are better for creative tasks, while others are faster and more cost-effective.',
      placement: 'left',
      spotlightPadding: 12
    }
  ]
};

const STORAGE_KEY = 'andora-guided-tour-progress';

interface TourProgress {
  [page: string]: {
    completed: boolean;
    currentStep: number;
    dismissed: boolean;
  };
}

export const useGuidedTour = (currentPage: string) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState<TourProgress>({});

  // Load progress from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProgress(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load tour progress:', error);
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback((newProgress: TourProgress) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
      setProgress(newProgress);
    } catch (error) {
      console.error('Failed to save tour progress:', error);
    }
  }, []);

  // Auto-start tour if page not seen before
  useEffect(() => {
    const pageProgress = progress[currentPage];
    const hasSteps = TOUR_CONFIG[currentPage] && TOUR_CONFIG[currentPage].length > 0;

    if (hasSteps && !pageProgress?.completed && !pageProgress?.dismissed) {
      // Delay tour start to allow page to render
      const timer = setTimeout(() => {
        setIsActive(true);
        setCurrentStepIndex(pageProgress?.currentStep || 0);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [currentPage, progress]);

  const steps = TOUR_CONFIG[currentPage] || [];
  const currentStep = steps[currentStepIndex];

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      const newIndex = currentStepIndex + 1;
      setCurrentStepIndex(newIndex);

      // Save progress
      const newProgress = {
        ...progress,
        [currentPage]: {
          completed: false,
          currentStep: newIndex,
          dismissed: false
        }
      };
      saveProgress(newProgress);
    } else {
      // Tour completed
      const newProgress = {
        ...progress,
        [currentPage]: {
          completed: true,
          currentStep: 0,
          dismissed: false
        }
      };
      saveProgress(newProgress);
      setIsActive(false);
    }
  }, [currentStepIndex, steps.length, currentPage, progress, saveProgress]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);

      // Save progress
      const newProgress = {
        ...progress,
        [currentPage]: {
          completed: false,
          currentStep: newIndex,
          dismissed: false
        }
      };
      saveProgress(newProgress);
    }
  }, [currentStepIndex, currentPage, progress, saveProgress]);

  const skipTour = useCallback(() => {
    const newProgress = {
      ...progress,
      [currentPage]: {
        completed: false,
        currentStep: 0,
        dismissed: true
      }
    };
    saveProgress(newProgress);
    setIsActive(false);
  }, [currentPage, progress, saveProgress]);

  const restartTour = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);

    const newProgress = {
      ...progress,
      [currentPage]: {
        completed: false,
        currentStep: 0,
        dismissed: false
      }
    };
    saveProgress(newProgress);
  }, [currentPage, progress, saveProgress]);

  const resetAllProgress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProgress({});
    setIsActive(false);
  }, []);

  return {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps: steps.length,
    nextStep,
    previousStep,
    skipTour,
    restartTour,
    resetAllProgress,
    hasSteps: steps.length > 0,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === steps.length - 1
  };
};
