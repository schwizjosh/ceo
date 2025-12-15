import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles, PartyPopper } from 'lucide-react';
import { Brand, Event } from '../../types';

interface GettingStartedChecklistProps {
  brand: Brand | null;
  events: Event[];
  onNavigate?: (page: string) => void;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  link: string;
}

export const GettingStartedChecklist: React.FC<GettingStartedChecklistProps> = ({
  brand,
  events,
  onNavigate
}) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const milestones: Milestone[] = useMemo(() => {
    if (!brand) {
      return [
        {
          id: 'brand-identity',
          title: 'Set up Brand Identity',
          description: 'Define your brand name, tagline, industry, and personality',
          completed: false,
          link: '/config'
        },
        {
          id: 'brand-narrative',
          title: 'Define Brand Narrative',
          description: 'Craft your brand story and core message',
          completed: false,
          link: '/plot'
        },
        {
          id: 'characters',
          title: 'Create Characters',
          description: 'Generate AI brand personas to embody your voice',
          completed: false,
          link: '/plot'
        },
        {
          id: 'events',
          title: 'Add Events',
          description: 'Track important dates, launches, and campaigns',
          completed: false,
          link: '/events'
        },
        {
          id: 'monthly-theme',
          title: 'Plan Monthly Themes',
          description: 'Set content themes for cohesive storytelling',
          completed: false,
          link: '/season'
        },
        {
          id: 'first-content',
          title: 'Generate First Content',
          description: 'Create your first AI-powered content piece',
          completed: false,
          link: '/monthly'
        }
      ];
    }

    // Check brand identity
    const hasBrandIdentity = Boolean(
      brand.brand_name &&
      brand.tagline &&
      brand.industry &&
      brand.brand_personality
    );

    // Check brand narrative
    const hasBrandNarrative = Boolean(
      brand.brand_narrative &&
      brand.brand_narrative.trim().length > 50
    );

    // Check characters
    const hasCharacters = Boolean(
      brand.cast_management &&
      brand.cast_management.length >= 1
    );

    // Check events
    const hasEvents = events.length > 0;

    // Check monthly themes
    const hasMonthlyThemes = Boolean(
      brand.monthly_themes &&
      Object.keys(brand.monthly_themes).length > 0
    );

    // Check first content
    const hasContent = Boolean(
      brand.monthly_calendars &&
      Object.values(brand.monthly_calendars).some(
        calendar => calendar && Array.isArray(calendar.items) && calendar.items.length > 0
      )
    );

    return [
      {
        id: 'brand-identity',
        title: 'Set up Brand Identity',
        description: 'Define your brand name, tagline, industry, and personality',
        completed: hasBrandIdentity,
        link: '/config'
      },
      {
        id: 'brand-narrative',
        title: 'Define Brand Narrative',
        description: 'Craft your brand story and core message',
        completed: hasBrandNarrative,
        link: '/plot'
      },
      {
        id: 'characters',
        title: 'Create Characters',
        description: 'Generate AI brand personas to embody your voice',
        completed: hasCharacters,
        link: '/plot'
      },
      {
        id: 'events',
        title: 'Add Events',
        description: 'Track important dates, launches, and campaigns',
        completed: hasEvents,
        link: '/events'
      },
      {
        id: 'monthly-theme',
        title: 'Plan Monthly Themes',
        description: 'Set content themes for cohesive storytelling',
        completed: hasMonthlyThemes,
        link: '/season'
      },
      {
        id: 'first-content',
        title: 'Generate First Content',
        description: 'Create your first AI-powered content piece',
        completed: hasContent,
        link: '/monthly'
      }
    ];
  }, [brand, events]);

  const completedCount = milestones.filter(m => m.completed).length;
  const totalCount = milestones.length;
  const progressPercentage = (completedCount / totalCount) * 100;
  const isComplete = completedCount === totalCount;

  const handleMilestoneClick = (link: string) => {
    if (onNavigate) {
      onNavigate(link.replace('/', ''));
    } else {
      navigate(link);
    }
  };

  return (
    <div className="glass-effect rounded-xl border border-primary-500/20 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* Circular progress indicator */}
            <svg className="w-12 h-12 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-slate-200"
              />
              {/* Progress circle */}
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - progressPercentage / 100)}`}
                className={`transition-all duration-500 ${
                  isComplete ? 'text-green-500' : 'text-orange-500'
                }`}
                strokeLinecap="round"
              />
            </svg>
            {/* Percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isComplete ? (
                <Sparkles size={20} className="text-green-500" />
              ) : (
                <span className="text-xs font-bold text-slate-700">
                  {Math.round(progressPercentage)}%
                </span>
              )}
            </div>
          </div>

          <div className="text-left">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              Getting Started
              {isComplete && <PartyPopper size={18} className="text-green-500" />}
            </h3>
            <p className="text-sm text-slate-600">
              {isComplete ? (
                'All set! You\'re ready to create amazing content'
              ) : (
                `${completedCount} of ${totalCount} milestones completed`
              )}
            </p>
          </div>
        </div>

        {isCollapsed ? (
          <ChevronDown size={20} className="text-slate-400" />
        ) : (
          <ChevronUp size={20} className="text-slate-400" />
        )}
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="border-t border-slate-100">
          {/* Progress bar */}
          <div className="px-4 pt-3 pb-2">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isComplete
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                    : 'bg-gradient-to-r from-orange-400 to-pink-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Celebration message */}
          {isComplete && (
            <div className="px-4 py-3 mx-4 mb-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 flex items-center gap-2">
                <Sparkles size={16} className="text-green-500" />
                Congratulations! You've completed all setup milestones. Start generating content!
              </p>
            </div>
          )}

          {/* Milestones list */}
          <div className="px-4 pb-4 space-y-2">
            {milestones.map((milestone) => (
              <button
                key={milestone.id}
                onClick={() => handleMilestoneClick(milestone.link)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                  milestone.completed
                    ? 'bg-green-50 hover:bg-green-100 border border-green-200'
                    : 'bg-white hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {milestone.completed ? (
                    <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle size={20} className="text-slate-300 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`text-sm font-medium ${
                        milestone.completed ? 'text-green-900' : 'text-slate-900'
                      }`}
                    >
                      {milestone.title}
                    </h4>
                    <p
                      className={`text-xs mt-0.5 ${
                        milestone.completed ? 'text-green-600' : 'text-slate-500'
                      }`}
                    >
                      {milestone.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
