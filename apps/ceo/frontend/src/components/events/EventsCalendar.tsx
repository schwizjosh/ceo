import React, { useMemo, useState } from 'react';
import { Event } from '../../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, BarChart3 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { apiClient } from '../../lib/api';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface EventsCalendarProps {
  events: Event[];
  onDateClick: (date: string) => void;
  onEventClick: (event: Event) => void;
  brandId?: string;
  onSubplotSuggestionsReady?: (suggestions: any[]) => void;
}

// Color palette for events (high contrast with dark text)
const EVENT_COLORS = [
  { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-900', hover: 'hover:bg-blue-500/30' },
  { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-900', hover: 'hover:bg-purple-500/30' },
  { bg: 'bg-pink-500/20', border: 'border-pink-500/30', text: 'text-pink-900', hover: 'hover:bg-pink-500/30' },
  { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-900', hover: 'hover:bg-green-500/30' },
  { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-900', hover: 'hover:bg-yellow-500/30' },
  { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-900', hover: 'hover:bg-orange-500/30' },
  { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-900', hover: 'hover:bg-red-500/30' },
  { bg: 'bg-teal-500/20', border: 'border-teal-500/30', text: 'text-teal-900', hover: 'hover:bg-teal-500/30' },
  { bg: 'bg-indigo-500/20', border: 'border-indigo-500/30', text: 'text-indigo-900', hover: 'hover:bg-indigo-500/30' },
  { bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-900', hover: 'hover:bg-cyan-500/30' },
];

// Hash function to consistently assign colors based on event_id
const getEventColor = (eventId: string) => {
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    hash = ((hash << 5) - hash) + eventId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
};

export const EventsCalendar: React.FC<EventsCalendarProps> = ({
  events,
  onDateClick,
  onEventClick,
  brandId,
  onSubplotSuggestionsReady
}) => {
  console.log('📅 EventsCalendar rendered with events:', events);
  console.log('📊 Total events count:', events.length);
  console.log('📅 Event dates:', events.map(e => ({ title: e.title, date: e.event_date, dateType: typeof e.event_date })));

  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAllEventsModal, setShowAllEventsModal] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState<{ date: string; events: Event[] } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSubplotModal, setShowSubplotModal] = useState(false);
  const [subplotSuggestions, setSubplotSuggestions] = useState<any[]>([]);
  const [view, setView] = useState<'calendar' | 'daily'>('calendar');
  const [showMonthPicker, setShowMonthPicker] = useState(false);


  // Use UTC to avoid timezone issues
  const monthStart = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1));
  const monthEnd = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
  const calendarStart = new Date(monthStart);
  calendarStart.setUTCDate(calendarStart.getUTCDate() - monthStart.getUTCDay());

  const calendarEnd = new Date(monthEnd);
  calendarEnd.setUTCDate(calendarEnd.getUTCDate() + (6 - monthEnd.getUTCDay()));

  const days = [];
  const currentDay = new Date(calendarStart);

  while (currentDay <= calendarEnd) {
    days.push(new Date(currentDay));
    currentDay.setUTCDate(currentDay.getUTCDate() + 1);
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + (direction === 'next' ? 1 : -1), 1)));
  };

  const handleRefreshEvents = async () => {
    if (!brandId) {
      alert('Brand ID is required to refresh events');
      return;
    }

    setIsRefreshing(true);
    try {
      const response = await apiClient.post('/events/refresh', {
        brandId,
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
      });

      const { subplotSuggestions: suggestions } = response;

      if (suggestions && suggestions.length > 0) {
        setSubplotSuggestions(suggestions);
        setShowSubplotModal(true);

        // Notify parent component
        if (onSubplotSuggestionsReady) {
          onSubplotSuggestionsReady(suggestions);
        }
      } else {
        alert('Event calendar refreshed! No subplot suggestions generated.');
      }
    } catch (error) {
      console.error('Error refreshing events:', error);
      alert('Failed to refresh event calendar');
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDateToLocal = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getEventsForDate = (date: Date) => {
    const dateString = formatDateToLocal(date);
    const matchingEvents = events.filter(event => {
      // Extract date portion from ISO datetime string (e.g., "2025-10-30T23:00:00.000Z" → "2025-10-30")
      const eventDateOnly = event.event_date ? event.event_date.split('T')[0] : '';
      const matches = eventDateOnly === dateString;

      if (event.event_date && event.event_date.includes(dateString.split('-')[1])) {
        console.log(`🔍 Checking ${event.title}: event.event_date="${event.event_date}" → extracted="${eventDateOnly}" vs dateString="${dateString}" → ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
      }
      return matches;
    });
    if (matchingEvents.length > 0) {
      console.log(`📆 Found ${matchingEvents.length} event(s) for ${dateString}:`, matchingEvents);
    }
    return matchingEvents;
  };

  const isCurrentMonth = (date: Date) => {
    return date.getUTCMonth() === currentDate.getMonth();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    return formatDateToLocal(date) === formatDateToLocal(todayUTC);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate insights for current month
  const monthInsights = useMemo(() => {
    const monthKey = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const monthEvents = events.filter(event => event.event_date?.startsWith(monthKey));

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const upcomingEvents = events
      .filter(event => (event.event_date || '').split('T')[0] >= todayString)
      .sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''));

    return {
      totalThisMonth: monthEvents.length,
      upcomingCount: upcomingEvents.length,
      nextEvent: upcomingEvents[0],
      colorDistribution: EVENT_COLORS.map((color, idx) => ({
        color,
        count: events.filter(e => Math.abs(getEventColor(e.event_id) === color ? 1 : 0)).length
      }))
    };
  }, [events, currentDate]);

  // Get sorted events for daily view
  const sortedMonthEvents = useMemo(() => {
    const monthKey = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}`;
    return events
      .filter(event => event.event_date?.startsWith(monthKey))
      .sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''));
  }, [events, currentDate]);

  return (
    <div className="flex gap-4">
      {/* Main calendar area */}
      <div className="flex-1 glass-effect rounded-xl border border-primary-200/40 p-3 sm:p-4 md:p-6">
        {/* Header with navigation and view switcher */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-primary-900 transition hover:border-primary-300"
              >
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </button>

              {showMonthPicker && (
                <div className="absolute top-full left-0 mt-2 z-10 rounded-lg border border-slate-200 bg-white shadow-lg p-3 w-64">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {monthNames.map((month, idx) => (
                      <button
                        key={month}
                        onClick={() => {
                          setCurrentDate(new Date(Date.UTC(currentDate.getFullYear(), idx, 1)));
                          setShowMonthPicker(false);
                        }}
                        className={cn(
                          'px-2 py-1 text-xs rounded transition',
                          idx === currentDate.getMonth()
                            ? 'bg-primary-500 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        )}
                      >
                        {month.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => setCurrentDate(new Date(Date.UTC(currentDate.getFullYear() - 1, currentDate.getMonth(), 1)))}
                      className="px-3 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200"
                    >
                      {currentDate.getFullYear() - 1}
                    </button>
                    <span className="text-sm font-semibold">{currentDate.getFullYear()}</span>
                    <button
                      onClick={() => setCurrentDate(new Date(Date.UTC(currentDate.getFullYear() + 1, currentDate.getMonth(), 1)))}
                      className="px-3 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200"
                    >
                      {currentDate.getFullYear() + 1}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => navigateMonth('next')}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            <button
              onClick={() => setView('calendar')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition',
                view === 'calendar'
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <CalendarIcon size={16} />
              <span className="hidden sm:inline">Calendar</span>
            </button>
            <button
              onClick={() => setView('daily')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition',
                view === 'daily'
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <List size={16} />
              <span className="hidden sm:inline">Daily</span>
            </button>
          </div>
        </div>

        {/* Calendar View */}
        {view === 'calendar' && (
          <>
            {/* Day names */}
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
              {dayNames.map((day) => (
                <div key={day} className="py-2">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.slice(0, 1)}</span>
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const dateString = formatDateToLocal(day);

            return (
              <div
                key={index}
                className={cn(
                  'group relative min-h-[70px] sm:min-h-[90px] rounded-lg sm:rounded-2xl border border-transparent bg-white/70 p-1 sm:p-2 shadow-sm transition-all duration-200',
                  'hover:border-primary-400/40 hover:shadow-lg hover:shadow-primary-500/10',
                  !isCurrentMonth(day) && 'bg-slate-50 text-slate-400',
                  isToday(day) && 'border-primary-500/40 bg-primary-500/10 shadow-primary-500/20'
                )}
                onClick={() => onDateClick(dateString)}
              >
              <div className="flex items-start justify-between">
                <div className={cn(
                  'flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-full text-[10px] sm:text-xs font-semibold transition',
                  isToday(day) ? 'bg-primary-500 text-white shadow-primary-500/40 shadow-lg' : 'text-slate-500'
                )}>
                  {day.getUTCDate()}
                </div>
                {dayEvents.length > 0 && (
                  <span className="rounded-full bg-primary-500/10 px-1 sm:px-2 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-medium text-primary-600">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              <div className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
                {dayEvents.slice(0, 2).map((event) => {
                  const color = getEventColor(event.event_id);
                  return (
                    <div
                      key={event.event_id}
                      className={cn(
                        'rounded-md sm:rounded-xl border px-1 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-xs font-medium transition',
                        'truncate bg-white/70',
                        color.bg,
                        color.border,
                        color.text,
                        color.hover
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  );
                })}
                {dayEvents.length > 2 && (
                  <button
                    type="button"
                    className="w-full rounded-md sm:rounded-xl bg-primary-500/10 px-1 sm:px-2 py-0.5 sm:py-1 text-[8px] sm:text-[11px] font-semibold text-primary-600 transition hover:bg-primary-500/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDateEvents({ date: dateString, events: dayEvents });
                      setShowAllEventsModal(true);
                    }}
                  >
                    +{dayEvents.length - 2}
                  </button>
                )}
              </div>
            </div>
          );
        })}
            </div>
          </>
        )}

        {/* Daily View */}
        {view === 'daily' && (
          <div className="space-y-3">
            {sortedMonthEvents.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <p>No events this month</p>
                <p className="text-sm mt-1">Click any date above to add an entry</p>
              </div>
            ) : (
              sortedMonthEvents.map((event) => {
                const color = getEventColor(event.event_id);
                const eventDate = event.event_date ? new Date(event.event_date.split('T')[0] + 'T12:00:00Z') : null;

                return (
                  <div
                    key={event.event_id}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white/80 p-4 transition hover:border-primary-300 hover:shadow-sm cursor-pointer"
                    onClick={() => onEventClick(event)}
                  >
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="text-2xl font-bold text-primary-900">
                        {eventDate?.getUTCDate()}
                      </div>
                      <div className="text-xs text-slate-500 uppercase">
                        {eventDate?.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn('w-2 h-2 rounded-full', color.bg.replace('/20', ''))}></div>
                        <h3 className={cn('font-semibold text-sm', color.text)}>{event.title}</h3>
                      </div>
                      {event.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Floating Insights Sidebar */}
      <div className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={18} className="text-primary-500" />
              <h3 className="font-semibold text-sm">Month Insights</h3>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs text-slate-500">Events this month</div>
                <div className="text-2xl font-bold text-primary-900">{monthInsights.totalThisMonth}</div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Upcoming events</div>
                <div className="text-lg font-semibold text-emerald-700">{monthInsights.upcomingCount}</div>
              </div>

              {monthInsights.nextEvent && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Next up</div>
                  <div className="text-sm font-medium text-slate-700 line-clamp-2">
                    {monthInsights.nextEvent.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {new Date(monthInsights.nextEvent.event_date || '').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'UTC'
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs text-slate-500 mb-2">Event colors</div>
                <div className="flex flex-wrap gap-1">
                  {EVENT_COLORS.map((color, idx) => (
                    <div
                      key={idx}
                      className={cn('w-6 h-6 rounded-full', color.bg.replace('/20', ''))}
                      title={`Color ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAllEventsModal && selectedDateEvents && (
        <Modal
          isOpen={showAllEventsModal}
          onClose={() => setShowAllEventsModal(false)}
          title={`Events on ${new Date(selectedDateEvents.date + 'T12:00:00Z').toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC'
          })}`}
          size="md"
        >
          <div className="space-y-2">
            {selectedDateEvents.events.map((event) => {
              const color = getEventColor(event.event_id);
              return (
                <button
                  key={event.event_id}
                  onClick={() => {
                    setShowAllEventsModal(false);
                    onEventClick(event);
                  }}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left text-sm transition',
                    color.bg,
                    color.border,
                    color.hover
                  )}
                >
                  <div className={cn('font-medium', color.text)}>{event.title}</div>
                  {event.description && (
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">{event.description}</p>
                  )}
                </button>
              );
            })}
          </div>

          <Button
            className="mt-4 w-full"
            size="sm"
            onClick={() => {
              setShowAllEventsModal(false);
              onDateClick(selectedDateEvents.date);
            }}
          >
            Add Entry
          </Button>
        </Modal>
      )}
    </div>
  );
};