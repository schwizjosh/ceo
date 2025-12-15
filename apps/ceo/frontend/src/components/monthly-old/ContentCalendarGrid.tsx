import React from 'react';
import { ContentCalendar, ContentItem } from '../../types';
import { cn } from '../../utils/cn';

interface ContentCalendarGridProps {
  calendar: ContentCalendar;
  onDaySelect: (date: string, items: ContentItem[]) => void;
  selectedDate?: string | null;
}

export const ContentCalendarGrid: React.FC<ContentCalendarGridProps> = ({
  calendar,
  onDaySelect,
  selectedDate
}) => {
  const [year, month] = calendar.month.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(calendarStart.getDate() - monthStart.getDay());

  const calendarEnd = new Date(monthEnd);
  calendarEnd.setDate(calendarEnd.getDate() + (6 - monthEnd.getDay()));

  const days = [];
  const currentDay = new Date(calendarStart);

  while (currentDay <= calendarEnd) {
    days.push(new Date(currentDay));
    currentDay.setDate(currentDay.getDate() + 1);
  }

  const getContentForDate = (date: Date) => {
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return calendar.items.filter(item => item.date === dateString);
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month - 1;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const channelColors = {
    'LinkedIn': 'bg-blue-100 text-blue-800 border-blue-200',
    'Twitter': 'bg-sky-100 text-sky-800 border-sky-200',
    'Instagram': 'bg-pink-100 text-pink-800 border-pink-200',
    'Facebook': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Blog': 'bg-gray-100 text-slate-700 border-gray-200',
    'Email': 'bg-green-100 text-green-800 border-green-200',
    'YouTube': 'bg-red-100 text-red-800 border-red-200',
    'TikTok': 'bg-purple-100 text-purple-800 border-purple-200'
  };

  return (
    <div className="glass-effect rounded-lg p-4 sm:p-6 border border-primary-500/20">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary-900">{monthName}</h2>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">{calendar.items.length} content pieces planned</p>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="p-2 sm:p-3 text-center text-xs sm:text-sm font-medium text-slate-500">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.slice(0, 1)}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const dayContent = getContentForDate(day);
          const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
          const isSelected = selectedDate === dateKey;

          return (
            <div
              key={index}
              className={cn(
                'min-h-[100px] sm:min-h-[120px] p-1 sm:p-2 border border-primary-200/40 transition-all duration-200 glass-effect hover:border-primary-400/50 cursor-pointer',
                !isCurrentMonth(day) && 'bg-white/70 text-slate-400',
                isToday(day) && 'bg-primary-500/20 border-primary-400/50 glow-border',
                dayContent.length > 0 && 'hover:bg-white/80',
                isSelected && 'ring-2 ring-primary-400/60 bg-primary-500/10'
              )}
              onClick={() => onDaySelect(dateKey, dayContent)}
            >
              <div className={cn(
                'text-sm font-medium mb-2',
                isToday(day) && 'text-primary-500',
                !isCurrentMonth(day) ? 'text-slate-400' : 'text-primary-900'
              )}>
                {day.getDate()}
              </div>

              <div className="space-y-1">
                {dayContent.map((content) => (
                  <div
                    key={content.id}
                    className={cn(
                      'text-xs p-1 sm:p-2 rounded border cursor-pointer transition-all duration-200 hover:shadow-sm glass-effect',
                      getChannelColors(content.channel),
                      content.is_perfect && 'ring-2 ring-green-400/50 glow-border'
                    )}
                    title={content.title}
                  >
                    <div className="font-medium truncate text-primary-800 text-xs">{content.channel}</div>
                    <div className="truncate opacity-80 text-slate-600">{content.title}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
function getChannelColors(channel: string) {
  const colors = {
    'LinkedIn': 'bg-blue-500/20 text-blue-700 border-blue-400/40',
    'Instagram': 'bg-pink-500/20 text-pink-700 border-pink-400/40',
    'Twitter': 'bg-cyan-500/20 text-cyan-700 border-cyan-400/40',
    'Facebook': 'bg-indigo-500/20 text-indigo-700 border-indigo-400/40',
    'TikTok': 'bg-purple-500/20 text-purple-700 border-purple-400/40',
    'YouTube': 'bg-red-500/20 text-red-700 border-red-400/40',
    'Blog': 'bg-slate-500/20 text-slate-700 border-slate-400/40',
    'Email': 'bg-green-500/20 text-green-700 border-green-400/40'
  };
  return colors[channel as keyof typeof colors] || 'bg-slate-500/20 text-slate-700 border-slate-400/40';
}