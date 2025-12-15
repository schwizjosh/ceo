import React, { useState, useEffect, useMemo } from 'react';
import { Event } from '../../types';
import { Button } from '../common/Button';
import { EventModal } from '../events/EventModal';
import { EventsCalendar } from '../events/EventsCalendar';
import { EventsOnboarding } from '../onboarding/EventsOnboarding';
import { Plus, Calendar } from 'lucide-react';
import { scrollToTop } from '../../hooks/useScrollToTop';

interface EventsPageProps {
  events: Event[];
  brandId: string;
  userId: string;
  onEventAdd: (event: Omit<Event, 'event_id'>) => void;
  onEventUpdate: (eventId: string, updates: Partial<Event>) => void;
  onEventDelete: (eventId: string) => void;
}

const EVENTS_ONBOARDING_KEY = 'andora_events_onboarding_completed';

export const EventsPage: React.FC<EventsPageProps> = ({
  events,
  brandId,
  userId,
  onEventAdd,
  onEventUpdate,
  onEventDelete
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const currentMonthEvents = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    return events.filter(event => {
      if (!event.event_date) return false;
      const eventDate = new Date(event.event_date);
      return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
    }).length;
  }, [events]);

  // Check if this is user's first time on events page
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(EVENTS_ONBOARDING_KEY);
    const isFirstVisit = !hasSeenOnboarding && events.length === 0;

    if (isFirstVisit) {
      // Small delay to let page render first
      setTimeout(() => {
        setShowOnboarding(true);
      }, 300);
    }
  }, [events.length]);

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setIsModalOpen(true);
    scrollToTop(); // Scroll to top when opening modal
  };

  const handleEventClick = (event: Event) => {
    setEditingEvent(event);
    setSelectedDate(event.event_date);
    setIsModalOpen(true);
    scrollToTop(); // Scroll to top when opening modal
  };

  const handleEventSave = (eventData: Omit<Event, 'event_id'>) => {
    console.log('💾 EventsPage handleEventSave called with:', eventData);
    console.log('📝 Editing existing event?', !!editingEvent);

    if (editingEvent) {
      console.log('✏️ Updating event:', editingEvent.event_id);
      onEventUpdate(editingEvent.event_id, eventData);
    } else {
      console.log('➕ Adding new event');
      onEventAdd(eventData);
    }
    setIsModalOpen(false);
    setEditingEvent(null);
    setSelectedDate(null);
    scrollToTop(); // Scroll to top after saving
  };

  const handleEventDelete = () => {
    if (editingEvent) {
      onEventDelete(editingEvent.event_id);
      setIsModalOpen(false);
      setEditingEvent(null);
      setSelectedDate(null);
      scrollToTop(); // Scroll to top after deleting
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem(EVENTS_ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
    scrollToTop(); // Scroll to top after onboarding
  };

  console.log('🗓️ EventsPage rendered');
  console.log('📋 Events prop received:', events);
  console.log('📊 Events count:', events.length);

  return (
    <>
      {showOnboarding && <EventsOnboarding onComplete={handleOnboardingComplete} />}

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
        {/* Simple header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary-400" />
            <div>
              <h1 className="text-2xl font-bold text-primary-900 sm:text-3xl">Calendar & Journal</h1>
              <p className="mt-1 text-sm text-slate-500">
                {currentMonthEvents > 0 ? `${currentMonthEvents} events this month` : 'Track important dates and notes'}
              </p>
            </div>
          </div>

          <Button
            onClick={() => {
              setSelectedDate(new Date().toISOString().split('T')[0]);
              setEditingEvent(null);
              setIsModalOpen(true);
              scrollToTop();
            }}
            className="inline-flex items-center gap-2"
            size="sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Entry</span>
          </Button>
        </div>

        {/* Calendar takes full width */}
        <EventsCalendar
          events={events}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
          brandId={brandId}
        />

        <EventModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            scrollToTop();
          }}
          selectedDate={selectedDate}
          event={editingEvent}
          brandId={brandId}
          userId={userId}
          onSave={handleEventSave}
          onDelete={handleEventDelete}
        />
      </div>
    </>
  );
};
