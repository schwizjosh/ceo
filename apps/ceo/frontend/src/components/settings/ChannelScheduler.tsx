import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Brand } from '../../types';
import { debounce } from '../../utils/debounce';
import { Check, Sparkles } from 'lucide-react';

interface ChannelSchedulerProps {
  brand: Brand;
  onUpdate: (channelSchedule: Record<string, string[]>) => void;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

const CHANNEL_COLORS: Record<string, string> = {
  'LinkedIn': 'bg-blue-500 hover:bg-blue-600',
  'Instagram': 'bg-pink-500 hover:bg-pink-600',
  'X': 'bg-cyan-500 hover:bg-cyan-600',
  'Facebook': 'bg-indigo-500 hover:bg-indigo-600',
  'TikTok': 'bg-purple-500 hover:bg-purple-600',
  'YouTube': 'bg-red-500 hover:bg-red-600',
  'Blog': 'bg-slate-500 hover:bg-slate-600',
  'Email': 'bg-green-500 hover:bg-green-600',
};

export const ChannelScheduler: React.FC<ChannelSchedulerProps> = ({ brand, onUpdate }) => {
  const [schedule, setSchedule] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    // Initialize schedule from brand or create empty schedule
    console.log('📅 ChannelScheduler: Initializing with schedule:', brand.channel_schedule);
    setSchedule(brand.channel_schedule || {});
  }, [brand.channel_schedule]);

  // Create debounced update function
  const debouncedUpdate = useRef(
    debounce((newSchedule: Record<string, string[]>) => {
      console.log('💾 ChannelScheduler: Auto-saving schedule:', newSchedule);
      onUpdate(newSchedule);
      setIsSaving(false);
    }, 1000) // Save 1 second after user stops clicking
  ).current;

  const toggleChannel = useCallback((day: string, channel: string) => {
    setSchedule(prev => {
      const dayChannels = prev[day] || [];
      const updated = dayChannels.includes(channel)
        ? dayChannels.filter(c => c !== channel)
        : [...dayChannels, channel];

      const newSchedule = { ...prev, [day]: updated };
      setIsSaving(true);
      debouncedUpdate(newSchedule);
      return newSchedule;
    });
  }, [debouncedUpdate]);

  const isChannelActive = (day: string, channel: string) => {
    return schedule[day]?.includes(channel) || false;
  };

  const getChannelColor = (channel: string) => {
    return CHANNEL_COLORS[channel] || 'bg-slate-500 hover:bg-slate-600';
  };

  const handleAISuggestSchedule = async () => {
    setIsGeneratingAI(true);

    try {
      const brandContext = {
        brandName: brand.brand_name,
        tagline: brand.taglines,
        about: brand.about,
        vision: brand.vision,
        mission: brand.mission,
        persona: brand.persona,
        buyerProfile: brand.buyer_profile,
        products: brand.products,
        channels: brand.channels,
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/ai/generate-content-strategy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ brandContext }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate suggestion');
      }

      const data = await response.json();

      if (data.success && data.strategy) {
        // Create an optimal schedule based on frequency
        const frequency = Math.min(data.strategy.frequency || 5, 7); // Default to 5 days, max 7
        const channels = data.strategy.channels || brand.channels;

        // Distribute ALL channels smartly across the week
        const optimalSchedule: Record<string, string[]> = {};

        // Use all 7 days for maximum coverage
        const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        // Strategy: Rotate channels across days based on frequency
        // If frequency = 5, each channel posts 5 days per week
        // We'll rotate through days to ensure even distribution

        channels.forEach((channel, channelIndex) => {
          // For each channel, assign it to 'frequency' number of days
          // Stagger the starting day for each channel to create variety
          const startDayOffset = channelIndex % allDays.length;

          for (let i = 0; i < frequency; i++) {
            // Calculate which day this channel posts on
            // Spread posts across the week evenly
            const daySpacing = Math.floor(7 / frequency);
            const dayIndex = (startDayOffset + (i * daySpacing)) % allDays.length;
            const day = allDays[dayIndex];

            if (!optimalSchedule[day]) {
              optimalSchedule[day] = [];
            }

            // Only add if not already assigned to this day
            if (!optimalSchedule[day].includes(channel)) {
              optimalSchedule[day].push(channel);
            }
          }
        });

        // Ensure we have good coverage - if some days are empty and we have channels, fill them
        const emptyDays = allDays.filter(day => !optimalSchedule[day] || optimalSchedule[day].length === 0);
        if (emptyDays.length > 0 && channels.length > 0) {
          emptyDays.forEach((day, index) => {
            // Assign at least one channel to empty days for better coverage
            const channel = channels[index % channels.length];
            if (!optimalSchedule[day]) {
              optimalSchedule[day] = [];
            }
            if (!optimalSchedule[day].includes(channel)) {
              optimalSchedule[day].push(channel);
            }
          });
        }

        setSchedule(optimalSchedule);
        onUpdate(optimalSchedule);
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
      alert('Failed to generate schedule suggestion. Please try again.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Channel Posting Schedule</h3>
          <p className="text-sm text-slate-600 mt-1">
            Configure which channels post on which days of the week
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="text-xs text-slate-500 flex items-center">
              <div className="w-3 h-3 border border-primary-500 border-t-transparent rounded-full animate-spin mr-2"></div>
              Saving...
            </span>
          )}
          <button
            onClick={handleAISuggestSchedule}
            disabled={isGeneratingAI || brand.channels.length === 0}
            className="flex items-center text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={14} className="mr-1" />
            {isGeneratingAI ? "I'm thinking..." : 'Ask me for a suggestion'}
          </button>
        </div>
      </div>

      {/* Channel Legend */}
      <div className="flex flex-wrap gap-2">
        {brand.channels.map(channel => (
          <span
            key={channel}
            className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium ${getChannelColor(channel)}`}
          >
            {channel}
          </span>
        ))}
      </div>

      {/* Schedule Grid */}
      <div className="glass-effect rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left p-4 text-sm font-semibold text-slate-700">Day</th>
                {brand.channels.map(channel => (
                  <th key={channel} className="text-center p-4 text-sm font-semibold text-slate-700">
                    {channel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS_OF_WEEK.map(day => (
                <tr key={day.key} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-medium text-slate-900">{day.label}</td>
                  {brand.channels.map(channel => {
                    const isActive = isChannelActive(day.key, channel);
                    return (
                      <td key={channel} className="p-4 text-center">
                        <button
                          onClick={() => toggleChannel(day.key, channel)}
                          className={`w-10 h-10 rounded-lg transition-all duration-200 flex items-center justify-center ${
                            isActive
                              ? `${getChannelColor(channel)} text-white shadow-md`
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                          }`}
                          title={`${isActive ? 'Remove' : 'Add'} ${channel} on ${day.label}`}
                        >
                          {isActive && <Check size={20} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>💡 Tip:</strong> When generating calendar content, Andora will only create posts for channels
          scheduled on each specific day. Leave days unchecked if you don't want posts on that day.
        </p>
      </div>
    </div>
  );
};
