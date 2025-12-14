import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Brand, Event, ContentCalendar, ContentItem } from '../../types';
import { Button } from '../common/Button';
import { ContentCalendarGrid } from '../monthly/ContentCalendarGrid';
import { RefineModal } from '../monthly/RefineModal';
import { ContentDayView } from '../monthly/ContentDayView';
import {
  CalendarDays,
  Wand2,
  PauseCircle,
  PlayCircle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { PyAvatar } from '../common/PyAvatar';
import { PyNotification } from '../common/PyNotification';
import { aiService } from '../../services/aiService';
import { AIModelSwitcher, AIModel } from '../common/AIModelSwitcher';
import { useAIModelPreference, setStoredAIModel } from '../../hooks/useAIModelPreference';

interface MonthlyPageProps {
  brand: Brand;
  events: Event[];
  onBrandUpdate: (updates: Partial<Brand>) => void;
  preferredModel?: string;
  canEdit?: boolean;
}

type GenerationStatus = 'idle' | 'running' | 'paused' | 'completed';
type GenerationLogEntry = {
  date: string;
  week: number;
  status: 'pending' | 'generating' | 'complete' | 'error';
  message: string;
};

const dayIndexMap: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

const defaultPreferredDays = ['monday', 'wednesday', 'friday'];

const AVAILABLE_MODELS: readonly AIModel[] = ['gpt-5', 'gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4.5', 'claude-haiku-3.5'];
const DEFAULT_MODEL: AIModel = 'gpt-4o';

const isAIModel = (value?: string): value is AIModel => {
  if (!value) return false;
  return (AVAILABLE_MODELS as readonly string[]).includes(value);
};

const toDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekOfMonth = (dateString: string) => {
  const date = new Date(dateString + 'T00:00:00');
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const adjusted = dayOfMonth + start.getDay() - 1;
  return Math.floor(adjusted / 7) + 1;
};

const buildWeeklySubplotBrief = (weekPlan?: { subplot?: string | null; custom_theme?: string | null }) => {
  const subplot = weekPlan?.subplot?.trim();
  if (subplot && subplot.length > 0) {
    return [
      'Cinematic weekly brief:',
      subplot,
      'Translate each beat into emotionally-charged, cinematic content moments that keep the audience glued to the story every single day.'
    ].join('\n\n');
  }

  return weekPlan?.custom_theme?.trim() || '';
};

const buildWeeklySchedule = (month: string, frequency: number, preferredDays: string[]) => {
  if (!month) return {} as Record<number, string[]>;

  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
    return {} as Record<number, string[]>;
  }

  const effectiveDays = preferredDays.length ? preferredDays : defaultPreferredDays;
  const effectiveIndexes = effectiveDays
    .map(day => dayIndexMap[day.toLowerCase()])
    .filter((value): value is number => value !== undefined);

  const orderMap = effectiveIndexes.reduce<Record<number, number>>((acc, day, index) => {
    acc[day] = index;
    return acc;
  }, {});

  const result: Record<number, string[]> = {};
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const normalizedFrequency = Math.max(0, frequency);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const current = new Date(year, monthIndex, day);
    const dayIndex = current.getDay();
    if (effectiveIndexes.length && !effectiveIndexes.includes(dayIndex)) continue;

    const dateString = toDateString(current);
    const weekNumber = getWeekOfMonth(dateString);
    result[weekNumber] = result[weekNumber] || [];
    result[weekNumber].push(dateString);
  }

  Object.keys(result).forEach((weekKey) => {
    const week = Number(weekKey);
    const weekDates = result[week] || [];
    if (!weekDates.length) return;

    if (normalizedFrequency === 0) {
      result[week] = [];
      return;
    }

    const sorted = [...weekDates].sort((a, b) => {
      const dateA = new Date(a + 'T00:00:00');
      const dateB = new Date(b + 'T00:00:00');
      const orderA = orderMap[dateA.getDay()] ?? 99;
      const orderB = orderMap[dateB.getDay()] ?? 99;
      if (orderA === orderB) {
        return dateA.getDate() - dateB.getDate();
      }
      return orderA - orderB;
    });

    result[week] = sorted.slice(0, normalizedFrequency);
  });

  return result;
};

const formatLogLabel = (dateString: string) => {
  return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

export const MonthlyPage: React.FC<MonthlyPageProps> = ({
  brand,
  events,
  onBrandUpdate,
  preferredModel,
  canEdit = true
}) => {
  const initialModel = isAIModel(preferredModel) ? (preferredModel as AIModel) : DEFAULT_MODEL;
  const [selectedModel, setSelectedModel] = useAIModelPreference(initialModel);

  useEffect(() => {
    if (isAIModel(preferredModel)) {
      setStoredAIModel(preferredModel as AIModel);
    }
  }, [preferredModel]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDayItems, setSelectedDayItems] = useState<ContentItem[]>([]);
  const [contentForRefinement, setContentForRefinement] = useState<ContentItem | null>(null);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);

  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
  const [generationLog, setGenerationLog] = useState<GenerationLogEntry[]>([]);
  const [generationQueue, setGenerationQueue] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [currentRunTotal, setCurrentRunTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPyNotification, setShowPyNotification] = useState(false);
  const [andoraMessage, setAndoraMessage] = useState('');

  const processingRef = useRef(false);

  const currentCalendar = brand.monthly_calendars[selectedMonth];
  const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const monthEvents = useMemo(() => {
    return events.filter(event => event.event_date.startsWith(selectedMonth));
  }, [events, selectedMonth]);

  const preferredDays = useMemo(
    () => (brand.preferred_posting_days || []).map(day => day.toLowerCase()),
    [brand.preferred_posting_days]
  );

  const weeklySchedule = useMemo(
    () => buildWeeklySchedule(selectedMonth, brand.posting_frequency, preferredDays),
    [selectedMonth, brand.posting_frequency, preferredDays]
  );

  const allWeeks = useMemo(
    () => Object.keys(weeklySchedule)
      .map(Number)
      .filter(week => (weeklySchedule[week] || []).length)
      .sort((a, b) => a - b),
    [weeklySchedule]
  );

  const getScheduledChannelsForDate = useCallback((date: string) => {
    const dateObj = new Date(date + 'T12:00:00Z');
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase() as
      | 'monday'
      | 'tuesday'
      | 'wednesday'
      | 'thursday'
      | 'friday'
      | 'saturday'
      | 'sunday';

    const scheduled = brand.channel_schedule?.[dayOfWeek];
    if (scheduled && scheduled.length) {
      return Array.from(new Set(scheduled));
    }

    return Array.from(new Set(brand.channels && brand.channels.length ? brand.channels : ['LinkedIn']));
  }, [brand.channel_schedule, brand.channels]);

  const getGenerationPlanForDate = useCallback((date: string) => {
    const scheduledChannels = getScheduledChannelsForDate(date);
    const itemsForDate = (currentCalendar?.items || []).filter(item => item.date === date);

    const channelsToGenerate = scheduledChannels.filter(channel => {
      const existing = itemsForDate.find(item => item.channel === channel);
      return !existing || !existing.is_perfect;
    });

    const preservedItems = itemsForDate.filter(item => item.is_perfect || !scheduledChannels.includes(item.channel));

    return {
      scheduledChannels,
      channelsToGenerate,
      preservedItems,
      itemsForDate,
    };
  }, [currentCalendar, getScheduledChannelsForDate]);

  const weekCompletion = useMemo(() => {
    return allWeeks.reduce<Record<number, boolean>>((acc, week) => {
      const dates = weeklySchedule[week] || [];
      acc[week] = dates.length
        ? dates.every(date => getGenerationPlanForDate(date).channelsToGenerate.length === 0)
        : false;
      return acc;
    }, {} as Record<number, boolean>);
  }, [allWeeks, weeklySchedule, getGenerationPlanForDate]);

  const totalPlannedSlots = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allWeeks.reduce((total, week) => {
      const dates = weeklySchedule[week] || [];
      return total + dates.reduce((weekTotal, date) => {
        const dateObj = new Date(date + 'T00:00:00');
        // Only count dates from today onwards
        if (dateObj < today) return weekTotal;

        // Get number of channels for this day
        const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase() as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
        const channelsForDay = brand.channel_schedule?.[dayOfWeek] || brand.channels || ['LinkedIn'];

        return weekTotal + channelsForDay.length;
      }, 0);
    }, 0);
  }, [allWeeks, weeklySchedule, brand.channel_schedule, brand.channels]);

  const filledSlots = useMemo(() => {
    if (!totalPlannedSlots) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allWeeks.reduce((total, week) => {
      const dates = weeklySchedule[week] || [];
      return total + dates.reduce((weekTotal, date) => {
        const dateObj = new Date(date + 'T00:00:00');
        // Only count dates from today onwards
        if (dateObj < today) return weekTotal;

        // Get number of channels for this day
        const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase() as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
        const channelsForDay = brand.channel_schedule?.[dayOfWeek] || brand.channels || ['LinkedIn'];

        // Count how many of those channels have content
        const itemsForDate = (currentCalendar?.items || []).filter(item => item.date === date);
        const filledChannels = channelsForDay.filter(channel =>
          itemsForDate.some(item => item.channel === channel)
        );

        return weekTotal + filledChannels.length;
      }, 0);
    }, 0);
  }, [allWeeks, weeklySchedule, brand.channel_schedule, brand.channels, currentCalendar, totalPlannedSlots]);

  const runProgress = currentRunTotal
    ? Math.round((generationLog.filter(entry => entry.status === 'complete').length / currentRunTotal) * 100)
    : 0;

  const monthlyThemeRecord = brand.monthly_themes?.[selectedMonth];
  const monthlyTheme = typeof monthlyThemeRecord === 'string'
    ? monthlyThemeRecord
    : monthlyThemeRecord?.theme || '';
  const monthlyThemeNarrative = typeof monthlyThemeRecord === 'string'
    ? ''
    : (monthlyThemeRecord?.explanation || monthlyThemeRecord?.description || '');
  const seasonPlan = brand.season_plans?.[selectedMonth];

  // Check if season planning prerequisites are met
  const hasMonthlyTheme = Boolean(monthlyTheme && monthlyTheme.trim());
  const hasSeasonPlan = Boolean(seasonPlan && seasonPlan.theme && seasonPlan.theme.trim());
  const seasonPlanningComplete = hasMonthlyTheme || hasSeasonPlan;

  const resetGeneration = useCallback(() => {
    setGenerationStatus('idle');
    setGenerationLog([]);
    setGenerationQueue([]);
    setCurrentIndex(0);
    setIsPaused(false);
    setActiveDate(null);
    setCurrentRunTotal(0);
    setErrorMessage(null);
    processingRef.current = false;
  }, []);

  useEffect(() => {
    resetGeneration();
    setSelectedDay(null);
    setSelectedDayItems([]);
  }, [selectedMonth, brand.brand_id, resetGeneration]);

  const getDatesForWeek = useCallback((weekNumber?: number) => {
    const candidateDates = weekNumber
      ? (weeklySchedule[weekNumber] || [])
      : allWeeks.flatMap(week => weeklySchedule[week] || []);

    return candidateDates.filter(date => getGenerationPlanForDate(date).channelsToGenerate.length > 0);
  }, [allWeeks, weeklySchedule, getGenerationPlanForDate]);

  // Generate week instantly without queue/progress
  const generateWeek = useCallback(async (weekNumber: number) => {
    if (!canEdit) return;
    const dates = weeklySchedule[weekNumber] || [];

    const actionableDates = dates
      .map(date => ({ date, plan: getGenerationPlanForDate(date) }))
      .filter(({ plan }) => plan.channelsToGenerate.length > 0);

    if (!actionableDates.length) {
      setErrorMessage('All slots for this week are already perfect! 🌟');
      return;
    }

    setErrorMessage(null);
    setGenerationStatus('running');
    setAndoraMessage(`I'm crafting your week ${weekNumber} content briefs! This'll just take a moment... ✨`);
    setShowPyNotification(true);

    try {
      for (const { date, plan } of actionableDates) {
        const weekPlan = seasonPlan?.weekly?.[weekNumber];
        const weekFocus = buildWeeklySubplotBrief(weekPlan);

        const contentItems = await aiService.generateDayContent(
          brand,
          date,
          {
            monthTheme: monthlyTheme,
            weekFocus,
            events: monthEvents,
            channelsToGenerate: plan.channelsToGenerate,
          },
          selectedModel
        );

        const existingItems = currentCalendar?.items || [];
        const withoutDateItems = existingItems.filter(item => item.date !== date);
        const updatedItems = [
          ...withoutDateItems,
          ...plan.preservedItems,
          ...contentItems,
        ].sort((a, b) => a.date.localeCompare(b.date));
        const updatedCalendar: ContentCalendar = {
          month: selectedMonth,
          items: updatedItems
        };

        onBrandUpdate({
          monthly_calendars: {
            ...brand.monthly_calendars,
            [selectedMonth]: updatedCalendar
          }
        });
      }

      setGenerationStatus('completed');
      setShowPyNotification(false);
    } catch (error) {
      console.error('Error generating week:', error);
      setErrorMessage('Failed to generate week content. Please try again.');
      setGenerationStatus('idle');
      setShowPyNotification(false);
    }
  }, [
    canEdit,
    weeklySchedule,
    seasonPlan,
    brand,
    monthlyTheme,
    monthEvents,
    selectedModel,
    currentCalendar,
    selectedMonth,
    onBrandUpdate,
    getGenerationPlanForDate,
  ]);

  const beginGeneration = useCallback((weekNumber?: number) => {
    if (!canEdit) return;
    const dates = getDatesForWeek(weekNumber);
    if (!dates.length) {
      setErrorMessage('Every slot you selected is already perfect! 🌟');
      return;
    }

    setErrorMessage(null);
    setGenerationQueue(dates);
    setCurrentIndex(0);
    setIsPaused(false);
    setActiveDate(null);
    setGenerationStatus('running');
    setCurrentRunTotal(dates.length);
    setGenerationLog(
      dates.map(date => ({
        date,
        week: getWeekOfMonth(date),
        status: 'pending',
        message: 'Queued for orchestration'
      }))
    );

    // Show personalized notification
    const weekLabel = weekNumber ? `week ${weekNumber}` : 'your full month';
    setAndoraMessage(`Alright, let's create some magic! I'm orchestrating content briefs for ${weekLabel}. You'll see them appear as I work... ✨`);
    setShowPyNotification(true);
  }, [canEdit, getDatesForWeek]);

  const pauseGeneration = () => {
    setIsPaused(true);
    setGenerationStatus('paused');
    setShowPyNotification(false);
  };

  const resumeGeneration = () => {
    if (!canEdit) return;
    setIsPaused(false);
    setGenerationStatus('running');
    setAndoraMessage('Back to work! Continuing where we left off... ✨');
    setShowPyNotification(true);
  };

  const updateLogEntry = useCallback((date: string, updates: Partial<GenerationLogEntry>) => {
    setGenerationLog(prev => prev.map(entry => entry.date === date ? { ...entry, ...updates } : entry));
  }, []);

  useEffect(() => {
    if (generationStatus !== 'running' || isPaused) return;
    if (processingRef.current) return;

    if (currentIndex >= generationQueue.length) {
      setGenerationStatus('completed');
      setActiveDate(null);
      setShowPyNotification(false);
      return;
    }

    const date = generationQueue[currentIndex];
    const plan = getGenerationPlanForDate(date);

    if (plan.channelsToGenerate.length === 0) {
      updateLogEntry(date, { status: 'complete', message: 'Already perfect. Skipped regeneration.' });
      setActiveDate(null);
      setCurrentIndex(prev => prev + 1);
      return;
    }

    processingRef.current = true;
    setActiveDate(date);
    updateLogEntry(date, { status: 'generating', message: 'Crafting the brief for this day…' });

    const generateForDate = async () => {
      try {
        const weekNumber = getWeekOfMonth(date);
        const weekPlan = seasonPlan?.weekly?.[weekNumber];
        const weekFocus = buildWeeklySubplotBrief(weekPlan);

        const contentItems = await aiService.generateDayContent(
          brand,
          date,
          {
            monthTheme: monthlyTheme,
            weekFocus,
            events: monthEvents,
            channelsToGenerate: plan.channelsToGenerate,
          },
          selectedModel
        );

        const existingItems = currentCalendar?.items || [];
        const withoutDateItems = existingItems.filter(item => item.date !== date);
        const updatedItems = [
          ...withoutDateItems,
          ...plan.preservedItems,
          ...contentItems,
        ].sort((a, b) => a.date.localeCompare(b.date));
        const updatedCalendar: ContentCalendar = {
          month: selectedMonth,
          items: updatedItems
        };

        onBrandUpdate({
          monthly_calendars: {
            ...brand.monthly_calendars,
            [selectedMonth]: updatedCalendar
          }
        });

        updateLogEntry(date, { status: 'complete', message: 'Ready for your review.' });
      } catch (error) {
        console.error('Error generating calendar entry', error);
        updateLogEntry(date, {
          status: 'error',
          message: 'Generation failed. Adjust context or retry this slot.'
        });
        setErrorMessage('I hit a snag while generating part of the calendar. You can pause, adjust, and resume.');
      } finally {
        processingRef.current = false;
        setCurrentIndex(prev => prev + 1);
      }
    };

    generateForDate();
  }, [
    generationStatus,
    isPaused,
    currentIndex,
    generationQueue,
    seasonPlan,
    brand,
    monthlyTheme,
    monthEvents,
    selectedModel,
    currentCalendar,
    selectedMonth,
    onBrandUpdate,
    updateLogEntry,
    getGenerationPlanForDate,
  ]);

  const handleDaySelect = (date: string, items: ContentItem[]) => {
    setSelectedDay(date);
    setSelectedDayItems(items);
  };

  const handleRefineRequest = (item: ContentItem) => {
    if (!canEdit) return;
    setContentForRefinement(item);
    setIsRefineModalOpen(true);
  };

  const handleContentUpdate = (contentId: string, updates: Partial<ContentItem>) => {
    if (!canEdit) return;
    const calendar = brand.monthly_calendars[selectedMonth];
    if (!calendar) return;

    const updatedItems = calendar.items.map(item =>
      item.id === contentId ? { ...item, ...updates } : item
    );

    const updatedCalendar = { ...calendar, items: updatedItems };
    onBrandUpdate({
      monthly_calendars: {
        ...brand.monthly_calendars,
        [selectedMonth]: updatedCalendar
      }
    });

    if (selectedDay) {
      setSelectedDayItems(updatedCalendar.items.filter(item => item.date === selectedDay));
    }

    if (contentForRefinement && contentForRefinement.id === contentId) {
      const refreshed = updatedCalendar.items.find(item => item.id === contentId) || null;
      setContentForRefinement(refreshed);
    }
  };

  const handleMarkPerfect = (contentId: string, perfect: boolean) => {
    if (!canEdit) return;
    handleContentUpdate(contentId, { is_perfect: perfect });
  };

  const nextIncompleteWeek = useMemo(() => {
    return allWeeks.find(week => !weekCompletion[week]);
  }, [allWeeks, weekCompletion]);

  const activeStatusCopy = () => {
    if (generationStatus === 'running' && activeDate) {
      return `Generating ${formatLogLabel(activeDate)} in the background. You can keep reviewing other days.`;
    }
    if (generationStatus === 'paused') {
      return 'Orchestration paused. Resume when you are ready.';
    }
    if (generationStatus === 'completed' && currentRunTotal) {
      return 'This batch is complete. Continue to the next week whenever you are ready.';
    }
    return 'Kick off orchestration and I will stream each day into the calendar while you review.';
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Andora Notification */}
      <PyNotification
        message={andoraMessage}
        show={showPyNotification}
        modelInfo={selectedModel}
      />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <CalendarDays className="w-8 h-8 text-primary-400" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold shimmer-text">Monthly Content Calendar</h1>
            <p className="text-slate-500 mt-1 sm:mt-2 text-sm sm:text-base">
              {filledSlots}/{totalPlannedSlots} planned publishing slots filled for {monthName}
            </p>
          </div>
        </div>
        <div className="w-full sm:w-auto sm:max-w-xs flex justify-end">
          <AIModelSwitcher
            value={selectedModel}
            onChange={setSelectedModel}
            className="w-full sm:w-auto"
          />
        </div>
      </div>

      {/* Season Planning Prerequisite Banner */}
      {!seasonPlanningComplete && (
        <div className="glass-effect rounded-xl border border-accent-500/40 bg-accent-500/10 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <PyAvatar size="md" className="shadow-lg ring-2 ring-accent-500/40" />
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-accent-300 font-semibold">Monthly theme required</p>
              <h3 className="text-lg font-semibold text-primary-900 mt-1">Set your monthly theme in Season Planning first</h3>
              <p className="text-sm text-primary-900/80 mt-2 leading-relaxed">
                Before I can generate your content calendar, you need to define the monthly theme in the <strong>Season Planning</strong> section.
                This ensures all content aligns with your strategic narrative for {monthName}.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="glass-effect rounded-lg p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Select Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 glass-effect rounded-md text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="text-xs sm:text-sm text-slate-600 space-y-1">
              <p><strong>Cadence:</strong> {brand.posting_frequency}x per week</p>
              <p><strong>Preferred days:</strong> {(brand.preferred_posting_days || defaultPreferredDays).map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ')}</p>
              {monthlyTheme && (
                <>
                  <p><strong>Theme:</strong> {monthlyTheme}</p>
                  {monthlyThemeNarrative && (
                    <p className="text-slate-500">{monthlyThemeNarrative}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {monthEvents.length > 0 && (
          <div className="neural-glow p-4 rounded-lg">
            <h3 className="font-medium text-primary-300 mb-2">Events for {monthName}:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {monthEvents.map((event) => (
                <div key={event.event_id} className="text-sm text-primary-200">
                  <span className="font-medium">{event.title}</span> - {event.event_date}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="glass-effect rounded-lg p-5 border border-primary-500/30 space-y-4">
        <div className="flex items-start gap-4">
          <PyAvatar size="sm" className="shadow-lg ring-2 ring-accent-500/40" />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-400">Andora Orchestration</p>
            <h2 className="text-lg font-semibold text-primary-900">Live calendar generation</h2>
            <p className="text-sm text-slate-600">{activeStatusCopy()}</p>
          </div>
          <div className="flex flex-col gap-2">
            {generationStatus === 'running' && (
              <Button
                variant="outline"
                size="sm"
                onClick={pauseGeneration}
                disabled={!canEdit}
                className="flex items-center"
              >
                <PauseCircle size={16} className="mr-1" /> Pause
              </Button>
            )}
            {generationStatus === 'paused' && (
              <Button
                variant="primary"
                size="sm"
                onClick={resumeGeneration}
                disabled={!canEdit}
                className="flex items-center"
              >
                <PlayCircle size={16} className="mr-1" /> Resume
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Button
            onClick={() => generateWeek(allWeeks[0])}
            disabled={!canEdit || generationStatus === 'running' || !seasonPlanningComplete}
            className="flex items-center justify-center"
            size="sm"
          >
            <Sparkles size={16} className="mr-2" /> Generate First Week
          </Button>
          <Button
            variant="secondary"
            onClick={() => beginGeneration()}
            disabled={!canEdit || generationStatus === 'running' || !seasonPlanningComplete}
            className="flex items-center justify-center"
            size="sm"
          >
            <Wand2 size={16} className="mr-2" /> Generate Full Month
          </Button>
          <Button
            variant="outline"
            onClick={() => generateWeek(nextIncompleteWeek!)}
            disabled={!canEdit || generationStatus === 'running' || !nextIncompleteWeek || !seasonPlanningComplete}
            className="flex items-center justify-center"
            size="sm"
          >
            <ArrowRight size={16} className="mr-2" />
            {nextIncompleteWeek ? `Generate Week ${nextIncompleteWeek}` : 'All Weeks Scheduled'}
          </Button>
        </div>

        {/* Only show progress bar for full month generation */}
        {generationQueue.length > 0 && (
          <div className="h-2 bg-primary-200/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500/80 transition-all duration-500"
              style={{ width: `${runProgress}%` }}
            />
          </div>
        )}

        {errorMessage && (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-red-400/40 bg-red-500/10 text-sm text-red-100">
            <AlertCircle size={18} className="mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Only show generation timeline for full month generation */}
        {generationQueue.length > 0 && generationLog.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Generation timeline</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {generationLog.map(entry => (
                <div
                  key={entry.date}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg glass-effect border border-primary-500/20"
                >
                  <div>
                    <p className="text-sm font-medium text-primary-900">Week {entry.week} • {formatLogLabel(entry.date)}</p>
                    <p className="text-xs text-slate-500">{entry.message}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    {entry.status === 'pending' && <span className="text-slate-400">Queued</span>}
                    {entry.status === 'generating' && (
                      <span className="flex items-center text-primary-400">
                        <Sparkles size={14} className="mr-1" /> In progress
                      </span>
                    )}
                    {entry.status === 'complete' && (
                      <span className="flex items-center text-green-400">
                        <CheckCircle2 size={14} className="mr-1" /> Done
                      </span>
                    )}
                    {entry.status === 'error' && (
                      <span className="text-red-300">Needs attention</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {currentCalendar ? (
        <ContentCalendarGrid
          calendar={currentCalendar}
          onDaySelect={handleDaySelect}
          selectedDate={selectedDay}
        />
      ) : (
        <div className="glass-effect rounded-lg p-12 text-center">
          <CalendarDays className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-primary-900 mb-2">No Content Calendar Generated</h3>
          <p className="text-sm sm:text-base text-slate-600 mb-6">
            Use Andora orchestration to generate your content calendar for {monthName}. I will fill only the days you have defined in your profile.
          </p>
          <Button
            onClick={() => beginGeneration(allWeeks[0])}
            disabled={!canEdit || generationStatus === 'running' || !seasonPlanningComplete}
            size="sm"
            className="flex items-center mx-auto"
          >
            <Wand2 size={16} className="mr-2" /> Generate the First Week
          </Button>
        </div>
      )}

      {selectedDay && (
        <ContentDayView
          date={selectedDay}
          items={selectedDayItems}
          onClose={() => {
            setSelectedDay(null);
            setSelectedDayItems([]);
          }}
          onMarkPerfect={handleMarkPerfect}
          onRefine={handleRefineRequest}
          canEdit={canEdit}
        />
      )}

      <RefineModal
        isOpen={isRefineModalOpen}
        onClose={() => setIsRefineModalOpen(false)}
        content={contentForRefinement}
        onContentUpdate={handleContentUpdate}
        brand={brand}
        characters={brand.cast_management}
        preferredModel={selectedModel}
        canEdit={canEdit}
      />
    </div>
  );
};
