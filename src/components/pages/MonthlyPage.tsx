import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Brand, Event, ContentItem } from '../../types';
import { Calendar, Wand2, ChevronLeft, ChevronRight, Sparkles, Loader2, ChevronDown, Download } from 'lucide-react';
import { Button } from '../common/Button';
import { CalendarGrid } from '../monthly/CalendarGrid';
import { ContentModal } from '../monthly/ContentModal';
import { ContentSidebar } from '../monthly/ContentSidebar';
import { AIModelSwitcher } from '../common/AIModelSwitcher';
import { AndoraNotification } from '../common/AndoraNotification';
import { useAIModelPreference } from '../../hooks/useAIModelPreference';
import { useAndoraNotification } from '../../hooks/useAndoraNotification';
import { useGuidedTour } from '../../hooks/useGuidedTour';
import { Tour } from '../common/Tour';
import { aiService } from '../../services/aiService';
import { apiClient } from '../../lib/api';
import { exportCalendarToText, downloadCalendarExport } from '../../utils/calendarExport';

interface MonthlyPageProps {
  brand: Brand;
  events: Event[];
  onBrandUpdate: (updates: Partial<Brand>) => void;
  preferredModel?: string;
  canEdit?: boolean;
}

export const MonthlyPage: React.FC<MonthlyPageProps> = ({
  brand,
  events,
  onBrandUpdate,
  preferredModel,
  canEdit = true
}) => {
  // AI Model Selection (default to FREE Gemini model)
  const [selectedModel, setSelectedModel] = useAIModelPreference(preferredModel || 'gemini-2.5-flash');

  // Create stable handler for model change
  const handleModelChange = React.useCallback((model: string) => {
    if (typeof setSelectedModel === 'function') {
      setSelectedModel(model);
    }
  }, [setSelectedModel]);

  // Andora notifications
  const { message: andoraMessage, modelInfo: notificationModel, isVisible: showAndoraNotification, showNotification, hideNotification, updateMessage, action } = useAndoraNotification();

  // Current month state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal state
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingDate, setGeneratingDate] = useState<string | null>(null);
  const [generatingScope, setGeneratingScope] = useState<'day' | 'week' | 'month' | null>(null);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [showWeekDropdown, setShowWeekDropdown] = useState(false);
  const [showEmbedDropdown, setShowEmbedDropdown] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);
  const [glowingItems, setGlowingItems] = useState<Set<string>>(new Set());

  // Unembedded events state
  const [unembeddedEvents, setUnembeddedEvents] = useState<Event[]>([]);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [showEmbedConfirm, setShowEmbedConfirm] = useState(false);
  const [embedWeekNum, setEmbedWeekNum] = useState<number | null>(null);

  // Ref for week dropdown
  const weekDropdownRef = useRef<HTMLDivElement>(null);

  // Get current calendar data
  const rawCalendar = brand.monthly_calendars[selectedMonth];

  // Filter calendar items if view-only (show only perfect briefs)
  const currentCalendar = useMemo(() => {
    if (!rawCalendar) return rawCalendar;
    if (canEdit) return rawCalendar;

    // View-only mode: show only perfect briefs
    return {
      ...rawCalendar,
      items: rawCalendar.items.filter(item => item.is_perfect)
    };
  }, [rawCalendar, canEdit]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (weekDropdownRef.current && !weekDropdownRef.current.contains(event.target as Node)) {
        setShowWeekDropdown(false);
      }
    };

    if (showWeekDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showWeekDropdown]);

  // Cleanup stuck _streaming flags on mount and when calendar changes
  useEffect(() => {
    if (currentCalendar && currentCalendar.items) {
      const hasStreamingFlags = currentCalendar.items.some(item => item._streaming);

      if (hasStreamingFlags) {
        console.log('🧹 Cleaning up stuck _streaming flags...');
        const cleanedItems = currentCalendar.items.map(item => {
          if (item._streaming) {
            const cleaned = { ...item };
            delete cleaned._streaming;
            return cleaned;
          }
          return item;
        });

        onBrandUpdate({
          monthly_calendars: {
            ...brand.monthly_calendars,
            [selectedMonth]: { month: selectedMonth, items: cleanedItems }
          }
        });
      }
    }
  }, [selectedMonth, currentCalendar]); // Run when month or calendar changes
  const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  // Filter events for current month
  const monthEvents = useMemo(() => {
    return events.filter(event => event.event_date.startsWith(selectedMonth));
  }, [events, selectedMonth]);

  // Calculate content stats for the month
  const contentStats = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const channelsCount = brand.channels?.length || 0;
    const totalSlots = daysInMonth * channelsCount;

    const items = currentCalendar?.items || [];
    const created = items.length;
    const perfect = items.filter(item => item.is_perfect).length;

    return { totalSlots, created, perfect };
  }, [selectedMonth, brand.channels, currentCalendar]);

  // Fetch unembedded events when month changes
  useEffect(() => {
    const fetchUnembeddedEvents = async () => {
      try {
        const [year, month] = selectedMonth.split('-');
        const events = await apiClient.getUnembeddedEvents(brand.brand_id, year, month);
        setUnembeddedEvents(events || []);
      } catch (error) {
        console.error('Failed to fetch unembedded events:', error);
        setUnembeddedEvents([]);
      }
    };

    if (brand.brand_id) {
      fetchUnembeddedEvents();
    }
  }, [selectedMonth, brand.brand_id, events]); // Re-fetch when events change

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1);

    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }

    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  // Handle content click
  const handleContentClick = (item: ContentItem) => {
    setSelectedContent(item);
    setModalOpen(true);
  };

  // Handle content update
  const handleContentUpdate = (contentId: string, updates: Partial<ContentItem>) => {
    if (!canEdit) return;

    const calendar = brand.monthly_calendars[selectedMonth];
    if (!calendar) return;

    const updatedItems = calendar.items.map(item =>
      item.id === contentId ? { ...item, ...updates } : item
    );

    onBrandUpdate({
      monthly_calendars: {
        ...brand.monthly_calendars,
        [selectedMonth]: { ...calendar, items: updatedItems }
      }
    });

    // Update selected content if it's the one being edited
    if (selectedContent?.id === contentId) {
      setSelectedContent({ ...selectedContent, ...updates });
    }
  };

  // Handle content regeneration
  const handleContentRegenerate = async (contentId: string) => {
    if (!canEdit) return;

    const calendar = brand.monthly_calendars[selectedMonth];
    if (!calendar) return;

    const contentToRegenerate = calendar.items.find(item => item.id === contentId);
    if (!contentToRegenerate) return;

    showNotification('ai_regenerate_content', selectedModel);

    try {
      const context = getGenerationContext(contentToRegenerate.date);

      const newContent = await aiService.generateContentCalendarEntry(
        brand,
        contentToRegenerate.date,
        { ...context, preferredChannels: [contentToRegenerate.channel] },
        selectedModel
      );

      // Keep the same ID but replace all content
      const regenerated = { ...newContent, id: contentId };

      const updatedItems = calendar.items.map(item =>
        item.id === contentId ? regenerated : item
      );

      onBrandUpdate({
        monthly_calendars: {
          ...brand.monthly_calendars,
          [selectedMonth]: { ...calendar, items: updatedItems }
        }
      });

      // Update modal content
      setSelectedContent(regenerated);
    } catch (error) {
      console.error('Failed to regenerate content:', error);
      throw error;
    } finally {
      hideNotification();
    }
  };

  // Get week dates for the month (1-7, 8-14, 15-21, 22-28, 29+)
  const getWeekDates = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();

    const weeks: { week: number; dates: string[]; startDay: number; endDay: number }[] = [];

    // Week 1: Days 1-7
    // Week 2: Days 8-14
    // Week 3: Days 15-21
    // Week 4: Days 22-28
    // Week 5: Days 29+ (if exists)

    const weekRanges = [
      { start: 1, end: 7 },
      { start: 8, end: 14 },
      { start: 15, end: 21 },
      { start: 22, end: 28 },
      { start: 29, end: daysInMonth }
    ];

    weekRanges.forEach((range, index) => {
      const weekNum = index + 1;
      const dates: string[] = [];

      for (let day = range.start; day <= Math.min(range.end, daysInMonth); day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dates.push(dateStr);
      }

      // Only add week if it has dates (handles months with < 29 days)
      if (dates.length > 0) {
        weeks.push({
          week: weekNum,
          dates,
          startDay: range.start,
          endDay: Math.min(range.end, daysInMonth)
        });
      }
    });

    return weeks;
  };

  // Get week number for a date (based on day ranges: 1-7, 8-14, etc.)
  const getWeekNumber = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);

    if (day >= 1 && day <= 7) return 1;
    if (day >= 8 && day <= 14) return 2;
    if (day >= 15 && day <= 21) return 3;
    if (day >= 22 && day <= 28) return 4;
    if (day >= 29) return 5;

    return 1; // Fallback
  };

  // Get perfect content for context
  const getPerfectContentContext = () => {
    const calendar = brand.monthly_calendars[selectedMonth];
    if (!calendar) return [];

    return calendar.items
      .filter(item => item.is_perfect)
      .map(item => ({
        date: item.date,
        channel: item.channel,
        title: item.title,
        brief: item.brief || item.final_brief,
        character_focus: item.character_focus,
        story_hook: item.story_hook,
      }));
  };

  // Get monthly theme and context with weekly subplot
  const getGenerationContext = (date?: string) => {
    const monthlyThemeRecord = brand.monthly_themes?.[selectedMonth];
    const monthTheme = typeof monthlyThemeRecord === 'string'
      ? monthlyThemeRecord
      : monthlyThemeRecord?.theme || '';

    const seasonPlan = brand.season_plans?.[selectedMonth];

    // Get weekly subplot if date is provided
    let weekFocus = '';
    if (date && seasonPlan?.weekly) {
      const weekNum = getWeekNumber(date);
      const weekPlan = seasonPlan.weekly[weekNum];
      weekFocus = weekPlan?.subplot || weekPlan?.custom_theme || '';
    }

    // Get perfect content for context
    const perfectContent = getPerfectContentContext();

    return {
      monthTheme: monthTheme || seasonPlan?.theme || `${brand.brand_name} updates for ${monthName}`,
      weekFocus,
      monthlyPlot: seasonPlan?.monthlyPlot || '',
      preferredChannels: brand.channels || ['LinkedIn'],
      events: monthEvents,
      characters: brand.cast_management || [],
      perfectContent,
    };
  };

  // Generate content for a specific date
  const handleGenerateDate = async (date: string) => {
    if (!canEdit || isGenerating) return;

    setIsGenerating(true);
    setGeneratingDate(date);
    setGeneratingScope('day');
    showNotification('ai_generate_content_day', selectedModel);

    try {
      // Get context with weekly subplot for this specific date
      const context = getGenerationContext(date);

      // Get channels to generate for this date
      const dateObj = new Date(date + 'T12:00:00Z');
      // ✅ FIXED: Use brand's timezone for day-of-week calculation
      const brandTimezone = brand.timezone || 'UTC';
      const dayOfWeek = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        timeZone: brandTimezone
      }).toLowerCase() as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

      // ✅ FIXED: Respect posting schedule strictly - only use schedule, don't fall back to all channels
      const channelsForDay = brand.channel_schedule?.[dayOfWeek];

      // If no channels scheduled for this day, skip generation
      if (!channelsForDay || channelsForDay.length === 0) {
        console.log(`⏭️ Skipping ${date} (${dayOfWeek}) - no channels scheduled`);
        hideNotification();
        setIsGenerating(false);
        setGeneratingDate(null);
        setGeneratingScope(null);
        return;
      }

      // Generate content for each channel
      const newItems: ContentItem[] = [];

      for (const channel of channelsForDay) {
        try {
          const item = await aiService.generateContentCalendarEntry(
            brand,
            date,
            { ...context, preferredChannels: [channel] },
            selectedModel
          );
          newItems.push(item);
        } catch (error) {
          console.error(`Failed to generate content for ${channel}:`, error);
        }
      }

      if (newItems.length > 0) {
        // Add new items to calendar (replacing any existing content for this date)
        const calendar = brand.monthly_calendars[selectedMonth] || { month: selectedMonth, items: [] };
        const existingItems = calendar.items.filter(item => item.date !== date);
        const updatedItems = [...existingItems, ...newItems];

        onBrandUpdate({
          monthly_calendars: {
            ...brand.monthly_calendars,
            [selectedMonth]: { ...calendar, items: updatedItems }
          }
        });
      }
    } catch (error) {
      console.error('Failed to generate content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      hideNotification();
      setIsGenerating(false);
      setGeneratingDate(null);
      setGeneratingScope(null);
    }
  };

  // Generate content for first week
  const handleGenerateFirstWeek = async () => {
    if (!canEdit || isGenerating) return;

    const weeks = getWeekDates();
    if (weeks.length === 0) return;

    const firstWeek = weeks[0];
    await handleGenerateWeek(firstWeek.week, firstWeek.dates);
  };

  // Generate content for specific week (STREAMING VERSION)
  const handleGenerateWeek = async (weekNum: number, dates: string[]) => {
    if (!canEdit || isGenerating) return;

    const brandId = brand.id || brand.brand_id;
    console.log('🎬 Generate Week Called (STREAMING):', { weekNum, dates, brandId });

    showNotification('ai_generate_content_week', selectedModel);
    setIsGenerating(true);
    setShouldStop(false);
    setGeneratingScope('week');

    try {
      const calendar = brand.monthly_calendars[selectedMonth] || { month: selectedMonth, items: [] };

      // Build channels map for each day - ONLY include days with scheduled channels
      const channelsMap: Record<string, string[]> = {};
      const validDates: string[] = [];

      dates.forEach(date => {
        const dateObj = new Date(date + 'T12:00:00Z');
        // ✅ FIXED: Use brand's timezone for day-of-week calculation
        const brandTimezone = brand.timezone || 'UTC';
        const dayOfWeek = dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          timeZone: brandTimezone
        }).toLowerCase() as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

        // If channel_schedule exists, respect it strictly - don't fall back
        let dayChannels: string[] = [];
        if (brand.channel_schedule) {
          // Use scheduled channels for this day (even if empty array)
          dayChannels = brand.channel_schedule[dayOfWeek] || [];
        } else {
          // No schedule defined, fall back to brand channels
          dayChannels = brand.channels || ['LinkedIn'];
        }

        // Only include dates that have at least one channel scheduled
        if (dayChannels.length > 0) {
          channelsMap[date] = dayChannels;
          validDates.push(date);
        } else {
          console.log(`⏭️ Skipping ${date} (${dayOfWeek}) - no channels scheduled`);
        }
      });

      // If no valid dates with channels, show message and return
      if (validDates.length === 0) {
        alert('No channels scheduled for any days in this week. Please configure your Channel Posting Schedule in Brand Profile.');
        return;
      }

      // Update dates to only include valid dates
      dates = validDates;

      // Get existing content (for perfect content context)
      const existingContent = calendar.items
        .filter(item => dates.includes(item.date))
        .map(item => ({
          date: item.date,
          channel: item.channel,
          is_perfect: item.is_perfect,
          story_hook: item.story_hook || item.title,
        }));

      const requestPayload = {
        brandId: brandId,
        dates,
        channels: channelsMap,
        existingContent,
        model: selectedModel, // Pass selected model from switcher
      };

      console.log('📡 Connecting to SSE stream...');

      // Create EventSource for SSE streaming
      const response = await fetch(`${import.meta.env.VITE_API_URL}/content/generate-week-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) throw new Error('Failed to start streaming');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const newItems: ContentItem[] = [];
      const lockedEntries = new Set<string>();

      // Read streaming response
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;
        if (shouldStop) {
          reader.cancel();
          console.log('🛑 Stream cancelled by user');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;

          if (line.startsWith('event:')) {
            const eventType = line.slice(6).trim();
            continue;
          }

          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.slice(5).trim());

              // Handle different event types
              if (data.message) {
                updateMessage(data.message, data.model || selectedModel);
              }

              if (data.entry) {
                const item = data.entry;
                const contentId = `content-${item.date}-${item.channel}-${Date.now()}-${newItems.length}`;
                const entryKey = `${item.date}-${item.channel}`;

                // Lock this entry from editing until complete
                lockedEntries.add(entryKey);

                const newItem: ContentItem = {
                  id: contentId,
                  date: item.date,
                  channel: item.channel,
                  title: item.title || '...',
                  brief: item.brief || '...',
                  final_brief: item.brief || '...',
                  story_hook: item.story_hook || '...',
                  directives: item.directives || '',
                  character_focus: item.character_focus || '',
                  media_type: item.media_type || '',
                  call_to_action: item.call_to_action || '',
                  is_perfect: false,
                  _streaming: true, // Mark as streaming
                };

                newItems.push(newItem);

                // Update calendar immediately with streaming item
                const datesToRegenerate = new Set(dates);
                const preservedItems = calendar.items.filter(
                  item => !datesToRegenerate.has(item.date) || item.is_perfect
                );
                const updatedItems = [...preservedItems, ...newItems];

                onBrandUpdate({
                  monthly_calendars: {
                    ...brand.monthly_calendars,
                    [selectedMonth]: { month: selectedMonth, items: updatedItems }
                  }
                });

                // Add smooth glow effect - one by one
                setGlowingItems(prev => new Set(prev).add(entryKey));
                setGenerationProgress({ current: newItems.length, total: newItems.length + 1 });

                // Remove glow and unlock after animation completes
                setTimeout(() => {
                  setGlowingItems(prev => {
                    const next = new Set(prev);
                    next.delete(entryKey);
                    return next;
                  });

                  // Unlock entry for editing by updating the calendar directly
                  const currentCalendar = brand.monthly_calendars[selectedMonth] || { month: selectedMonth, items: [] };
                  const updatedItems = currentCalendar.items.map(item => {
                    if (`${item.date}-${item.channel}` === entryKey && item._streaming) {
                      const unlocked = { ...item };
                      delete unlocked._streaming;
                      return unlocked;
                    }
                    return item;
                  });

                  onBrandUpdate({
                    monthly_calendars: {
                      ...brand.monthly_calendars,
                      [selectedMonth]: { month: selectedMonth, items: updatedItems }
                    }
                  });
                }, 1500); // Match CSS animation duration
              }

              if (data.totalEntries) {
                console.log(`✅ Stream complete: ${data.totalEntries} entries generated`);
                updateMessage(`Generated ${data.totalEntries} content entries`, selectedModel);
              }

            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }

    } catch (error) {
      console.error('Failed to generate week:', error);
      alert('Failed to generate week content. Please try again.');
    } finally {
      hideNotification();
      setIsGenerating(false);
      setShouldStop(false);
      setGeneratingDate(null);
      setGeneratingScope(null);
      setGenerationProgress({ current: 0, total: 0 });

      // Clean up any remaining _streaming flags from calendar items
      const currentCalendar = brand.monthly_calendars[selectedMonth];
      if (currentCalendar && currentCalendar.items.some(item => item._streaming)) {
        const cleanedItems = currentCalendar.items.map(item => {
          if (item._streaming) {
            const cleaned = { ...item };
            delete cleaned._streaming;
            return cleaned;
          }
          return item;
        });

        onBrandUpdate({
          monthly_calendars: {
            ...brand.monthly_calendars,
            [selectedMonth]: { month: selectedMonth, items: cleanedItems }
          }
        });
      }

      // Clear glowing items after allowing animations to complete
      setTimeout(() => {
        setGlowingItems(new Set());
      }, 2000);
    }
  };

  const handleStopGeneration = () => {
    setShouldStop(true);
  };

  // Generate content for full month
  const handleGenerateFullMonth = async () => {
    if (!canEdit || isGenerating) return;

    const weeks = getWeekDates();
    if (weeks.length === 0) return;

    const allDates = weeks.flatMap(w => w.dates);

    setIsGenerating(true);
    setGeneratingScope('month');
    setShouldStop(false);
    setGenerationProgress({ current: 0, total: allDates.length });
    updateMessage(
      `Generating content for ${allDates.length} days in ${monthName}...`,
      selectedModel
    );

    try {
      const calendar = brand.monthly_calendars[selectedMonth] || { month: selectedMonth, items: [] };
      const newItems: ContentItem[] = [];

      for (let i = 0; i < allDates.length; i++) {
        if (shouldStop) {
          console.log('Generation stopped by user');
          break;
        }

        const date = allDates[i];
        setGeneratingDate(date);
        setGenerationProgress({ current: i + 1, total: allDates.length });

        const dateObj = new Date(date + 'T12:00:00Z');
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC'
        });
        updateMessage(
          `Generating content for ${formattedDate}...`,
          selectedModel
        );

        // Get context with weekly subplot for this specific date
        const context = getGenerationContext(date);

        // Check if this date already has perfect content
        const existingItems = calendar.items.filter(item => item.date === date);
        const hasPerfectContent = existingItems.some(item => item.is_perfect);

        // Skip if all content is perfect
        if (hasPerfectContent && existingItems.every(item => item.is_perfect)) {
          continue;
        }

        // Get channels for this day from Channel Posting Schedule
        // ✅ FIXED: Use brand's timezone for day-of-week calculation
        const brandTimezone = brand.timezone || 'UTC';
        const dayOfWeek = dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          timeZone: brandTimezone
        }).toLowerCase() as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

        // ✅ FIXED: Respect posting schedule strictly - only use schedule, don't fall back to all channels
        const channelsForDay = brand.channel_schedule?.[dayOfWeek];

        // If no channels scheduled for this day, skip
        if (!channelsForDay || channelsForDay.length === 0) {
          console.log(`⏭️ Skipping ${date} (${dayOfWeek}) - no channels scheduled`);
          continue;
        }

        // Generate for channels that don't have perfect content
        for (const channel of channelsForDay) {
          if (shouldStop) break;

          const existingForChannel = existingItems.find(item => item.channel === channel);

          if (existingForChannel?.is_perfect) {
            // Skip perfect content, but keep it for context
            continue;
          }

          try {
            const item = await aiService.generateContentCalendarEntry(
              brand,
              date,
              { ...context, preferredChannels: [channel] },
              selectedModel
            );
            newItems.push(item);
            setGlowingItems(prev => new Set(prev).add(item.id));
            setTimeout(() => {
              setGlowingItems(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
              });
            }, 1500); // Match CSS animation duration
          } catch (error) {
            console.error(`Failed to generate content for ${channel} on ${date}:`, error);
          }
        }
      }

      if (newItems.length > 0) {
        // Remove non-perfect items and add new items
        const preservedItems = calendar.items.filter(item => item.is_perfect);
        const updatedItems = [...preservedItems, ...newItems];

        onBrandUpdate({
          monthly_calendars: {
            ...brand.monthly_calendars,
            [selectedMonth]: { month: selectedMonth, items: updatedItems }
          }
        });
      }
    } catch (error) {
      console.error('Failed to generate month:', error);
      alert('Failed to generate month content. Please try again.');
    } finally {
      hideNotification();
      setIsGenerating(false);
      setShouldStop(false);
      setGeneratingDate(null);
      setGeneratingScope(null);
      setGenerationProgress({ current: 0, total: 0 });
      setGlowingItems(new Set());
    }
  };

  // Handle embedding events into week
  const handleEmbedEvents = async (weekNum: number, forceReflow: boolean = false) => {
    setIsEmbedding(true);
    updateMessage(`Embedding events into Week ${weekNum}...`, selectedModel);

    try {
      const [year, month] = selectedMonth.split('-');
      const result = await apiClient.embedEventsIntoWeek(
        brand.brand_id,
        year,
        month,
        weekNum,
        forceReflow
      );

      if (result.needsConfirmation && !forceReflow) {
        setEmbedWeekNum(weekNum);
        setShowEmbedConfirm(true);
        hideNotification();
        return;
      }

      // Re-fetch brand data to get updated subplot
      // For now, just show success message and refresh unembedded events
      const updatedEvents = await apiClient.getUnembeddedEvents(brand.brand_id, year, month);
      setUnembeddedEvents(updatedEvents || []);

      updateMessage(
        `Successfully embedded ${result.eventsEmbedded} event(s) into Week ${weekNum}`,
        selectedModel,
        {
          label: 'Undo',
          onClick: () => handleUndoEmbedEvents(weekNum),
        }
      );

      // If shouldRegenerateContent is true, ask user if they want to regenerate
      if (result.shouldRegenerateContent) {
        const shouldRegenerate = confirm(
          `Week ${weekNum} subplot has been updated. Would you like to regenerate imperfect content for this week?`
        );
        if (shouldRegenerate) {
          // Get week dates and trigger regeneration
          const weeks = getWeekDates();
          const week = weeks.find(w => w.week === weekNum);
          if (week) {
            await handleGenerateWeek(weekNum, week.dates);
          }
        }
      }
    } catch (error) {
      console.error('Failed to embed events:', error);
      hideNotification();
      alert('Failed to embed events. Please try again.');
    } finally {
      setIsEmbedding(false);
      setShowEmbedConfirm(false);
      setEmbedWeekNum(null);
    }
  };

  const handleUndoEmbedEvents = async (weekNum: number) => {
    try {
      const [year, month] = selectedMonth.split('-');
      await apiClient.undoEmbedEvents(brand.brand_id, year, month, weekNum);

      // Refresh unembedded events
      const updatedEvents = await apiClient.getUnembeddedEvents(brand.brand_id, year, month);
      setUnembeddedEvents(updatedEvents || []);

      hideNotification();
      alert(`Successfully restored subplot for week ${weekNum}`);
    } catch (error) {
      console.error('Failed to undo embed events:', error);
      alert('Failed to undo embed events. Please try again.');
    }
  };

  // Get unembedded events count per week
  const getUnembeddedCountByWeek = () => {
    const countMap: Record<number, number> = {};
    const weeks = getWeekDates();

    unembeddedEvents.forEach(event => {
      const eventDate = event.start_date || event.event_date;
      if (!eventDate) return;

      // Find which week this event belongs to
      const weekInfo = weeks.find(w =>
        w.dates.some(d => d === eventDate)
      );

      if (weekInfo) {
        countMap[weekInfo.week] = (countMap[weekInfo.week] || 0) + 1;
      }
    });

    return countMap;
  };

  const unembeddedByWeek = getUnembeddedCountByWeek();

  // Handle export calendar
  const handleExportCalendar = () => {
    try {
      // Get weekly subplots from brand data
      const [year, month] = selectedMonth.split('-');
      const seasonPlan = brand.season_plans?.[selectedMonth];
      const weeklySubplots = seasonPlan?.weekly || {};

      // Generate formatted text
      const exportContent = exportCalendarToText({
        brand,
        calendar: currentCalendar!,
        month: selectedMonth,
        monthTheme: brand.monthly_themes?.[selectedMonth] as string,
        events: monthEvents,
        weeklySubplots
      });

      // Create filename
      const monthName = new Date(parseInt(year), parseInt(month) - 1, 1)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        .replace(/\s+/g, '_');
      const filename = `${brand.name.replace(/\s+/g, '_')}_${monthName}_Calendar.txt`;

      // Download
      downloadCalendarExport(exportContent, filename);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export calendar. Please try again.');
    }
  };

  const {
    isActive: isTourActive,
    currentStep: tourStep,
    currentStepIndex: tourStepIndex,
    totalSteps: tourTotalSteps,
    nextStep: tourNextStep,
    previousStep: tourPreviousStep,
    skipTour,
  } = useGuidedTour('monthly');

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <Tour
        isActive={isTourActive}
        currentStep={tourStep}
        currentStepIndex={tourStepIndex}
        totalSteps={tourTotalSteps}
        nextStep={tourNextStep}
        previousStep={tourPreviousStep}
        skipTour={skipTour}
      />

      {/* Andora Notification with integrated progress and stop button */}
      <AndoraNotification
        message={andoraMessage}
        show={showAndoraNotification}
        modelInfo={notificationModel}
        progress={isGenerating && generationProgress.total > 0 ? generationProgress : null}
        onStop={isGenerating ? handleStopGeneration : undefined}
        action={action}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-primary-400" />
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold shimmer-text">
              Monthly Content Calendar
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm">
              <span className="text-slate-600">
                <span className="font-semibold text-primary-600">{contentStats.created}</span>
                <span className="text-slate-400">/{contentStats.totalSlots}</span>
                <span className="text-slate-500 ml-1">slots created</span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">
                <span className="font-semibold text-green-600">{contentStats.perfect}</span>
                <span className="text-slate-400">/{contentStats.created}</span>
                <span className="text-slate-500 ml-1">perfect</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
          {/* AI Model Switcher */}
          <div data-tour="model-switcher">
            <AIModelSwitcher
              value={selectedModel}
              onChange={handleModelChange}
            />
          </div>

          {isGenerating && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-primary-50 border border-primary-200 rounded-lg">
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 text-primary-600 animate-spin" />
              <span className="text-xs sm:text-sm text-primary-700">
                {generatingScope === 'month' && `Generating month... (${generationProgress.current}/${generationProgress.total})`}
                {generatingScope === 'week' && `Generating week... (${generationProgress.current}/${generationProgress.total})`}
                {generatingScope === 'day' && 'Generating content...'}
                {!generatingScope && 'Generating content...'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Generation Controls */}
      {canEdit && (
        <div className="glass-effect rounded-xl p-3 sm:p-4 border border-primary-500/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
              <span className="text-xs sm:text-sm font-semibold text-dark-900">Story Scene Generation</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
              {/* Week Generation Dropdown */}
              <div className="relative flex-1 sm:flex-initial" ref={weekDropdownRef} data-tour="generate-week">
                <Button
                  onClick={() => setShowWeekDropdown(!showWeekDropdown)}
                  disabled={isGenerating}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Sparkles size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Generate Week</span>
                  <span className="sm:hidden">Week</span>
                  <ChevronDown size={12} className={`sm:w-3.5 sm:h-3.5 transition-transform ${showWeekDropdown ? 'rotate-180' : ''}`} />
                </Button>

                {showWeekDropdown && (
                  <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                    {getWeekDates().map((week) => {
                      const [year, month] = selectedMonth.split('-').map(Number);
                      const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' });
                      const weekLabel = `Week ${week.week} (${monthName} ${week.startDay}-${week.endDay})`;
                      
                      return (
                        <div
                          key={week.week}
                          className="flex items-center justify-between px-4 py-2 hover:bg-primary-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                        >
                          <button
                            onClick={() => {
                              handleGenerateWeek(week.week, week.dates);
                              setShowWeekDropdown(false);
                            }}
                            className="flex-1 text-left text-sm"
                          >
                            {weekLabel} <span className="text-xs text-slate-500">({week.dates.length} days)</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {unembeddedEvents.length > 0 && (
                <div className="relative flex-1 sm:flex-initial" data-tour="embed-events">
                  <Button
                    onClick={() => setShowEmbedDropdown(!showEmbedDropdown)}
                    disabled={isEmbedding}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto text-xs sm:text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-200"
                  >
                    <span className="font-semibold">📌 {unembeddedEvents.length}</span>
                    <span className="hidden sm:inline">Embed Events</span>
                    <span className="sm:hidden">Embed</span>
                    <ChevronDown size={12} className={`sm:w-3.5 sm:h-3.5 transition-transform ${showEmbedDropdown ? 'rotate-180' : ''}`} />
                  </Button>

                  {showEmbedDropdown && (
                    <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                      {getWeekDates().map((week) => {
                        const unembeddedCount = unembeddedByWeek[week.week] || 0;
                        if (unembeddedCount === 0) return null;

                        const [year, month] = selectedMonth.split('-').map(Number);
                        const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' });
                        const weekLabel = `Week ${week.week} (${monthName} ${week.startDay}-${week.endDay})`;

                        return (
                          <div
                            key={week.week}
                            className="flex items-center justify-between px-4 py-2 hover:bg-orange-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                          >
                            <button
                              onClick={() => {
                                handleEmbedEvents(week.week);
                                setShowEmbedDropdown(false);
                              }}
                              className="flex-1 text-left text-sm"
                            >
                              {weekLabel}
                            </button>
                            <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                              📌 {unembeddedCount}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div data-tour="generate-month">
                <Button
                  onClick={handleGenerateFullMonth}
                  disabled={isGenerating}
                  size="sm"
                  className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white flex-1 sm:flex-initial text-xs sm:text-sm"
                >
                  <Wand2 size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Generate Full Month</span>
                  <span className="sm:hidden">Full Month</span>
                </Button>
              </div>

              <Button
                onClick={handleExportCalendar}
                disabled={!currentCalendar || currentCalendar.items.length === 0}
                size="sm"
                variant="outline"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm border-primary-300 hover:bg-primary-50"
                title="Export calendar to formatted text file"
              >
                <Download size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Export Calendar</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Andora will skip perfect briefs and regenerate the rest. Each day is a story scene with character-driven narrative.
          </p>
        </div>
      )}

      {/* Month Navigation */}
      <div className="glass-effect rounded-xl p-3 sm:p-4 border border-primary-500/20">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            <ChevronLeft size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>

          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-dark-900 text-center">{monthName}</h2>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight size={14} className="sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        data-tour="calendar-grid"
        className={`transition-all duration-300 ${modalOpen ? 'lg:pr-96' : ''}`}
      >
        <CalendarGrid
          month={selectedMonth}
          calendar={currentCalendar}
          events={monthEvents}
          brand={brand}
          onContentClick={handleContentClick}
          onGenerateDate={handleGenerateDate}
          canEdit={canEdit}
          isGenerating={isGenerating}
          generatingDate={generatingDate}
          glowingItems={glowingItems}
        />
      </div>

      {/* Desktop Sidebar - Fixed overlay, hidden on mobile */}
      <div className="hidden lg:block">
        <ContentSidebar
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedContent(null);
          }}
          content={selectedContent}
          allContentForDay={selectedContent ? currentCalendar?.items.filter(item => item.date === selectedContent.date) : []}
          allContent={currentCalendar?.items || []}
          brand={brand}
          onContentUpdate={handleContentUpdate}
          onRegenerate={handleContentRegenerate}
          preferredModel={selectedModel}
          canEdit={canEdit}
          events={monthEvents}
          monthTheme={brand.monthly_themes[selectedMonth] as string}
          weekFocus={selectedContent ? getGenerationContext(selectedContent.date).weekFocus : undefined}
          showNotification={showNotification}
          hideNotification={hideNotification}
        />
      </div>

      {/* Content Modal for mobile */}
      <div className="lg:hidden">
        <ContentModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedContent(null);
          }}
          content={selectedContent}
          allContentForDay={selectedContent ? currentCalendar?.items.filter(item => item.date === selectedContent.date) : []}
          allContent={currentCalendar?.items || []}
          brand={brand}
          onContentUpdate={handleContentUpdate}
          onRegenerate={handleContentRegenerate}
          preferredModel={selectedModel}
          canEdit={canEdit}
          events={monthEvents}
          monthTheme={brand.monthly_themes[selectedMonth] as string}
          weekFocus={selectedContent ? getGenerationContext(selectedContent.date).weekFocus : undefined}
          showNotification={showNotification}
          hideNotification={hideNotification}
        />
      </div>

      {/* Embed Confirmation Dialog */}
      {showEmbedConfirm && embedWeekNum !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Week {embedWeekNum} is Perfect
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              This week's subplot is marked as perfect. Embedding new events will update it and mark it as imperfect.
              Do you want to proceed anyway?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEmbedConfirm(false);
                  setEmbedWeekNum(null);
                  setIsEmbedding(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (embedWeekNum !== null) {
                    handleEmbedEvents(embedWeekNum, true);
                  }
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Reflow Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
