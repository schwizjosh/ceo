import React from 'react';
import { Brand, Event, ContentCalendar, ContentItem } from '../../types';
import { Calendar, Sparkles, Star, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface CalendarGridProps {
  month: string;
  calendar?: ContentCalendar;
  events: Event[];
  brand: Brand;
  onContentClick: (item: ContentItem) => void;
  onGenerateDate: (date: string) => void;
  canEdit: boolean;
  isGenerating?: boolean;
  generatingDate?: string | null;
  glowingItems?: Set<string>;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Channel color mapping
const CHANNEL_COLORS: Record<string, { bg: string; text: string; border: string; hover: string }> = {
  'LinkedIn': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300/60', hover: 'hover:bg-blue-200' },
  'Instagram': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300/60', hover: 'hover:bg-pink-200' },
  'X': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300/60', hover: 'hover:bg-cyan-200' },
  'Facebook': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300/60', hover: 'hover:bg-indigo-200' },
  'TikTok': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300/60', hover: 'hover:bg-purple-200' },
  'YouTube': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300/60', hover: 'hover:bg-red-200' },
  'Blog': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300/60', hover: 'hover:bg-green-200' },
  'Email': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300/60', hover: 'hover:bg-amber-200' },
};

const getChannelColor = (channel: string) => {
  return CHANNEL_COLORS[channel] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300/60',
    hover: 'hover:bg-slate-200'
  };
};

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  month,
  calendar,
  events,
  brand,
  onContentClick,
  onGenerateDate,
  canEdit,
  isGenerating = false,
  glowingItems = new Set(),
  generatingDate = null
}) => {
  // Parse month
  const [year, monthNum] = month.split('-').map(Number);
  const firstDay = new Date(year, monthNum - 1, 1);
  const lastDay = new Date(year, monthNum, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  // Create calendar days
  const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ date: '', day: 0, isCurrentMonth: false });
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push({ date, day, isCurrentMonth: true });
  }

  // Get content for a specific date
  const getContentForDate = (date: string): ContentItem[] => {
    if (!calendar) return [];
    return calendar.items.filter(item => item.date === date);
  };

  // Get events for a specific date
  const getEventsForDate = (date: string): Event[] => {
    return events.filter(event => event.event_date === date);
  };

  // Check if date is today
  const isToday = (date: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return date === today;
  };

  return (
    <div className="glass-effect rounded-xl border border-primary-500/20 overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 bg-primary-500/5 border-b border-primary-500/20">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="p-1.5 sm:p-2 md:p-3 text-center text-[10px] sm:text-xs md:text-sm font-semibold text-primary-600"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.slice(0, 1)}</span>
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 divide-x divide-y divide-primary-500/10">
        {days.map((dayInfo, index) => {
          if (!dayInfo.isCurrentMonth) {
            return <div key={index} className="h-32 bg-slate-50" />;
          }

          const content = getContentForDate(dayInfo.date);
          const dayEvents = getEventsForDate(dayInfo.date);
          const today = isToday(dayInfo.date);

          return (
            <div
              key={index}
              className={cn(
                'min-h-[80px] sm:min-h-[100px] md:h-32 p-1 sm:p-1.5 md:p-2 flex flex-col bg-white hover:bg-primary-50/30 transition-colors',
                today && 'bg-primary-100/20 ring-2 ring-primary-400/40 ring-inset'
              )}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                <span
                  className={cn(
                    'text-xs sm:text-sm font-semibold',
                    today ? 'text-primary-600' : 'text-slate-600'
                  )}
                >
                  {dayInfo.day}
                </span>
                {content.length === 0 && canEdit && (
                  <button
                    onClick={() => onGenerateDate(dayInfo.date)}
                    disabled={isGenerating}
                    className={cn(
                      'p-0.5 sm:p-1 rounded transition-colors',
                      isGenerating && generatingDate === dayInfo.date
                        ? 'text-blue-600 bg-blue-50'
                        : 'hover:bg-primary-500/10 text-primary-500',
                      isGenerating && 'cursor-not-allowed opacity-50'
                    )}
                    title="Generate content"
                  >
                    {isGenerating && generatingDate === dayInfo.date ? (
                      <Loader2 size={12} className="animate-spin sm:w-3.5 sm:h-3.5" />
                    ) : (
                      <Sparkles size={12} className="sm:w-3.5 sm:h-3.5" />
                    )}
                  </button>
                )}
              </div>

              {/* Events */}
              {dayEvents.length > 0 && (
                <div className="mb-0.5 sm:mb-1">
                  {dayEvents.slice(0, 1).map(event => (
                    <div
                      key={event.event_id}
                      className="text-[9px] sm:text-xs px-1 sm:px-2 py-0.5 bg-amber-100 text-amber-700 rounded truncate border border-amber-300/40"
                      title={event.title}
                    >
                      <span className="hidden sm:inline">📅 </span>{event.title}
                    </div>
                  ))}
                  {dayEvents.length > 1 && (
                    <div className="text-[8px] sm:text-xs text-slate-500 mt-0.5 px-1">
                      +{dayEvents.length - 1}
                    </div>
                  )}
                </div>
              )}

              {/* Content items */}
              <div className="flex-1 space-y-0.5 sm:space-y-1 overflow-y-auto">
                {content.slice(0, 3).map(item => {
                  const channelColor = getChannelColor(item.channel);
                  const isGlowing = glowingItems.has(`${item.date}-${item.channel}`);
                  return (
                    <button
                      key={item.id}
                      onClick={() => onContentClick(item)}
                      className={cn(
                        'w-full text-left text-[9px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded border transition-all relative',
                        item.is_perfect
                          ? 'bg-green-100 border-green-400/60 text-green-700 hover:bg-green-200 ring-1 ring-green-400/40'
                          : `${channelColor.bg} ${channelColor.border} ${channelColor.text} ${channelColor.hover}`,
                        isGlowing && 'animate-magical-glow'
                      )}
                    >
                      <div className="flex items-center gap-0.5 sm:gap-1 truncate">
                        {item.is_perfect && <Star size={8} className="fill-current flex-shrink-0 sm:w-2.5 sm:h-2.5" />}
                        <span className="truncate font-medium">
                          {item.channel}
                          {item.character_focus && <span className="text-[8px] sm:text-[10px] opacity-70"> ({item.character_focus})</span>}
                        </span>
                        {isGlowing && <Sparkles size={8} className="text-primary-500 animate-pulse flex-shrink-0 sm:w-2.5 sm:h-2.5" />}
                      </div>
                    </button>
                  );
                })}
                {content.length > 3 && (
                  <button
                    onClick={() => onContentClick(content[3])}
                    className="text-[9px] sm:text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-1 sm:px-2 py-0.5 sm:py-1 rounded transition-colors w-full text-left font-medium"
                  >
                    +{content.length - 3}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
