import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { DAYS_OF_WEEK } from '../../utils/constants';

interface PostingScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  frequency: number;
  days: string[];
  onSave: (frequency: number, days: string[]) => void;
}

const dayLabel = (value: string) => {
  const day = DAYS_OF_WEEK.find(d => d.value === value);
  return day ? day.label : value;
};

export const PostingScheduleModal: React.FC<PostingScheduleModalProps> = ({
  isOpen,
  onClose,
  frequency,
  days,
  onSave
}) => {
  const [localFrequency, setLocalFrequency] = useState(frequency);
  const [localDays, setLocalDays] = useState<string[]>(days);

  useEffect(() => {
    setLocalFrequency(frequency);
  }, [frequency]);

  useEffect(() => {
    setLocalDays(days);
  }, [days]);

  const toggleDay = (value: string) => {
    setLocalDays(prev => prev.includes(value) ? prev.filter(day => day !== value) : [...prev, value]);
  };

  const handleSubmit = () => {
    onSave(localFrequency, localDays);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Posting Schedule">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-2">Posts per week</label>
          <input
            type="number"
            min={1}
            max={14}
            value={localFrequency}
            onChange={(e) => setLocalFrequency(Math.max(1, Math.min(14, parseInt(e.target.value) || 1)))}
            className="w-full glass-effect rounded-md px-3 py-2 border border-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <p className="text-xs text-slate-400 mt-1">Set how many pieces you aim to publish each week.</p>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-500 mb-3">Preferred posting days</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DAYS_OF_WEEK.map(day => (
              <button
                key={day.value}
                onClick={() => toggleDay(day.value)}
                className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                  localDays.includes(day.value)
                    ? 'bg-primary-500/20 border-primary-400 text-primary-100'
                    : 'glass-effect border-primary-200 text-slate-500 hover:border-primary-300'
                }`}
              >
                {dayLabel(day.value)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Schedule</Button>
        </div>
      </div>
    </Modal>
  );
};
