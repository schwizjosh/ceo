import React, { useState, useEffect } from 'react';
import { Event } from '../../types';
import { Modal } from '../common/Modal';
import { Textarea } from '../common/Textarea';
import { Button } from '../common/Button';
import { Save, Trash2, Calendar } from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null;
  event: Event | null;
  brandId: string;
  userId: string;
  onSave: (event: Omit<Event, 'event_id'>) => void;
  onDelete: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  event,
  brandId,
  userId,
  onSave,
  onDelete
}) => {
  const [formData, setFormData] = useState({
    description: '',
  });

  useEffect(() => {
    if (event) {
      setFormData({
        description: event.description,
      });
    } else if (selectedDate) {
      setFormData({
        description: '',
      });
    }
  }, [event, selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📋 EventModal handleSubmit called');
    console.log('📝 Form data:', formData);
    console.log('📅 Selected date:', selectedDate);
    console.log('🏢 Brand ID:', brandId);
    console.log('👤 User ID:', userId);

    if (formData.description.trim() && selectedDate) {
      const eventToSave = {
        ...formData,
        title: formData.description.split('\n')[0] || 'Event',
        event_date: selectedDate,
        brand_id: brandId,
        user_id: userId
      };
      console.log('✅ Calling onSave with:', eventToSave);
      onSave(eventToSave);
    } else {
      console.warn('⚠️ Cannot save - missing description or date');
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return 'Select a date';

    // Extract date-only portion if it's an ISO datetime string
    const dateOnly = dateString.split('T')[0];

    // Create date at noon UTC to avoid timezone issues
    const date = new Date(dateOnly + 'T12:00:00Z');

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return 'Invalid date';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC' // Use UTC to match the date we want
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={event ? 'Edit Entry' : 'New Entry'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Simple date display */}
        <div className="flex items-center gap-3 rounded-lg bg-primary-50/50 p-3">
          <Calendar className="h-5 w-5 text-primary-500" />
          <div>
            <p className="text-xs text-slate-500">Date</p>
            <p className="text-sm font-medium text-primary-900">
              {selectedDate ? formatDateForDisplay(selectedDate) : 'Select a date'}
            </p>
          </div>
        </div>

        {/* Simple textarea */}
        <Textarea
          label="Notes"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          onKeyDown={handleKeyDown}
          placeholder="What's happening on this day? Add notes, reminders, or important details..."
          rows={8}
          maxLength={500}
          helperText={`${formData.description.length}/500 • Press Ctrl/Cmd+Enter to save`}
          required
        />

        {/* Simple action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0 pt-2">
          {event ? (
            <Button
              type="button"
              variant="danger"
              onClick={onDelete}
              size="sm"
              className="flex items-center gap-1 sm:gap-2 justify-center text-xs sm:text-sm"
            >
              <Trash2 size={14} className="sm:w-4 sm:h-4" />
              Delete
            </Button>
          ) : (
            <div className="hidden sm:block" />
          )}

          <div className="flex items-center gap-2 order-first sm:order-none">
            <Button type="button" variant="ghost" onClick={onClose} size="sm" className="flex-1 sm:flex-initial text-xs sm:text-sm">
              Cancel
            </Button>
            <Button type="submit" className="flex items-center gap-1 sm:gap-2 justify-center flex-1 sm:flex-initial text-xs sm:text-sm" size="sm">
              <Save size={14} className="sm:w-4 sm:h-4" />
              Save
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};