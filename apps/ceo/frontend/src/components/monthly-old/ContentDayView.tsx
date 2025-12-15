import React, { useEffect, useMemo, useState } from 'react';
import { ContentItem } from '../../types';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';
import { X, Star, Sparkles } from 'lucide-react';

interface ContentDayViewProps {
  date: string;
  items: ContentItem[];
  onClose: () => void;
  onMarkPerfect: (itemId: string, perfect: boolean) => void;
  onRefine: (item: ContentItem) => void;
  canEdit?: boolean;
}

interface ContentBriefCardProps {
  item: ContentItem;
  onMarkPerfect: (itemId: string, perfect: boolean) => void;
  onRefine: (item: ContentItem) => void;
  canEdit: boolean;
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'Invalid date';

  // Extract date-only portion if it's an ISO datetime string
  const dateOnly = dateString.split('T')[0];

  // Create date at noon UTC to avoid timezone issues
  const date = new Date(dateOnly + 'T12:00:00Z');

  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date:', dateString);
    return dateString;
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
};

const ContentBriefCard: React.FC<ContentBriefCardProps> = ({ item, onMarkPerfect, onRefine, canEdit }) => {
  const emotionalAngles = item.emotional_angles && item.emotional_angles.length
    ? item.emotional_angles
    : ['Inspire', 'Educate'];
  const contentType = item.content_type || 'Video: Story-led narrative';
  const keyTheme = item.key_theme || item.title;
  const directives = item.directives || item.brief || 'Outline the talking points and call-to-action.';

  return (
    <div className={cn(
      'glass-effect border rounded-lg p-4 space-y-3 transition-all duration-200',
      item.is_perfect ? 'border-green-400/60 bg-green-500/10' : 'border-primary-200/40 hover:border-primary-400/60'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-primary-100">{item.title}</h3>
          <p className="text-xs text-slate-400">Channel: {item.channel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => canEdit && onRefine(item)}
            className="text-xs flex items-center"
            disabled={!canEdit}
          >
            <Sparkles size={14} className="mr-1" /> Refine
          </Button>
          <Button
            size="sm"
            variant={item.is_perfect ? 'default' : 'outline'}
            onClick={() => canEdit && onMarkPerfect(item.id, !item.is_perfect)}
            className="text-xs flex items-center"
            disabled={!canEdit}
          >
            <Star size={14} className={item.is_perfect ? 'mr-1 fill-current' : 'mr-1'} />
            {item.is_perfect ? 'Perfect' : 'Mark Perfect'}
          </Button>
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-200">
        <div>
          <p className="text-xs uppercase tracking-wide text-primary-300">Key Theme</p>
          <p>{keyTheme}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-primary-300">Emotional Angles</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {emotionalAngles.map(angle => (
              <span key={angle} className="px-2 py-1 rounded-full bg-primary-500/20 text-xs text-primary-100 border border-primary-400/40">
                {angle}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-primary-300">Content Type</p>
          <p>{contentType}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-primary-300">Directives</p>
          <p className="whitespace-pre-wrap leading-relaxed">{directives}</p>
        </div>
      </div>
    </div>
  );
};

export const ContentDayView: React.FC<ContentDayViewProps> = ({
  date,
  items,
  onClose,
  onMarkPerfect,
  onRefine,
  canEdit = true
}) => {
  const formattedDate = formatDate(date);
  const channels = useMemo(() => {
    const unique = Array.from(new Set(items.map(item => item.channel)));
    return unique.length ? unique : ['Overview'];
  }, [items]);
  const [activeChannel, setActiveChannel] = useState(channels[0]);

  useEffect(() => {
    setActiveChannel(channels[0]);
  }, [channels]);

  const filteredItems = useMemo(() => {
    if (!items.length) return [];
    if (!channels.includes(activeChannel)) {
      return items;
    }
    return items.filter(item => item.channel === activeChannel);
  }, [items, activeChannel, channels]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-lg flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-primary-500/20 bg-slate-950/60">
        <div>
          <p className="text-xs text-primary-200 uppercase tracking-wide">Content Briefs for</p>
          <h2 className="text-xl font-semibold text-white">{formattedDate}</h2>
          {!canEdit && (
            <p className="text-xs text-slate-400 mt-1">View-only access. Ask an owner to grant edit rights for this section.</p>
          )}
        </div>
        <Button variant="ghost" onClick={onClose} className="text-white">
          <X size={18} className="mr-2" /> Close
        </Button>
      </div>

      <div className="px-6 py-4 flex flex-wrap gap-2 border-b border-primary-500/10 bg-slate-950/40">
        {channels.map(channel => (
          <button
            key={channel}
            onClick={() => setActiveChannel(channel)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-all',
              activeChannel === channel
                ? 'bg-primary-500/20 border-primary-400 text-primary-100'
                : 'border-primary-200/40 text-slate-300 hover:border-primary-300'
            )}
          >
            {channel}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/30">
        {filteredItems.length ? (
          filteredItems.map(item => (
            <ContentBriefCard
              key={item.id}
              item={item}
              onMarkPerfect={onMarkPerfect}
              onRefine={onRefine}
              canEdit={canEdit}
            />
          ))
        ) : (
          <div className="glass-effect border border-primary-500/30 rounded-lg p-8 text-center text-slate-300">
            No content scheduled for this channel yet.
          </div>
        )}
      </div>
    </div>
  );
};
